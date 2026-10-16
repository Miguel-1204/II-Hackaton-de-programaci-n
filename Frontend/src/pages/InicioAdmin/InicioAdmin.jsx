import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { obtenerLotes, LOTES_INICIALES } from '../../services/lotesService'
import { obtenerAlertasAdmin, MOVIMIENTOS_RECIENTES } from '../../services/adminService'
import { IconAlert, IconRobot, IconInbox, IconGear, IconSparkle, IconMoney, IconPackage, IconClipboard, IconPin } from '../../component/Icons'

const formatKg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`
const formatCop = (n) => `$ ${Number(n ?? 0).toLocaleString('es-CO')} COP`

export default function InicioAdmin() {
  const { usuario } = useAuth()
  const [lotes, setLotes] = useState(LOTES_INICIALES)
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let montado = true
    async function cargar() {
      try {
        const [lotesData, alertasData] = await Promise.all([
          obtenerLotes(),
          Promise.resolve(obtenerAlertasAdmin())
        ])
        if (montado) {
          setLotes(lotesData && lotesData.length > 0 ? lotesData : LOTES_INICIALES)
          setAlertas(alertasData)
        }
      } catch {
        if (montado) {
          setLotes(LOTES_INICIALES)
          setAlertas(obtenerAlertasAdmin())
        }
      } finally {
        if (montado) setCargando(false)
      }
    }
    cargar()
    return () => {
      montado = false
    }
  }, [])

  // Métricas de inventario RF08 y economía RF05
  const metricas = useMemo(() => {
    const totalRecibido = lotes.reduce((acc, l) => acc + Number(l.cantidad_recibida ?? 0), 0)
    const totalConsumido = lotes.reduce((acc, l) => acc + Number(l.cantidad_consumida ?? 0), 0)
    const totalDisponible = lotes.reduce((acc, l) => acc + Number(l.cantidad_disponible ?? 0), 0)
    const valorizacionTotal = lotes.reduce(
      (acc, l) => acc + Number(l.cantidad_disponible ?? 0) * Number(l.costo_unitario ?? 0),
      0
    )
    const alertasCriticas = alertas.filter((a) => a.severidad === 'alta' || a.tipo === 'Merma').length

    return {
      totalRecibido,
      totalConsumido,
      totalDisponible,
      valorizacionTotal,
      alertasCriticas,
      totalLotes: lotes.length
    }
  }, [lotes, alertas])

  // Distribución de inventario disponible por municipio del Huila para el mini-gráfico
  const stockPorMunicipio = useMemo(() => {
    const mapa = {}
    lotes.forEach((l) => {
      const mun = l.productor?.municipio || 'Otros'
      mapa[mun] = (mapa[mun] || 0) + Number(l.cantidad_disponible ?? 0)
    })
    const maxVal = Math.max(...Object.values(mapa), 1)
    return Object.entries(mapa).map(([municipio, total]) => ({
      municipio,
      total,
      porcentaje: Math.round((total / maxVal) * 100)
    }))
  }, [lotes])

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-cacao-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-cacao-950 tracking-tight">
              Control General de Trazabilidad y Calidad
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-mazorca-500/20 text-cacao-800 border border-mazorca-500/40">
              Admin Huila
            </span>
          </div>
          <p className="mt-1 text-sm text-cacao-700">
            Bienvenido, {usuario?.nombre || 'Administrador Demo'}. Supervisión estratégica de inventario, costos, mermas y auditoría.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/alertas"
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-peligro-600 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <IconAlert className="w-4 h-4" />
            <span>{metricas.alertasCriticas} Alertas Pendientes</span>
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('abrir-consultas-nlp'))}
            className="px-3.5 py-2 rounded-xl bg-cacao-800 hover:bg-cacao-900 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <IconRobot className="w-4 h-4" />
            <span>Consultas Inteligentes</span>
          </button>
        </div>
      </header>

      {/* KPIS (RF04, RF05, RF08) */}
      <section aria-label="KPIs del Administrador" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Recibido */}
        <div className="bg-white p-4 rounded-2xl border border-cacao-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-cacao-600 text-[11px] font-bold uppercase tracking-wider">
            <span>TOTAL RECIBIDO</span>
            <IconInbox className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-cacao-950">
            {cargando ? '...' : formatKg(metricas.totalRecibido)}
          </p>
          <span className="text-[11px] text-cacao-500">{metricas.totalLotes} lotes acopiados</span>
        </div>

        {/* Consumido */}
        <div className="bg-white p-4 rounded-2xl border border-cacao-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-cacao-600 text-[11px] font-bold uppercase tracking-wider">
            <span>CONSUMIDO</span>
            <IconGear className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-cacao-700">
            {cargando ? '...' : formatKg(metricas.totalConsumido)}
          </p>
          <span className="text-[11px] text-cacao-500">Molienda y selección</span>
        </div>

        {/* Disponible Bodega */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
            <span>DISPONIBLE BODEGA</span>
            <IconSparkle className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {cargando ? '...' : formatKg(metricas.totalDisponible)}
          </p>
          <span className="text-[11px] text-emerald-700">Existencia utilizable</span>
        </div>

        {/* Alertas Críticas (RF04) */}
        <Link
          to="/admin/alertas"
          className="bg-red-50/80 hover:bg-red-100/80 p-4 rounded-2xl border border-red-200 shadow-2xs transition group"
        >
          <div className="flex items-center justify-between text-peligro-600 text-[11px] font-bold uppercase tracking-wider">
            <span>ALERTAS CRÍTICAS</span>
            <IconAlert className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-bold text-peligro-600">
            {cargando ? '...' : metricas.alertasCriticas}
          </p>
          <span className="text-[11px] text-red-700 underline font-medium">Revisar detalles →</span>
        </Link>

        {/* Valorización Inventario (RF05) */}
        <div className="col-span-2 lg:col-span-1 bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-900 text-[11px] font-bold uppercase tracking-wider">
            <span>VALORIZACIÓN COP</span>
            <IconMoney className="w-4 h-4" />
          </div>
          <p className="mt-2 text-xl font-black text-amber-950">
            {cargando ? '...' : formatCop(metricas.valorizacionTotal)}
          </p>
          <span className="text-[11px] text-amber-800">Costo base en almacén</span>
        </div>
      </section>

      {/* DISTRIBUCIÓN TERRITORIAL Y MOVIMIENTOS RECIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Simple: Disponibilidad por Municipio */}
        <section
          aria-labelledby="stock-municipio-titulo"
          className="bg-white p-5 rounded-2xl border border-cacao-200 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 id="stock-municipio-titulo" className="text-sm font-bold text-cacao-900 uppercase tracking-wider flex items-center gap-2">
              <IconPin className="w-4 h-4" /> Existencias Disponibles por Municipio (Huila)
            </h2>
            <span className="text-xs text-cacao-500">kg en almacén</span>
          </div>

          <div className="space-y-3 pt-2">
            {stockPorMunicipio.map((item) => (
              <div key={item.municipio} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-cacao-800">
                  <span>{item.municipio}</span>
                  <span>{formatKg(item.total)}</span>
                </div>
                <div className="w-full bg-cacao-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-cacao-800 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Últimos Movimientos de Inventario */}
        <section
          aria-labelledby="movimientos-titulo"
          className="bg-white p-5 rounded-2xl border border-cacao-200 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 id="movimientos-titulo" className="text-sm font-bold text-cacao-900 uppercase tracking-wider flex items-center gap-2">
              <IconClipboard className="w-4 h-4" /> Últimos Movimientos Registrados
            </h2>
            <Link to="/admin/auditoria" className="text-xs text-cacao-700 hover:text-cacao-950 underline font-medium">
              Ver todos
            </Link>
          </div>

          <div className="divide-y divide-cacao-100 text-xs">
            {MOVIMIENTOS_RECIENTES.map((mov) => (
              <div key={mov.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-cacao-900 truncate">
                    {mov.lote} • {mov.operacion}
                  </p>
                  <p className="text-[11px] text-cacao-500 truncate">
                    {mov.fecha} • {mov.destino}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      mov.tipo === 'Bloqueo'
                        ? 'bg-red-100 text-peligro-600'
                        : mov.tipo === 'Transformación'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {mov.cantidad}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
