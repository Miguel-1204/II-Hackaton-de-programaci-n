import { supabase } from "../lib/supabase";
import { MODO_DEMO, INVENTARIO_DEMO, MERMAS_DEMO } from "../lib/demo";
import { aKg, calcularMerma } from "../utils/merma";

export async function obtenerLotesDisponibles() {
  if (MODO_DEMO) return INVENTARIO_DEMO.map((l) => ({ ...l }));

  const { data, error } = await supabase
    .from("v_inventario_lotes")
    .select("*")
    .order("codigo");
  if (error) throw new Error("No se pudieron cargar los lotes. Revisa tu conexión e intenta de nuevo.");
  return data;
}

export async function sugerirCodigoTransformacion() {
  let codigos;
  if (MODO_DEMO) {
    codigos = MERMAS_DEMO.map((m) => m.transformacion).filter(Boolean);
  } else {
    const { data, error } = await supabase.from("transformaciones").select("codigo");
    if (error) return "";
    codigos = data.map((t) => t.codigo);
  }
  const max = codigos.reduce((m, c) => {
    const n = /^TRF(\d+)$/.exec(c)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `TRF${String(max + 1).padStart(3, "0")}`;
}

// datos: { codigo, etapa, observaciones, clave_idempotencia,
//          entradas: [{lote_id, cantidad, unidad}], salidas: [...],
//          incidencias: [{lote_id, tipo, severidad, descripcion}] }
// Devuelve: { id, codigo, merma_pct, supera_umbral, alerta_generada, idempotente }
export async function crearTransformacion(datos) {
  if (MODO_DEMO) return crearDemo(datos);

  const { data, error } = await supabase.rpc("registrar_transformacion", { p_datos: datos });

  if (error) {
    // Mensajes escritos en español desde la función de Postgres
    if (error.code === "P0001") throw new Error(error.message);
    if (error.code === "23505") throw new Error("Ya existe una transformación con ese código. Usa otro.");
    if (error.code === "23503") throw new Error("Uno de los lotes seleccionados ya no existe.");
    if (error.name === "AuthRetryableFetchError")
      throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    throw new Error("No se pudo registrar la transformación. Intenta de nuevo.");
  }
  return data;
}

function crearDemo(datos) {
  const codigo = datos.codigo.toUpperCase();
  if (MERMAS_DEMO.some((m) => m.transformacion === codigo)) {
    throw new Error("Ya existe una transformación con ese código. Usa otro.");
  }

  const merma = calcularMerma(datos.entradas, datos.salidas);
  if (merma.estado === "SALIDA_MAYOR") {
    throw new Error("La salida no puede ser mayor que la entrada.");
  }
  if (merma.supera && !datos.observaciones?.trim()) {
    throw new Error("La merma superó el 15 %: escribe la justificación.");
  }

  for (const e of datos.entradas) {
    const lote = INVENTARIO_DEMO.find((l) => l.id === e.lote_id);
    if (!lote) throw new Error("Uno de los lotes seleccionados ya no existe.");
    if (lote.disponible < aKg(e.cantidad, e.unidad)) {
      throw new Error(`Saldo insuficiente en el lote ${lote.codigo}.`);
    }
  }

  // En demo solo se refleja el consumo de las entradas
  datos.entradas.forEach((e) => {
    const lote = INVENTARIO_DEMO.find((l) => l.id === e.lote_id);
    const kg = aKg(e.cantidad, e.unidad);
    lote.consumido += kg;
    lote.disponible -= kg;
  });

  const base = INVENTARIO_DEMO.find((l) => l.id === datos.entradas[0].lote_id);
  const id = Math.max(0, ...MERMAS_DEMO.map((m) => m.id)) + 1;
  const mermaPct = Number(merma.porcentaje.toFixed(2));

  MERMAS_DEMO.unshift({
    id,
    codigo: base.codigo,
    etapa: datos.etapa,
    fecha: new Date().toLocaleDateString("en-CA"),
    merma_pct: mermaPct,
    alerta: merma.supera,
    transformacion: codigo,
  });

  return { id, codigo, merma_pct: mermaPct, supera_umbral: merma.supera, alerta_generada: merma.supera, idempotente: false };
}