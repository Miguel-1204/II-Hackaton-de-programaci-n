import { useState } from 'react'
import { LOTES_INICIALES } from '../../services/lotesService'
import { obtenerAlertasAdmin, obtenerAuditoria } from '../../services/adminService'
import BadgeEstado from '../../component/BadgeEstado'
import { IconRobot, IconInfo, IconSearch, IconChatBubble, IconFormula, IconExclamation } from '../../component/Icons'

const formatKg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`
const formatCop = (n) => `$ ${Number(n ?? 0).toLocaleString('es-CO')} COP`

const CONSULTAS_EJEMPLO = [
  'rentabilidad por productor en 2026',
  'mermas mayores al 15%',
  'inventario disponible en Rivera',
  'trazabilidad del lote CAC001',
  'alertas críticas activas'
]

export default function Consultas({ abierto = true, alCerrar }) {
  const [textoConsulta, setTextoConsulta] = useState('')
  const [resultado, setResultado] = useState(null)
  const [historialConsultas, setHistorialConsultas] = useState([])

  if (!abierto) return null

  const procesarConsulta = (consultaTexto) => {
    const q = (consultaTexto || textoConsulta).trim().toLowerCase()
    if (!q) return

    let interpretacion = null
    let tabla = null
    let formula = null
    let entendido = true

    if (q.includes('rentabilidad') || q.includes('margen')) {
      interpretacion = 'Entendí: métrica = rentabilidad y márgenes de ganancia, entidad = productores, filtro = año 2026.'
      formula = 'Margen Bruto (%) = [(Precio Venta Sugerido − Costo Unitario) ÷ Precio Venta Sugerido] × 100.'
      tabla = {
        columnas: ['Productor', 'Municipio', 'Lote', 'Costo Base ($/kg)', 'Precio Venta ($/kg)', 'Margen Estimado'],
        filas: LOTES_INICIALES.map((l) => {
          const precioVenta = Math.round(l.costo_unitario * 1.45)
          const margen = Math.round(((precioVenta - l.costo_unitario) / precioVenta) * 100)
          return [
            l.productor?.nombre,
            `${l.productor?.municipio}, Huila`,
            l.codigo,
            formatCop(l.costo_unitario),
            formatCop(precioVenta),
            <span key={l.id} className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              {margen}%
            </span>
          ]
        })
      }
    } else if (q.includes('merma') || q.includes('perdida')) {
      interpretacion = 'Entendí: métrica = mermas en procesamiento, regla = detección de pérdidas agroindustriales.'
      formula = 'Porcentaje de Merma (%) = [(Masa Entrada − Masa Salida) ÷ Masa Entrada] × 100.'
      const mermasCriticas = LOTES_INICIALES.filter((l) => l.merma_porcentaje > 15)
      tabla = {
        columnas: ['Lote', 'Etapa de Proceso', 'Merma (%)', 'Causa Técnica Identificada', 'Estado Lote'],
        filas: mermasCriticas.map((l) => [
          <strong key={l.id} className="font-mono">{l.codigo}</strong>,
          l.merma_etapa,
          <span key={l.id} className="font-bold text-peligro-600 bg-red-50 px-2 py-0.5 rounded">
            {l.merma_porcentaje}% (Crítica)
          </span>,
          l.merma_causa,
          <BadgeEstado key={l.id} estado={l.estado} />
        ])
      }
    } else if (q.includes('inventario') || q.includes('stock') || q.includes('disponible') || q.includes('rivera')) {
      interpretacion = 'Entendí: métrica = inventario en bodega, filtro = existencias recibidas, consumidas y disponibles.'
      formula = 'Disponible (kg) = Recibido (kg) − Consumido (kg).'
      tabla = {
        columnas: ['Lote', 'Municipio', 'Recibido', 'Consumido', 'Disponible en Bodega', 'Estado'],
        filas: LOTES_INICIALES.map((l) => [
          <span key={l.id} className="font-mono font-bold">{l.codigo}</span>,
          l.productor?.municipio,
          formatKg(l.cantidad_recibida),
          formatKg(l.cantidad_consumida),
          <span key={l.id} className="font-bold text-emerald-800">
            {formatKg(l.cantidad_disponible)}
          </span>,
          <BadgeEstado key={l.id} estado={l.estado} />
        ])
      }
    } else if (q.includes('trazabilidad') || q.includes('cac001') || q.includes('historial')) {
      interpretacion = 'Entendí: métrica = trazabilidad de origen y eventos del lote CAC001.'
      formula = 'Cadena de custodia desde predio veredal en Rivera hasta bodega de transformación.'
      const lote = LOTES_INICIALES.find((l) => l.codigo === 'CAC001') || LOTES_INICIALES[0]
      tabla = {
        columnas: ['Código', 'Productor y Finca', 'Humedad', 'Merma', 'Estado Actual', 'Fecha Ingreso'],
        filas: [
          [
            <strong key="1" className="font-mono text-cacao-950">{lote.codigo}</strong>,
            `${lote.productor?.nombre} (${lote.productor?.finca}, ${lote.productor?.municipio})`,
            `${lote.humedad_pct}%`,
            `${lote.merma_porcentaje}% (${lote.merma_etapa})`,
            <BadgeEstado key="2" estado={lote.estado} />,
            lote.fecha_recepcion
          ]
        ]
      }
    } else if (q.includes('alerta')) {
      interpretacion = 'Entendí: métrica = alertas activas de producción, filtro = desviaciones de proceso.'
      formula = 'Condiciones de activación automática de bandera roja agroindustrial.'
      const alertas = obtenerAlertasAdmin()
      tabla = {
        columnas: ['Tipo', 'Lote', 'Regla Infringida', 'Valor', 'Causa Técnica', 'Fecha'],
        filas: alertas.map((a) => [
          <span key={a.id} className="font-bold text-peligro-600 bg-red-100 px-2 py-0.5 rounded text-[11px]">{a.tipo}</span>,
          a.lote,
          a.regla,
          a.valor_registrado,
          a.causa,
          a.fecha
        ])
      }
    } else if (q.includes('auditoria') || q.includes('estado')) {
      interpretacion = 'Entendí: métrica = bitácora de auditoría inmutable de cambios de estado.'
      formula = 'Pista cronológica inmutable exigida por el estándar de exportación de cacao Huila.'
      const logs = obtenerAuditoria()
      tabla = {
        columnas: ['Fecha', 'Usuario', 'Entidad', 'Operación', 'Valor Anterior', 'Valor Nuevo'],
        filas: logs.slice(0, 5).map((log) => [
          log.fecha,
          log.usuario,
          log.entidad,
          log.operacion,
          log.valor_anterior,
          <strong key={log.id} className="text-cacao-950">{log.valor_nuevo}</strong>
        ])
      }
    } else {
      entendido = false
    }

    const nuevoResultado = {
      consulta: q,
      entendido,
      interpretacion,
      tabla,
      formula
    }

    setResultado(nuevoResultado)
    setHistorialConsultas((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 5))
  }

  const handleEnviarFormulario = (e) => {
    e.preventDefault()
    procesarConsulta()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nlp-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-cacao-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-cacao-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-fadeIn">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2C1A14] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mazorca-500/20 border border-mazorca-500/40 text-mazorca-400 font-bold flex items-center justify-center text-xl">
              <IconRobot className="text-mazorca-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-nlp-titulo" className="text-lg font-bold font-display text-white">
                  Motor de Consultas en Lenguaje Natural (NLP)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-mazorca-500/20 text-mazorca-300 border border-mazorca-500/30">
                  Diferenciador
                </span>
              </div>
              <p className="text-xs text-cacao-200">
                Asistente inteligente para análisis de rentabilidad, mermas e inventario cacaotero del Huila
              </p>
            </div>
          </div>
          {alCerrar && (
            <button
              type="button"
              onClick={alCerrar}
              className="p-1.5 rounded-xl text-cacao-200 hover:text-white hover:bg-cacao-800 transition cursor-pointer"
              aria-label="Cerrar modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Contenido scrolleable del Modal */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-[#FDF8F5]">
          {/* MENSAJE DE INSTRUCCIONES VISIBLE (REQUERIDO) */}
          <section className="p-4 rounded-2xl bg-gradient-to-r from-[#2C1A14] to-[#382119] text-white shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mazorca-400">
              <IconInfo className="w-4 h-4" /> Instrucciones de Consulta
            </div>
            <p className="text-sm font-medium text-cacao-50">
              Puedes preguntar por: <strong>rentabilidad</strong>, <strong>merma</strong>, <strong>inventario</strong>, <strong>trazabilidad</strong>.
            </p>
            <p className="text-xs text-cacao-200">
              Ejemplo: <code className="bg-black/30 px-2 py-0.5 rounded text-mazorca-300">"rentabilidad por productor en 2026"</code> o <code className="bg-black/30 px-2 py-0.5 rounded text-mazorca-300">"mermas mayores al 15%"</code>.
            </p>
          </section>

          {/* BARRA DE BÚSQUEDA / CHAT */}
          <section className="bg-white p-4 rounded-2xl border border-cacao-200 shadow-2xs space-y-3">
            <form onSubmit={handleEnviarFormulario} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={textoConsulta}
                  onChange={(e) => setTextoConsulta(e.target.value)}
                  placeholder="Escribe tu consulta aquí (ej: rentabilidad por productor en 2026)..."
                  className="w-full px-4 py-2.5 pl-10 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs sm:text-sm text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
                />
                <span className="absolute left-3 top-2.5 text-cacao-400 text-sm">💬</span>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-cacao-800 hover:bg-cacao-900 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <IconSearch className="w-4 h-4" />
                <span>Analizar Consulta</span>
              </button>
            </form>

            {/* Sugerencias Rápidas */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-cacao-500 font-semibold text-[11px]">Sugerencias:</span>
              {CONSULTAS_EJEMPLO.map((ejemplo) => (
                <button
                  key={ejemplo}
                  type="button"
                  onClick={() => {
                    setTextoConsulta(ejemplo)
                    procesarConsulta(ejemplo)
                  }}
                  className="px-2 py-1 rounded-lg bg-cacao-50 hover:bg-cacao-100 border border-cacao-200 text-cacao-800 text-[11px] transition cursor-pointer"
                >
                  "{ejemplo}"
                </button>
              ))}
            </div>

            {historialConsultas.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-cacao-100 text-[11px] text-cacao-600">
                <span className="font-semibold">Historial reciente:</span>
                {historialConsultas.map((hist, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTextoConsulta(hist)
                      procesarConsulta(hist)
                    }}
                    className="text-cacao-700 hover:text-cacao-950 underline cursor-pointer"
                  >
                    {hist}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* RESULTADOS DEL ANÁLISIS */}
          {resultado && (
            <section className="space-y-4">
              {resultado.entendido ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* 1) Interpretación */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2 shadow-2xs">
                    <IconRobot className="w-4 h-4 text-emerald-700" />
                    <span>{resultado.interpretacion}</span>
                  </div>

                  {/* 2) Tabla de Resultados */}
                  {resultado.tabla && (
                    <div className="bg-white rounded-2xl border border-cacao-200 shadow-2xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#2A1810] text-cacao-50 text-[11px] uppercase tracking-wider font-bold">
                              {resultado.tabla.columnas.map((col, idx) => (
                                <th key={idx} scope="col" className="py-2.5 px-3.5">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cacao-100 text-cacao-900">
                            {resultado.tabla.filas.map((fila, fIdx) => (
                              <tr key={fIdx} className="hover:bg-cacao-50/70 transition">
                                {fila.map((celda, cIdx) => (
                                  <td key={cIdx} className="py-2.5 px-3.5">
                                    {celda}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3) Fórmula o Supuestos */}
                  {resultado.formula && (
                    <div className="p-3.5 rounded-xl bg-white border border-cacao-200 text-xs text-cacao-800 space-y-1 shadow-2xs">
                      <span className="font-bold text-cacao-900 block flex items-center gap-1.5">
                        <IconFormula className="w-4 h-4 text-cacao-500" /> Fórmula y Algoritmo Aplicado:
                      </span>
                      <p className="font-mono text-[11px] text-cacao-700 bg-cacao-50 p-2 rounded-lg border border-cacao-100">
                        {resultado.formula}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Mensaje cuando no entiende la consulta (Requisito exacto) */
                <div className="p-6 bg-white rounded-2xl border border-cacao-200 shadow-2xs space-y-2 text-center">
                  <IconExclamation className="w-10 h-10 text-cacao-400 mx-auto" />
                  <p className="text-xs sm:text-sm font-bold text-cacao-950">
                    No entendí. Prueba con: rentabilidad, merma, inventario, trazabilidad, alertas, estado o auditoría.
                  </p>
                  <p className="text-xs text-cacao-600 max-w-md mx-auto">
                    El analizador semántico requiere palabras clave agroindustriales del Huila.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTextoConsulta('rentabilidad por productor en 2026')
                        procesarConsulta('rentabilidad por productor en 2026')
                      }}
                      className="px-3 py-1.5 bg-cacao-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Probar "rentabilidad"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTextoConsulta('mermas mayores al 15%')
                        procesarConsulta('mermas mayores al 15%')
                      }}
                      className="px-3 py-1.5 bg-cacao-100 text-cacao-800 rounded-lg text-xs font-semibold hover:bg-cacao-200 cursor-pointer"
                    >
                      Probar "mermas"
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Pie del modal */}
        {alCerrar && (
          <div className="px-6 py-3 bg-white border-t border-cacao-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-cacao-500">
              Consultas Inteligentes de Trazabilidad Huila
            </span>
            <button
              type="button"
              onClick={alCerrar}
              className="px-4 py-1.5 bg-cacao-100 hover:bg-cacao-200 text-cacao-800 font-semibold rounded-lg text-xs transition cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
