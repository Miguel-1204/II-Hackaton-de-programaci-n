/**
 * @fileoverview Utilidad de conversión de unidades de masa a kilogramos (kg).
 * Réplica exacta de la función SQL 'cantidad_a_kg' para validación en capa de aplicación.
 */

/**
 * Convierte una cantidad y unidad dada a su equivalente en kilogramos (kg).
 * Soporta kg, kilogramo(s), g, gramo(s), t, ton y tonelada(s).
 *
 * @param {number|string} cantidad - Magnitud numérica a convertir.
 * @param {string} unidad - Unidad de medida (ej. 'kg', 'g', 'tonelada').
 * @returns {number|null} Cantidad normalizada en kilogramos, o null si la unidad no es comparable.
 */
function cantidadAKg(cantidad, unidad) {
  const numericQty = Number(cantidad)
  if (!Number.isFinite(numericQty) || typeof unidad !== 'string') {
    return null
  }

  const normalizedUnit = unidad.trim().toLowerCase()

  switch (normalizedUnit) {
    case 'kg':
    case 'kilogramo':
    case 'kilogramos':
      return numericQty
    case 'g':
    case 'gramo':
    case 'gramos':
      return numericQty / 1000
    case 't':
    case 'ton':
    case 'tonelada':
    case 'toneladas':
      return numericQty * 1000
    default:
      return null
  }
}

module.exports = {
  cantidadAKg,
}
