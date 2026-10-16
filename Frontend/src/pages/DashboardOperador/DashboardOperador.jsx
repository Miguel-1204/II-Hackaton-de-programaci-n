import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { obtenerLotes } from '../../services/lotesService'
import { obtenerConteoAlertasCriticas } from '../../services/operadorService'
import { IconInbox, IconGear, IconSparkle, IconAlert } from '../../component/Icons'
import './DashboardOperador.css'

const formatKg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`

export default function DashboardOperador() {
  const { usuario } = useAuth()
  const [lotes, setLotes] = useState([])
  const [alertasCriticas, setAlertasCriticas] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let montado = true
    Promise.allSettled([obtenerLotes(), obtenerConteoAlertasCriticas()])
      .then(([lotesResult, alertasResult]) => {
        if (!montado) return
        if (lotesResult.status === 'fulfilled') setLotes(lotesResult.value)
        if (alertasResult.status === 'fulfilled') setAlertasCriticas(alertasResult.value)
      })
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
            <div className="bg-red-50/80 p-5 rounded-2xl border border-red-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-peligro-600 text-xs font-semibold uppercase tracking-wider">
                <span>ALERTAS CRÍTICAS</span>
                <IconAlert className="w-5 h-5 text-peligro-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-bold text-peligro-600">
                  {alertasCriticas ?? '—'}
                </span>
                <p className="text-xs text-red-700 mt-1">Alertas críticas abiertas</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
