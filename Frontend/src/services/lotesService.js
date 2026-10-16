import { supabase } from '../lib/supabase'
import { MODO_DEMO } from '../lib/demo'

// Datos mock iniciales con la estructura requerida para la Hackathon
export const LOTES_INICIALES = [
  {
    id: 1,
    codigo: 'CAC001',
    tipo_material: 'Cacao seco fermentado',
    productor: {
      id: 101,
      nombre: 'Don Emiro Dussán',
      municipio: 'Rivera',
      finca: 'La Esperanza',
      telefono: '+57 312 450 8891'
    },
    fecha_recepcion: '2026-03-15',
    cantidad_recibida: 100,
    unidad: 'kg',
    cantidad_consumida: 100,
    cantidad_disponible: 0,
    estado: 'Pendiente',
    costo_unitario: 14500, // COP/kg (visible para admin)
    humedad_pct: 7.2,
    merma_porcentaje: 20,
    merma_etapa: 'Secado y selección',
    merma_causa: 'Exceso de humedad en cosecha temprana; se requirió mayor evaporación en marquesina solar y selección de granos partidos.',
    historial_estados: [
      {
        id: 1,
        estado_anterior: 'Nuevo',
        estado_nuevo: 'Pendiente',
        fecha: '2026-03-15 09:30',
        usuario: 'Carlos Operador',
        motivo: 'Recepción inicial en bodega Rivera. En espera de análisis de corte.'
      }
    ]
  },
  {
    id: 2,
    codigo: 'CAC002',
    tipo_material: 'Cacao fino de aroma',
    productor: {
      id: 102,
      nombre: 'Doña Rosalba Silva',
      municipio: 'Campoalegre',
      finca: 'El Porvenir',
      telefono: '+57 320 882 1204'
    },
    fecha_recepcion: '2026-03-18',
    cantidad_recibida: 250,
    unidad: 'kg',
    cantidad_consumida: 50,
    cantidad_disponible: 200,
    estado: 'Liberado',
    costo_unitario: 16200,
    humedad_pct: 6.8,
    merma_porcentaje: 8.5,
    merma_etapa: 'Limpieza y tostado preliminar',
    merma_causa: 'Pérdida habitual dentro del estándar técnico agroindustrial (polvillo e impurezas menores).',
    historial_estados: [
      {
        id: 2,
        estado_anterior: 'Pendiente',
        estado_nuevo: 'Liberado',
        fecha: '2026-03-19 14:15',
        usuario: 'Ing. María Gómez (Admin)',
        motivo: 'Aprobó prueba sensorial de catación y perfil de acidez Huila. Grano óptimo para chocolatería fina.'
      }
    ]
  },
  {
    id: 3,
    codigo: 'CAC003',
    tipo_material: 'Cacao seco fermentado',
    productor: {
      id: 103,
      nombre: 'Gonzalo Trujillo',
      municipio: 'Algeciras',
      finca: 'Villa Colombia',
      telefono: '+57 311 902 4312'
    },
    fecha_recepcion: '2026-03-20',
    cantidad_recibida: 180,
    unidad: 'kg',
    cantidad_consumida: 30,
    cantidad_disponible: 150,
    estado: 'Bloqueado',
    costo_unitario: 13800,
    humedad_pct: 11.5,
    merma_porcentaje: 18.2,
    merma_etapa: 'Fermentación en cajones de madera',
    merma_causa: 'Sobremaduración en baba y condensación térmica en cajones de laurel; riesgo fitosanitario de moho superficial.',
    historial_estados: [
      {
        id: 3,
        estado_anterior: 'Pendiente',
        estado_nuevo: 'Bloqueado',
        fecha: '2026-03-21 11:00',
        usuario: 'Ing. María Gómez (Admin)',
        motivo: 'Humedad supera el 10% permitido (marcó 11.5%). Se bloquea hasta re-secado controlado y nueva prueba de corte.'
      }
    ]
  },
  {
    id: 4,
    codigo: 'CAC004',
    tipo_material: 'Cacao lavado especial',
    productor: {
      id: 104,
      nombre: 'Asociación Campesina Gigante',
      municipio: 'Gigante',
      finca: 'Las Brisas',
      telefono: '+57 315 764 9900'
    },
    fecha_recepcion: '2026-03-22',
    cantidad_recibida: 320,
    unidad: 'kg',
    cantidad_consumida: 120,
    cantidad_disponible: 200,
    estado: 'Liberado',
    costo_unitario: 15500,
    humedad_pct: 6.9,
    merma_porcentaje: 9.0,
    merma_etapa: 'Clasificación por calibre',
    merma_causa: 'Descarte mínimo de pasillas y granos vanos.',
    historial_estados: [
      {
        id: 4,
        estado_anterior: 'Pendiente',
        estado_nuevo: 'Liberado',
        fecha: '2026-03-23 08:45',
        usuario: 'Ing. María Gómez (Admin)',
        motivo: 'Cumple especificaciones de exportación NTC 1252. Lote liberado para molienda y pasta pura.'
      }
    ]
  },
  {
    id: 5,
    codigo: 'CAC005',
    tipo_material: 'Cacao en baba nativo',
    productor: {
      id: 105,
      nombre: 'Jairo Perdomo',
      municipio: 'San Agustín',
      finca: 'El Encanto Arqueológico',
      telefono: '+57 313 555 7820'
    },
    fecha_recepcion: '2026-03-24',
    cantidad_recibida: 150,
    unidad: 'kg',
    cantidad_consumida: 0,
    cantidad_disponible: 150,
    estado: 'Pendiente',
    costo_unitario: 14000,
    humedad_pct: 7.5,
    merma_porcentaje: 6.5,
    merma_etapa: 'Recepción y escurrido',
    merma_causa: 'Pérdida de mucílago inicial dentro del parámetro estándar.',
    historial_estados: [
      {
        id: 5,
        estado_anterior: 'Nuevo',
        estado_nuevo: 'Pendiente',
        fecha: '2026-03-24 16:20',
        usuario: 'Carlos Operador',
        motivo: 'Ingreso a bodega sur. Pendiente programación de fermentación continua.'
      }
    ]
  },
  {
    id: 6,
    codigo: 'CAC006',
    tipo_material: 'Cacao seco fermentado',
    productor: {
      id: 106,
      nombre: 'Beatriz Aldana',
      municipio: 'Garzón',
      finca: 'La Samaria',
      telefono: '+57 318 432 1099'
    },
    fecha_recepcion: '2026-03-25',
    cantidad_recibida: 210,
    unidad: 'kg',
    cantidad_consumida: 45,
    cantidad_disponible: 165,
    estado: 'Liberado',
    costo_unitario: 15100,
    humedad_pct: 7.0,
    merma_porcentaje: 11.2,
    merma_etapa: 'Tostado y descarillado',
    merma_causa: 'Separación mecánica de cascarilla para infusión.',
    historial_estados: [
      {
        id: 6,
        estado_anterior: 'Pendiente',
        estado_nuevo: 'Liberado',
        fecha: '2026-03-26 10:10',
        usuario: 'Ing. María Gómez (Admin)',
        motivo: 'Certificación de origen y trazabilidad Huila verificada.'
      }
    ]
  }
]

