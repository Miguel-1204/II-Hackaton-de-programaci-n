const PAGE_DEFAULT = 1
const LIMIT_DEFAULT = 25

function validateProducerBody(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la solicitud debe ser un objeto' }
  }

  const fields = ['nombre', 'identificacion', 'municipio']
  const value = {}
  for (const field of fields) {
    if (body[field] === undefined) continue
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return { error: `${field} debe ser un texto no vacío` }
    }
    const max = field === 'nombre' ? 200 : field === 'identificacion' ? 100 : 150
    if (body[field].trim().length > max) {
      return { error: `${field} supera la longitud máxima de ${max} caracteres` }
    }
    value[field] = body[field].trim()
  }
  if (!partial && fields.some((field) => value[field] === undefined)) {
    return { error: 'nombre, identificacion y municipio son obligatorios' }
  }
  if (partial && Object.keys(value).length === 0) {
    return { error: 'Debe proporcionar al menos un campo para actualizar' }
  }
  return { value }
}

function parsePositiveInteger(value, fallback, field, maximum) {
  if (value === undefined) return { value: fallback }
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0 || (maximum && number > maximum)) {
    return { error: `${field} debe ser un entero positivo${maximum ? ` no mayor que ${maximum}` : ''}` }
  }
  return { value: number }
}

function validateProducerQuery(query) {
  const page = parsePositiveInteger(query.page, PAGE_DEFAULT, 'page')
  if (page.error) return page
  const limit = parsePositiveInteger(query.limit, LIMIT_DEFAULT, 'limit', 100)
  if (limit.error) return limit

  for (const field of ['search', 'municipio']) {
    if (query[field] !== undefined && (typeof query[field] !== 'string' || query[field].length > 150)) {
      return { error: `${field} debe ser texto de hasta 150 caracteres` }
    }
  }
  if (query.includeInactive !== undefined && !['true', 'false'].includes(query.includeInactive)) {
    return { error: 'includeInactive debe ser true o false' }
  }

  return {
    value: {
      page: page.value,
      limit: limit.value,
      search: query.search?.trim() || undefined,
      municipio: query.municipio?.trim() || undefined,
      includeInactive: query.includeInactive === 'true',
    },
  }
}

module.exports = {
  validateProducerBody,
  validateProducerQuery,
}
