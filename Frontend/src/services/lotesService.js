import { supabase } from "../lib/supabase";
import {
  MODO_DEMO,
  INVENTARIO_DEMO,
  PRODUCTORES_DEMO,
  PRODUCTOS_DEMO,
} from "../lib/demo";

// De ["CAC001", "CAC003"] devuelve "CAC004"
function siguienteCodigo(codigos) {
  const max = codigos.reduce((m, c) => {
    const n = /^CAC(\d+)$/.exec(c)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `CAC${String(max + 1).padStart(3, "0")}`;
}

export async function obtenerCatalogosLote() {
  if (MODO_DEMO) {
    return { productores: PRODUCTORES_DEMO, productos: PRODUCTOS_DEMO };
  }

  const [productores, productos] = await Promise.all([
    supabase
      .from("productores")
      .select("id, nombre, municipio")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("productos").select("id, codigo, nombre").order("nombre"),
  ]);

  if (productores.error || productos.error) {
    throw new Error("No se pudieron cargar los productores y productos. Intenta de nuevo.");
  }
  return { productores: productores.data, productos: productos.data };
}

export async function sugerirCodigoLote() {
  if (MODO_DEMO) return siguienteCodigo(INVENTARIO_DEMO.map((l) => l.codigo));

  const { data, error } = await supabase.from("lotes").select("codigo");
  if (error) return ""; // si falla, el operador lo escribe a mano
  return siguienteCodigo(data.map((l) => l.codigo));
}

// Crea el lote, su movimiento ENTRADA, el historial de estados y la auditoría
// en una sola transacción (función registrar_lote en Postgres).
export async function crearLote(datos) {
  if (MODO_DEMO) {
    const codigo = datos.codigo.toUpperCase();
    if (INVENTARIO_DEMO.some((l) => l.codigo === codigo)) {
      throw new Error("Ya existe un lote con ese código. Usa otro.");
    }
    const productor = PRODUCTORES_DEMO.find((p) => p.id === datos.productor_id);
    const lote = {
      id: Math.max(0, ...INVENTARIO_DEMO.map((l) => l.id)) + 1,
      codigo,
      origen: productor?.municipio ?? "",
      recibido: datos.cantidad,
      consumido: 0,
      disponible: datos.cantidad,
      estado: "recibido",
    };
    INVENTARIO_DEMO.push(lote);
    return lote;
  }

  const { data, error } = await supabase.rpc("registrar_lote", {
    p_codigo: datos.codigo,
    p_productor_id: datos.productor_id,
    p_producto_id: datos.producto_id,
    p_fecha_recepcion: datos.fecha_recepcion,
    p_cantidad: datos.cantidad,
    p_unidad: datos.unidad,
    p_tipo_material: datos.tipo_material,
  });

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un lote con ese código. Usa otro.");
    if (error.code === "23503") throw new Error("El productor o el producto seleccionado ya no existe.");
    if (error.code === "23514") throw new Error("Revisa la cantidad y la unidad: no son válidas.");
    if (error.name === "AuthRetryableFetchError")
      throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    throw new Error("No se pudo registrar el lote. Intenta de nuevo.");
  }
  return data;
}