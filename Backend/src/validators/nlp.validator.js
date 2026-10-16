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
  if (!body || typeof body !== 'object') {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const { pregunta } = body

  if (typeof pregunta !== 'string' || pregunta.trim().length < 3) {
    return { error: 'El campo "pregunta" es obligatorio y debe tener al menos 3 caracteres' }
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