// Lista de municipios del Huila con vocación cacaotera
export const MUNICIPIOS_HUILA = [
  'Rivera',
  'Campoalegre',
  'Algeciras',
  'Gigante',
  'Garzón',
  'San Agustín',
  'Pitalito',
  'Palermo',
  'Aipe',
  'Tarqui',
  'Tesalia',
  'La Plata'
]

// Servicio para obtener lotes (soporta demo o base de datos)
export async function obtenerLotes() {
  if (MODO_DEMO || !supabase) {
    // Lee de localStorage si fue modificado en la sesión para persistencia en demo
    const local = localStorage.getItem('cacao_lotes_demo')
    if (local) {
      try {
        return JSON.parse(local)
      } catch {
        // Fallback
      }
    }
    return LOTES_INICIALES
  }

  try {
    const { data, error } = await supabase
      .from('lotes')
      .select(`
        *,
        productor:productores(id, nombre, municipio, finca, telefono),
        historial_estados(*)
      `)
      .order('fecha_recepcion', { ascending: false })

    if (error) {
      console.warn('Error cargando de Supabase, usando respaldo demo:', error.message)
      return LOTES_INICIALES
    }
    return data && data.length > 0 ? data : LOTES_INICIALES
  } catch (err) {
    console.warn('Fallo de red o configuración, usando fallback:', err)
    return LOTES_INICIALES
  }
}

// Guardar lista en localStorage para sesiones demo
export function persistirLotesDemo(lotes) {
  try {
    localStorage.setItem('cacao_lotes_demo', JSON.stringify(lotes))
  } catch (e) {
    console.error('No se pudo guardar en localStorage:', e)
  }
}
