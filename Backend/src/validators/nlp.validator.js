/**
 * @fileoverview Validador de solicitudes para el intérprete de lenguaje natural.
 */

/**
 * Valida el cuerpo de la solicitud con la pregunta en lenguaje natural.
 *
 * @param {unknown} body - Cuerpo de la solicitud.
 * @returns {{ value?: { pregunta: string }, error?: string }}
 */
function validateNlpQueryBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const { pregunta } = body

  if (typeof pregunta !== 'string' || pregunta.trim().length < 3 || pregunta.trim().length > 500) {
    return { error: 'El campo "pregunta" es obligatorio y debe tener entre 3 y 500 caracteres' }
  }

  return {
    value: {
      pregunta: pregunta.trim(),
    },
  }
}

module.exports = {
  validateNlpQueryBody,
}
