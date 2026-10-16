import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { obtenerLotes, LOTES_INICIALES } from '../../services/lotesService'
import { IconInbox, IconGear, IconSparkle, IconAlert, IconSearch } from '../../component/Icons'
import './DashboardOperador.css'

const formatKg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`

export default function DashboardOperador() {
  const { usuario } = useAuth()
  const [lotes, setLotes] = useState(LOTES_INICIALES)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let montado = true
    obtenerLotes()
      .then((datos) => {
        if (montado && datos && datos.length > 0) {
          setLotes(datos)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (montado) setCargando(false)
      })

    return () => {
      montado = false
    }
  }, [])

  // Métricas acumuladas de inventario (RF08)
  const metricas = useMemo(() => {
    const totalRecibido = lotes.reduce((acc, l) => acc + Number(l.cantidad_recibida ?? 0), 0)
    const totalConsumido = lotes.reduce((acc, l) => acc + Number(l.cantidad_consumida ?? 0), 0)
    const totalDisponible = lotes.reduce((acc, l) => acc + Number(l.cantidad_disponible ?? 0), 0)
    return {
      totalRecibido,
      totalConsumido,
      totalDisponible,
      totalLotes: lotes.length
    }
  }, [lotes])

  // Alertas de merma crítica > 15% (RF04)
  const alertasMermaCritica = useMemo(() => {
    return lotes.filter((l) => Number(l.merma_porcentaje ?? 0) > 15)
  }, [lotes])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 font-sans">
      {/* Encabezado */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-cacao-900 tracking-tight">
          Panel del operador
        </h1>
        <p className="mt-1 text-sm text-cacao-700">
          Hola, {usuario?.nombre || 'Operador'}. ¿Qué vas a registrar hoy?
        </p>

        {/* Acciones del menú rápido */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/lotes/nuevo" className="op-boton op-boton-principal">
            Recibir lote
          </Link>
          <Link to="/transformaciones/nueva" className="op-boton">
            Registrar transformación
          </Link>
          <Link to="/lotes" className="op-boton">
            Consultar trazabilidad
          </Link>
        </div>
      </div>

      {cargando ? (
        <div className="p-8 text-center text-cacao-600 bg-white rounded-2xl border border-cacao-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cacao-300 border-t-cacao-800 mb-2" />
          <p className="text-sm">Cargando métricas del panel…</p>
        </div>
      ) : (
        <>
          {/* SECCIÓN 1: KPI CARDS SUPERIORES (IMAGEN 1) */}
          <section aria-label="Métricas de Inventario" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Recibido */}
            <div className="bg-white p-5 rounded-2xl border border-cacao-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-cacao-600 text-xs font-semibold uppercase tracking-wider">
                <span>TOTAL RECIBIDO</span>
                <IconInbox className="w-5 h-5 text-cacao-400" />
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-bold text-cacao-950">
                  {formatKg(metricas.totalRecibido)}
                </span>
                <p className="text-xs text-cacao-500 mt-1">En {metricas.totalLotes} lotes acopiados</p>
              </div>
            </div>

            {/* Consumido */}
            <div className="bg-white p-5 rounded-2xl border border-cacao-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-cacao-600 text-xs font-semibold uppercase tracking-wider">
                <span>CONSUMIDO</span>
                <IconGear className="w-5 h-5 text-cacao-400" />
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-bold text-cacao-700">
                  {formatKg(metricas.totalConsumido)}
                </span>
                <p className="text-xs text-cacao-500 mt-1">Transformado a nibs/pasta</p>
              </div>
            </div>

            {/* Disponible Bodega */}
            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold uppercase tracking-wider">
                <span>DISPONIBLE BODEGA</span>
                <IconSparkle className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-black text-emerald-900">
                  {formatKg(metricas.totalDisponible)}
                </span>
                <p className="text-xs text-emerald-700 mt-1">Existencia actual utilizable</p>
              </div>
            </div>

            {/* Alertas Críticas */}
            <div className="bg-white p-5 rounded-2xl border border-cacao-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-cacao-600 text-xs font-semibold uppercase tracking-wider">
                <span>ALERTAS CRÍTICAS</span>
                <IconAlert className="w-5 h-5 text-peligro-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-bold text-peligro-600">
                  {alertasMermaCritica.length}
                </span>
                <p className="text-xs text-cacao-500 mt-1">Mermas mayores al 15%</p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: ALERTA DE MERMAS > 15% RF04 (IMAGEN 1) */}
          <section aria-labelledby="alertas-mermas-titulo">
            {alertasMermaCritica.length > 0 && (
              <div
                role="alert"
                className="p-5 md:p-6 bg-red-50/80 border-2 border-red-300 rounded-2xl shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 text-peligro-600">
                    <IconAlert className="w-5 h-5" />
                    <h2 id="alertas-mermas-titulo" className="text-sm md:text-base font-bold text-peligro-600 tracking-tight">
                      RF04: Alertas de Mermas Superiores al 15% ({alertasMermaCritica.length} lotes afectados)
                    </h2>
                  </div>
                  <span className="text-xs font-medium text-red-800 bg-red-100/90 px-3 py-1 rounded-full border border-red-200">
                    Atención Inmediata Requerida
                  </span>
                </div>

                <p className="text-xs text-cacao-800">
                  Las siguientes etapas de procesamiento excedieron el umbral crítico de merma tolerado (15%). Revisa las causas técnicas identificadas:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {alertasMermaCritica.map((loteAlerta) => (
                    <div
                      key={loteAlerta.id}
                      className="bg-white p-4 rounded-xl border border-red-200 shadow-2xs flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-cacao-950 text-sm">
                          Lote: {loteAlerta.codigo}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-peligro-600 text-white">
                          {loteAlerta.merma_porcentaje}% de merma
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="text-cacao-800">
                          <strong>Etapa:</strong> {loteAlerta.merma_etapa || 'Secado y selección'}
                        </p>
                        <p className="text-cacao-600">
                          <strong>Origen:</strong> {loteAlerta.productor?.municipio}, Huila ({loteAlerta.productor?.nombre})
                        </p>
                        <p className="text-cacao-700 bg-red-50/50 p-2.5 rounded-lg border border-red-100 mt-1.5 leading-relaxed">
                          <strong className="text-peligro-600">Causa explicada:</strong>{' '}
                          {loteAlerta.merma_causa || 'Pérdida por humedad no evaporada y descarte de impurezas.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-end pt-1 border-t border-cacao-100">
                        <Link
                          to="/lotes"
                          className="text-xs font-semibold text-cacao-800 hover:text-cacao-950 underline"
                        >
                          Ver trazabilidad del lote →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}