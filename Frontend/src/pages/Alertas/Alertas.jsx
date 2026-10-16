import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { obtenerAlertasAdmin } from '../../services/adminService'
import { IconAlert, IconSearch, IconEye, IconCheck } from '../../component/Icons'

const TIPOS_ALERTAS = ['Todas', 'Merma', 'Costo', 'Registro Incompleto', 'Retraso']

export default function Alertas() {
  const [alertas] = useState(() => obtenerAlertasAdmin())
  const [filtroTipo, setFiltroTipo] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')

  const alertasFiltradas = useMemo(() => {
    return alertas.filter((a) => {
      const matchTipo = filtroTipo === 'Todas' || a.tipo.toLowerCase() === filtroTipo.toLowerCase()
      const matchBusqueda =
        !busqueda ||
        a.lote.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.causa.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.regla.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.etapa.toLowerCase().includes(busqueda.toLowerCase())

      return matchTipo && matchBusqueda
    })
  }, [alertas, filtroTipo, busqueda])

  const estiloPorTipo = (tipo) => {
    switch (tipo.toLowerCase()) {
      case 'merma':
        return 'bg-red-100 text-peligro-600 border-red-300'
      case 'costo':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'registro incompleto':
        return 'bg-amber-100 text-amber-900 border-amber-300'
      case 'retraso':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-cacao-100 text-cacao-800 border-cacao-300'
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-cacao-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-cacao-950 tracking-tight">
              RF04: Centro de Alertas y Desviaciones
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-peligro-600 border border-red-300">
              {alertas.length} Incidentes Detectados
            </span>
          </div>
          <p className="mt-1 text-sm text-cacao-700">
            Monitoreo en tiempo real de mermas críticas (&gt;15%), sobrecostos de acopio, retrasos y vacíos de registro.
          </p>
        </div>
      </header>

      {/* Barra de Filtros */}
      <section className="bg-white p-4 rounded-2xl border border-cacao-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs por Tipo */}
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_ALERTAS.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroTipo === tipo
                    ? 'bg-cacao-800 text-white shadow-2xs'
                    : 'bg-cacao-100/70 text-cacao-700 hover:bg-cacao-200'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por lote, etapa o causa..."
              className="w-full px-3 py-1.5 pl-8 bg-[#FDF8F5] border border-cacao-200 rounded-lg text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
            />
            <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-2 text-cacao-400" />
          </div>
        </div>
      </section>

      {/* Lista de Alertas Detallada (RF04) */}
      <section className="space-y-4">
        {alertasFiltradas.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-cacao-200">
            <IconCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-cacao-900">No hay alertas con estos filtros</p>
            <p className="text-xs text-cacao-600">Todas las variables agroindustriales operan en rango normal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {alertasFiltradas.map((alerta) => (
              <div
                key={alerta.id}
                className="bg-white p-5 rounded-2xl border border-cacao-200 shadow-2xs hover:shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider ${estiloPorTipo(
                        alerta.tipo
                      )}`}
                    >
                      {alerta.tipo}
                    </span>
                    <span className="font-mono font-bold text-base text-cacao-950">
                      Lote: {alerta.lote}
                    </span>
                    <span className="text-xs text-cacao-500">• Etapa: {alerta.etapa}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cacao-100 text-cacao-800">
                      {alerta.fecha}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-cacao-900 font-semibold flex items-center gap-1.5">
                      <span className="text-peligro-600 flex items-center gap-1"><IconAlert className="w-3.5 h-3.5" /> Regla infringida:</span>
                      <span>{alerta.regla}</span>
                      <span className="font-bold text-peligro-600">({alerta.valor_registrado})</span>
                    </p>

                    <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-100 text-cacao-800 leading-relaxed">
                      <strong>Causa técnica explicada:</strong> {alerta.causa}
                    </div>
                  </div>
                </div>

                {/* Acciones del Administrador */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-cacao-100">
                  <Link
                    to={`/admin/productos?lote=${alerta.lote}`}
                    className="px-4 py-2 bg-cacao-800 hover:bg-cacao-900 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <IconEye className="w-4 h-4" />
                    <span>Ver Lote en Productos</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
