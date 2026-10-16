// Servicio y almacenamiento mock de datos para el Panel de Administrador de Cacao del Huila
import { api } from './api'

export const AUDITORIA_INICIAL = [
  {
    id: 1,
    fecha: '2026-03-26 10:10',
    usuario: 'Ing. María Gómez (Admin)',
    entidad: 'Lote CAC006',
    operacion: 'Cambio de Estado',
    valor_anterior: 'Pendiente',
    valor_nuevo: 'Liberado',
    motivo: 'Certificación de origen y trazabilidad Huila verificada. Control sensorial aprobado.'
  },
  {
    id: 2,
    fecha: '2026-03-24 16:20',
    usuario: 'Carlos Operador',
    entidad: 'Lote CAC005',
    operacion: 'Creación de Lote',
    valor_anterior: 'Ninguno',
    valor_nuevo: '150 kg en baba (San Agustín)',
    motivo: 'Recepción inicial en bodega sur.'
  },
  {
    id: 3,
    fecha: '2026-03-23 08:45',
    usuario: 'Ing. María Gómez (Admin)',
    entidad: 'Lote CAC004',
    operacion: 'Cambio de Estado',
    valor_anterior: 'Pendiente',
    valor_nuevo: 'Liberado',
    motivo: 'Cumple especificaciones de exportación NTC 1252. Autorizado para molienda.'
  },
  {
    id: 4,
    fecha: '2026-03-21 11:00',
    usuario: 'Ing. María Gómez (Admin)',
    entidad: 'Lote CAC003',
    operacion: 'Cambio de Estado',
    valor_anterior: 'Pendiente',
    valor_nuevo: 'Bloqueado',
    motivo: 'Humedad supera el 10% permitido (marcó 11.5%). Alerta fitosanitaria por condensación.'
  },
  {
    id: 5,
    fecha: '2026-03-19 14:15',
    usuario: 'Ing. María Gómez (Admin)',
    entidad: 'Lote CAC002',
    operacion: 'Cambio de Estado',
    valor_anterior: 'Pendiente',
    valor_nuevo: 'Liberado',
    motivo: 'Aprobó prueba sensorial de catación y perfil de acidez Huila.'
  },
  {
    id: 6,
    fecha: '2026-03-15 09:30',
    usuario: 'Carlos Operador',
    entidad: 'Lote CAC001',
    operacion: 'Creación de Lote',
    valor_anterior: 'Ninguno',
    valor_nuevo: '100 kg seco (Rivera)',
    motivo: 'Ingreso inicial a acopio.'
  }
]

export const ALERTAS_INICIALES = [
  {
    id: 'ALT-001',
    tipo: 'Merma',
    severidad: 'alta',
    lote: 'CAC001',
    etapa: 'Secado y selección',
    regla: 'Merma > 15%',
    valor_registrado: '20.0%',
    causa: 'Exceso de humedad en cosecha temprana; se requirió mayor evaporación en marquesina solar y descarte de granos partidos.',
    fecha: '2026-03-16 11:30',
    estado_lote: 'Liberado'
  },
  {
    id: 'ALT-002',
    tipo: 'Merma',
    severidad: 'alta',
    lote: 'CAC003',
    etapa: 'Fermentación en cajones',
    regla: 'Merma > 15%',
    valor_registrado: '18.2%',
    causa: 'Sobremaduración en baba y condensación térmica en cajones de laurel; riesgo fitosanitario de moho superficial.',
    fecha: '2026-03-21 08:20',
    estado_lote: 'Bloqueado'
  },
  {
    id: 'ALT-003',
    tipo: 'Costo',
    severidad: 'media',
    lote: 'CAC002',
    etapa: 'Tostado preliminar',
    regla: 'Costo unitario > $16.000 COP/kg',
    valor_registrado: '$16.200 COP/kg',
    causa: 'Incremento en flete veredal por temporada de lluvias en Campoalegre.',
    fecha: '2026-03-19 15:40',
    estado_lote: 'Liberado'
  },
  {
    id: 'ALT-004',
    tipo: 'Registro Incompleto',
    severidad: 'baja',
    lote: 'CAC005',
    etapa: 'Recepción inicial',
    regla: 'Certificado de beneficiadero faltante',
    valor_registrado: 'Sin adjunto PDF',
    causa: 'Falta carga de formulario de trazabilidad de San Agustín por corte de energía.',
    fecha: '2026-03-24 17:00',
    estado_lote: 'Pendiente'
  },
  {
    id: 'ALT-005',
    tipo: 'Retraso',
    severidad: 'media',
    lote: 'CAC004',
    etapa: 'Maduración en bodega',
    regla: 'Tiempo de reposo > 5 días',
    valor_registrado: '6.5 días',
    causa: 'Mantenimiento preventivo en tolva de molienda de la asociación.',
    fecha: '2026-03-25 09:15',
    estado_lote: 'Liberado'
  }
]

export const MOVIMIENTOS_RECIENTES = [
  { id: 'MOV-101', fecha: '2026-03-26 14:00', lote: 'CAC006', tipo: 'Transformación', cantidad: '45 kg', operacion: 'Descarillado y molienda fina', destino: 'Pasta de Cacao 100%' },
  { id: 'MOV-102', fecha: '2026-03-25 10:30', lote: 'CAC004', tipo: 'Consumo', cantidad: '120 kg', operacion: 'Tostado para Nibs', destino: 'Nibs Criollo Huila' },
  { id: 'MOV-103', fecha: '2026-03-24 16:20', lote: 'CAC005', tipo: 'Entrada', cantidad: '150 kg', operacion: 'Pesaje báscula digital', destino: 'Bodega Acopio Sur' },
  { id: 'MOV-104', fecha: '2026-03-21 11:00', lote: 'CAC003', tipo: 'Bloqueo', cantidad: '150 kg', operacion: 'Cuarentena fitosanitaria', destino: 'Zona de retención' },
  { id: 'MOV-105', fecha: '2026-03-18 16:45', lote: 'CAC002', tipo: 'Transformación', cantidad: '50 kg', operacion: 'Selección sensorial', destino: 'Batch Chocolatería Fina' }
]

// Obtener auditoría persistida o inicial
export function obtenerAuditoria() {
  const local = localStorage.getItem('cacao_admin_auditoria')
  if (local) {
    try {
      return JSON.parse(local)
    } catch {
      // Fallback
    }
  }
  return AUDITORIA_INICIAL
}

export function registrarAuditoria(registro) {
  const actual = obtenerAuditoria()
  const nueva = [registro, ...actual]
  try {
    localStorage.setItem('cacao_admin_auditoria', JSON.stringify(nueva))
  } catch (e) {
    console.error('Error guardando auditoria:', e)
  }
  return nueva
}

// Obtener alertas
export function obtenerAlertasAdmin() {
  const local = localStorage.getItem('cacao_admin_alertas')
  if (local) {
    try {
      return JSON.parse(local)
    } catch {
      // Fallback
    }
  }
  return ALERTAS_INICIALES
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

// Exportador genérico a CSV con UTF-8 y BOM
export function descargarCSV(nombreArchivo, cabeceras, filas) {
  const contenido = '\uFEFF' + [cabeceras.join(';'), ...filas.map((f) => f.join(';'))].join('\r\n')
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
