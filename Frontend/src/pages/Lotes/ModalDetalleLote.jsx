import BadgeEstado from '../../component/BadgeEstado'
import { IconPackage, IconChart, IconAlert, IconTrendingDown, IconClipboard, IconGear } from '../../component/Icons'

const formatKg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`
const formatCop = (n) => `$ ${Number(n ?? 0).toLocaleString('es-CO')} COP`

export default function ModalDetalleLote({ abierto, lote, alCerrar, esAdmin, alAbrirGestionEstado }) {
  if (!abierto || !lote) return null

  const pctDisponible = lote.cantidad_recibida > 0 
    ? Math.round((lote.cantidad_disponible / lote.cantidad_recibida) * 100) 
    : 0

  const costoTotal = (lote.costo_unitario || 0) * (lote.cantidad_recibida || 0)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detalle-lote-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cacao-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-cacao-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 bg-cacao-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mazorca-500/20 text-mazorca-400 font-bold flex items-center justify-center text-xl">
              <IconPackage className="text-mazorca-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-detalle-lote-titulo" className="text-xl font-bold font-display text-white">
                  Lote {lote.codigo}
                </h2>
                <BadgeEstado estado={lote.estado} />
              </div>
              <p className="text-xs text-cacao-200">
                Trazabilidad integral de origen y control de bodega en Huila
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="p-1 rounded-lg text-cacao-200 hover:text-white hover:bg-cacao-800 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="p-6 space-y-6 overflow-y-auto bg-[#FDF8F5]">
          {/* Card Resumen de Inventario (RF08) */}
          <div className="bg-white p-4 rounded-xl border border-cacao-200 shadow-xs">
            <h3 className="text-xs font-bold text-cacao-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <IconChart className="w-4 h-4" /> RF08: Balance de Inventario
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div className="p-2.5 rounded-lg bg-cacao-50 border border-cacao-100">
                <span className="text-[11px] text-cacao-600 block">Recibido</span>
                <span className="text-base font-bold text-cacao-900">{formatKg(lote.cantidad_recibida)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-cacao-50 border border-cacao-100">
                <span className="text-[11px] text-cacao-600 block">Consumido</span>
                <span className="text-base font-bold text-cacao-700">{formatKg(lote.cantidad_consumida)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-800 font-medium block">Disponible</span>
                <span className="text-base font-extrabold text-emerald-900">{formatKg(lote.cantidad_disponible)}</span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div>
              <div className="flex justify-between text-xs text-cacao-600 mb-1">
                <span>Disponibilidad actual: <strong>{pctDisponible}%</strong></span>
                <span>{lote.cantidad_disponible === 0 ? 'Agotado' : 'En existencia'}</span>
              </div>
              <div className="w-full bg-cacao-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pctDisponible > 50 ? 'bg-emerald-600' : pctDisponible > 15 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${pctDisponible}%` }}
                />
              </div>
            </div>
          </div>

          {/* Información de Origen y Calidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-cacao-200 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-cacao-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <IconPackage className="w-4 h-4" /> Origen y Productor
              </h3>
              <p className="text-sm text-cacao-900">
                <strong className="text-cacao-700">Productor:</strong> {lote.productor?.nombre}
              </p>
              <p className="text-sm text-cacao-900">
                <strong className="text-cacao-700">Municipio:</strong> {lote.productor?.municipio}, Huila
              </p>
              <p className="text-sm text-cacao-900">
                <strong className="text-cacao-700">Finca:</strong> {lote.productor?.finca || 'No especificada'}
              </p>
              <p className="text-sm text-cacao-900">
                <strong className="text-cacao-700">Teléfono:</strong> {lote.productor?.telefono || 'No registrado'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-cacao-200 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-cacao-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <IconPin className="w-4 h-4" /> Especificaciones Técnicas
              </h3>
              <p className="text-sm text-cacao-900">
                <strong className="text-cacao-700">Tipo de Grano:</strong> {lote.tipo_material}
              </p>
              <p className="text-sm text-cacao-900">
                <strong className="text-cacao-700">Fecha de Recepción:</strong> {lote.fecha_recepcion}
              </p>
              <p className="text-sm text-cacao-900">
                <strong className="text-cacao-700">Humedad en Grano:</strong> {lote.humedad_pct ? `${lote.humedad_pct}%` : '7.0%'}
              </p>
              {esAdmin && (
                <div className="pt-2 border-t border-cacao-100">
                  <p className="text-sm text-cacao-900">
                    <strong className="text-cacao-700">Costo unitario:</strong> {formatCop(lote.costo_unitario)}/kg
                  </p>
                  <p className="text-sm text-cacao-900 font-semibold">
                    <strong className="text-cacao-700">Valor Total Lote:</strong> {formatCop(costoTotal)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Merma y Alertas (RF04) */}
          <div
            className={`p-4 rounded-xl border ${
              lote.merma_porcentaje > 15
                ? 'bg-red-50/90 border-red-300'
                : 'bg-white border-cacao-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                {lote.merma_porcentaje > 15 ? (
                  <span className="text-peligro-600 flex items-center gap-1">
                    <IconAlert className="w-4 h-4" /> RF04: Alerta de Merma Crítica (&gt; 15%)
                  </span>
                ) : (
                  <span className="text-cacao-800 flex items-center gap-1">
                    <IconTrendingDown className="w-4 h-4" /> Control de Merma del Lote
                  </span>
                )}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  lote.merma_porcentaje > 15
                    ? 'bg-red-100 text-peligro-600 border border-red-300'
                    : 'bg-cacao-100 text-cacao-800'
                }`}
              >
                {lote.merma_porcentaje}% de merma
              </span>
            </div>
            <p className="text-xs text-cacao-800 mb-1">
              <strong>Etapa evaluada:</strong> {lote.merma_etapa || 'Secado y selección'}
            </p>
            <p className="text-xs text-cacao-700">
              <strong>Explicación de causa:</strong>{' '}
              {lote.merma_causa || 'Merma habitual en rango técnico de proceso agroindustrial.'}
            </p>
          </div>

          {/* Historial de Estados / Auditoría (Solo completo para admin, o trazabilidad básica) */}
          {esAdmin && (
            <div className="bg-white p-4 rounded-xl border border-cacao-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-cacao-800 uppercase tracking-wider flex items-center gap-1.5">
                  <IconClipboard className="w-4 h-4" /> Auditoría e Historial de Estados (RF09)
                </h3>
                <span className="text-[11px] text-cacao-500">
                  {(lote.historial_estados || []).length} registros
                </span>
              </div>

              {(!lote.historial_estados || lote.historial_estados.length === 0) ? (
                <p className="text-xs text-cacao-500 italic">No hay cambios de estado registrados.</p>
              ) : (
                <div className="space-y-3">
                  {lote.historial_estados.map((h, i) => (
                    <div key={h.id || i} className="p-3 bg-cacao-50/70 border border-cacao-100 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-cacao-900">
                          {h.estado_anterior} → <strong className="text-cacao-800">{h.estado_nuevo}</strong>
                        </span>
                        <span className="text-[10px] text-cacao-500">{h.fecha}</span>
                      </div>
                      <p className="text-cacao-700 mb-1">
                        <strong>Motivo:</strong> {h.motivo}
                      </p>
                      <p className="text-[10px] text-cacao-500 italic">Registrado por: {h.usuario}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-cacao-200 shrink-0">
          <div>
            {esAdmin && alAbrirGestionEstado && (
              <button
                type="button"
                onClick={() => {
                  alCerrar()
                  alAbrirGestionEstado(lote)
                }}
                className="px-4 py-2 rounded-lg bg-cacao-800 hover:bg-cacao-900 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <IconGear className="w-4 h-4" />
                <span>Cambiar Estado (Bloquear / Liberar)</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="px-4 py-2 rounded-lg border border-cacao-300 text-cacao-700 hover:bg-cacao-100 font-medium text-xs transition cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  )
}
