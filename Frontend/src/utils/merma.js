// Límite de merma permitido (%). Debe coincidir con la vista analitica_transformacion_merma
export const UMBRAL_MERMA = 15;

export const UNIDADES = ["kg", "g", "t"];

const FACTORES = { kg: 1, g: 0.001, t: 1000 };

// Convierte una cantidad a kilogramos. Si no es válida devuelve 0
export function aKg(cantidad, unidad = "kg") {
  const n = Number(cantidad);
  const f = FACTORES[unidad];
  return Number.isFinite(n) && n > 0 && f ? n * f : 0;
}

// estado: INCOMPLETO (faltan datos), SALIDA_MAYOR (error) o EVALUABLE
export function calcularMerma(entradas, salidas) {
  const sumar = (filas) => filas.reduce((s, f) => s + aKg(f.cantidad, f.unidad), 0);
  const entradaKg = sumar(entradas);
  const salidaKg = sumar(salidas);

  if (entradaKg <= 0 || salidaKg <= 0) {
    return { entradaKg, salidaKg, mermaKg: null, porcentaje: null, estado: "INCOMPLETO", supera: false };
  }

  const mermaKg = entradaKg - salidaKg;
  const porcentaje = (mermaKg / entradaKg) * 100;
  return {
    entradaKg,
    salidaKg,
    mermaKg,
    porcentaje,
    estado: mermaKg < 0 ? "SALIDA_MAYOR" : "EVALUABLE",
    // Estrictamente mayor al umbral; se redondea para evitar ruido de decimales
    supera: Number(porcentaje.toFixed(6)) > UMBRAL_MERMA,
  };
}