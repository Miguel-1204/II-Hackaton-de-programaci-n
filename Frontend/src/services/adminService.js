import { api } from './api'

export async function obtenerAuditoria() {
  const { eventos = [] } = await api('/auditoria')
  return eventos.map((event) => {
    const previous = event.valoresAnteriores
    const current = event.valoresNuevos
    const display = (value) => {
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }

    return {
      id: event.id,
      fecha: new Date(event.fecha).toLocaleString('es-CO'),
      usuario: event.usuario,
      entidad: `${event.entidad} ${current?.codigo || event.entidadId}`,
      operacion: event.operacion,
      valor_anterior: display(previous),
      valor_nuevo: display(current),
      motivo: current?.motivo || '',
    }
  })
}

export async function obtenerMovimientosRecientes() {
  const { movimientos = [] } = await api('/auditoria/movimientos-recientes')
  return movimientos.map((movement) => ({
    ...movement,
    fecha: new Date(movement.fecha).toLocaleString('es-CO'),
    tipo: movement.operacion.startsWith('Transformación')
      ? 'Transformación'
      : movement.operacion.startsWith('Venta')
        ? 'Venta'
        : movement.tipo,
    destino: movement.operacion,
    cantidad: `${Number(movement.cantidad).toLocaleString('es-CO')} ${movement.unidad}`,
  }))
}

export async function obtenerAlertasPersistidas() {
  const { incidencias = [] } = await api('/incidencias?estado=ABIERTA')
  return incidencias.map((item) => {
    const esMerma = item.tipo === 'MERMA_EXCESIVA'
    const fecha = item.creadaEn ? new Date(item.creadaEn).toLocaleString('es-CO') : 'Sin fecha'
    return {
      id: item.id,
      tipo: esMerma ? 'Merma' : item.tipo,
      severidad: String(item.severidad || '').toLowerCase(),
      lote: item.loteCodigo || `Lote ${item.loteId}`,
      etapa: item.transformacionCodigo || 'Incidencia operativa',
      regla: esMerma ? 'Merma superior al 15 %' : `Incidencia ${item.tipo}`,
      valor_registrado: esMerma ? 'Supera el umbral' : item.severidad,
      causa: item.descripcion,
      fecha,
      estado_lote: '',
    }
  })
}

export function descargarCSV(nombreArchivo, cabeceras, filas) {
  const contenido = '\uFEFF' + [cabeceras.join(';'), ...filas.map((fila) => fila.join(';'))].join('\r\n')
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', nombreArchivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
