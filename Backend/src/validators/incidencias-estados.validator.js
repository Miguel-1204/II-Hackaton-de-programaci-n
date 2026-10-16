/**
 * @fileoverview Validador de esquemas para registro de incidencias y cambios de estado con motivo obligatorio.
 */

/**
 * Valida el cuerpo para registrar una incidencia manual.
 *
 * @param {unknown} body - Cuerpo de la solicitud.
 * @returns {{ value?: {
 *   loteId: number,
 *   transformacionId?: number,
 *   tipo: string,
 *   descripcion: string,
 *   severidad: string,
 *   estado: string
 * }, error?: string }}
 */
function validateCreateIncidenciaBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const {
    loteId,
    transformacionId,
    tipo,
    descripcion,
    severidad = 'MEDIA',
    estado = 'ABIERTA',
  } = body

  const numLoteId = Number(loteId)
  if (!Number.isSafeInteger(numLoteId) || numLoteId <= 0) {
    return { error: 'El campo "loteId" es obligatorio y debe ser un ID numérico entero positivo' }
  }

  let numTransId = undefined
  if (transformacionId !== undefined && transformacionId !== null) {
    numTransId = Number(transformacionId)
    if (!Number.isSafeInteger(numTransId) || numTransId <= 0) {
      return { error: 'El campo "transformacionId" debe ser un ID numérico entero positivo' }
    }
  }

  if (typeof tipo !== 'string' || !tipo.trim()) {
    return { error: 'El campo "tipo" es obligatorio' }
  }

  if (typeof descripcion !== 'string' || !descripcion.trim()) {
    return { error: 'El campo "descripcion" es obligatorio' }
  }

  if (typeof severidad !== 'string' || !severidad.trim()) {
    return { error: 'El campo "severidad" debe ser una cadena válida (ej. BAJA, MEDIA, ALTA, CRITICA)' }
  }

  if (typeof estado !== 'string' || !estado.trim()) {
    return { error: 'El campo "estado" debe ser una cadena válida' }
  }

  return {
    value: {
      loteId: numLoteId,
      transformacionId: numTransId,
      tipo: tipo.trim().toUpperCase(),
      descripcion: descripcion.trim(),
      severidad: severidad.trim().toUpperCase(),
      estado: estado.trim().toUpperCase(),
    },
  }
}

/**
 * Valida el cuerpo para cambiar el estado de un lote (bloqueo / liberación).
 * Exige estrictamente un motivo no vacío según las reglas de auditoría de Kaotrace.
 *
 * @param {unknown} body - Cuerpo de la solicitud.
 * @returns {{ value?: { estadoNuevo: string, motivo: string }, error?: string }}
 */
function validateUpdateEstadoLoteBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const { estadoNuevo, motivo } = body

  if (typeof estadoNuevo !== 'string' || !estadoNuevo.trim()) {
    return { error: 'El campo "estadoNuevo" es obligatorio (ej. BLOQUEADO, DISPONIBLE, LIBERADO)' }
  }
  if (!['RECIBIDO', 'PENDIENTE', 'DISPONIBLE', 'LIBERADO', 'BLOQUEADO'].includes(estadoNuevo.trim().toUpperCase())) {
    return { error: 'estadoNuevo debe ser RECIBIDO, PENDIENTE, DISPONIBLE, LIBERADO o BLOQUEADO' }
  }

  if (typeof motivo !== 'string' || !motivo.trim()) {
    return { error: 'El campo "motivo" es estrictamente obligatorio para registrar el cambio de estado en el historial' }
  }

  return {
    value: {
      estadoNuevo: estadoNuevo.trim().toUpperCase(),
      motivo: motivo.trim(),
    },
  }
}

module.exports = {
  validateCreateIncidenciaBody,
  validateUpdateEstadoLoteBody,
}
