import { useState, useEffect, useMemo } from 'react'
import BadgeEstado from '../../component/BadgeEstado'
import ModalDetalleLote from './ModalDetalleLote'
import {
  LOTES_INICIALES,
  MUNICIPIOS_HUILA,
  obtenerLotes
} from '../../services/lotesService'

const formatKg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`

/**
 * Componente Lotes.jsx
 * Vista exclusiva de Operador para consulta de Inventario y Trazabilidad por Lote
 * Cumple: RF08 (Cálculo inventario), RF11 (Filtros y Exportación CSV)
 */
export default function Lotes() {
  const [lotes, setLotes] = useState(LOTES_INICIALES)
  const [cargando, setCargando] = useState(true)
  const [mensajeToast, setMensajeToast] = useState(null)

  // Filtros (RF11)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMunicipio, setFiltroMunicipio] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Modal para ver trazabilidad del lote
  const [loteParaDetalle, setLoteParaDetalle] = useState(null)

  // Carga de lotes
  useEffect(() => {
    let montado = true
    async function cargar() {
      setCargando(true)
      try {
        const datos = await obtenerLotes()
        if (montado) setLotes(datos && datos.length > 0 ? datos : LOTES_INICIALES)
      } catch (e) {
        console.error('Error al cargar lotes:', e)
        if (montado) setLotes(LOTES_INICIALES)
      } finally {
        if (montado) setCargando(false)
      }
    }
    cargar()
    return () => {
      montado = false
    }
  }, [])

  const mostrarToast = (texto, tipo = 'exito') => {
    setMensajeToast({ texto, tipo })
    setTimeout(() => {
      setMensajeToast(null)
    }, 4000)
  }

  // RF11: Filtrado de lotes
  const lotesFiltrados = useMemo(() => {
    return lotes.filter((l) => {
      const matchBusqueda =
        !busqueda ||
        l.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.productor?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.productor?.municipio.toLowerCase().includes(busqueda.toLowerCase()) ||
        (l.tipo_material && l.tipo_material.toLowerCase().includes(busqueda.toLowerCase()))

      const matchMunicipio =
        filtroMunicipio === 'todos' ||
        (l.productor?.municipio || '').toLowerCase() === filtroMunicipio.toLowerCase()

      const matchEstado =
        filtroEstado === 'todos' ||
        (l.estado || '').toLowerCase() === filtroEstado.toLowerCase()

      return matchBusqueda && matchMunicipio && matchEstado
    })
  }, [lotes, busqueda, filtroMunicipio, filtroEstado])

  // RF11: Exportación CSV con codificación UTF-8 + BOM
  const handleExportarCSV = () => {
    if (lotesFiltrados.length === 0) {
      mostrarToast('No hay datos en el filtro para exportar', 'error')
      return
    }

    const headers = [
      'Codigo',
      'Tipo de Material',
      'Productor',
      'Municipio',
      'Fecha Recepcion',
      'Cantidad Recibida (kg)',
      'Cantidad Consumida (kg)',
      'Cantidad Disponible (kg)',
      'Estado',
      'Merma (%)',
      'Etapa Merma',
      'Causa de Merma'
    ]

    const rows = lotesFiltrados.map((l) => {
      const fila = [
        `"${l.codigo}"`,
        `"${l.tipo_material || ''}"`,
        `"${l.productor?.nombre || ''}"`,
        `"${l.productor?.municipio || ''}"`,
        `"${l.fecha_recepcion || ''}"`,
        l.cantidad_recibida ?? 0,
        l.cantidad_consumida ?? 0,
        l.cantidad_disponible ?? 0,
        `"${l.estado || ''}"`,
        l.merma_porcentaje ?? 0,
        `"${l.merma_etapa || ''}"`,
        `"${(l.merma_causa || '').replace(/"/g, '""')}"`
      ]
      return fila.join(';')
    })

    const contenidoCSV = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fechaStr = new Date().toISOString().split('T')[0]
    link.setAttribute('href', url)
    link.setAttribute('download', `trazabilidad_lotes_huila_${fechaStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    mostrarToast(`Se descargó el archivo con ${lotesFiltrados.length} lotes filtrados.`)
  }

  return (
    <div className="min-h-screen bg-[#FDF8F5] text-cacao-950 font-sans p-4 md:p-8 space-y-6">
      {/* Toast Feedback */}
      {mensajeToast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-3 toast-enter ${
            mensajeToast.tipo === 'error'
              ? 'bg-red-50 text-peligro-600 border-red-300'
              : 'bg-cacao-900 text-cacao-50 border-cacao-700'
          }`}
        >
          <span>{mensajeToast.tipo === 'error' ? '❌' : '✅'}</span>
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* RF11: FILTROS DE TRAZABILIDAD E INVENTARIO */}
      <section
        aria-label="Filtros de lotes"
        className="bg-white p-5 rounded-2xl border border-cacao-200/90 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔍</span>
            <h2 className="text-sm font-bold text-cacao-900 uppercase tracking-wider">
              RF11: FILTROS DE TRAZABILIDAD E INVENTARIO
            </h2>
          </div>

          {/* Botón Exportar CSV (RF11) */}
          <button
            type="button"
            onClick={handleExportarCSV}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs md:text-sm font-semibold rounded-lg shadow-2xs hover:shadow-xs transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            title="Exportar archivo CSV con los datos actualmente filtrados"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Exportar CSV ({lotesFiltrados.length})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Búsqueda por texto */}
          <div>
            <label htmlFor="busqueda-lote" className="block text-[11px] font-bold text-cacao-800 uppercase tracking-wide mb-1.5">
              BUSCAR POR LOTE O PRODUCTOR
            </label>
            <div className="relative">
              <input
                id="busqueda-lote"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej. CAC001, Rivera, Silva..."
                className="w-full px-3 py-2.5 pl-9 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-3 text-cacao-400 text-xs">🔎</span>
            </div>
          </div>

          {/* Filtro por Municipio (Huila) */}
          <div>
            <label htmlFor="filtro-municipio" className="block text-[11px] font-bold text-cacao-800 uppercase tracking-wide mb-1.5">
              ORIGEN (MUNICIPIO DEL HUILA)
            </label>
            <select
              id="filtro-municipio"
              value={filtroMunicipio}
              onChange={(e) => setFiltroMunicipio(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
            >
              <option value="todos">Todos los municipios</option>
              {MUNICIPIOS_HUILA.map((mun) => (
                <option key={mun} value={mun}>
                  {mun}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label htmlFor="filtro-estado" className="block text-[11px] font-bold text-cacao-800 uppercase tracking-wide mb-1.5">
              ESTADO DE LIBERACIÓN
            </label>
            <select
              id="filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="liberado">Liberado</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
        </div>

        {/* Resumen del filtro */}
        {(busqueda || filtroMunicipio !== 'todos' || filtroEstado !== 'todos') && (
          <div className="flex items-center justify-between text-xs text-cacao-600 pt-1">
            <span>
              Filtrando: <strong>{lotesFiltrados.length}</strong> de {lotes.length} lotes encontrados.
            </span>
            <button
              type="button"
              onClick={() => {
                setBusqueda('')
                setFiltroMunicipio('todos')
                setFiltroEstado('todos')
              }}
              className="text-cacao-800 hover:text-cacao-950 underline font-medium cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

      {/* RF08: TABLA DE INVENTARIO Y TRAZABILIDAD POR LOTE */}
      <section aria-labelledby="tabla-lotes-titulo" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="tabla-lotes-titulo" className="text-lg md:text-xl font-bold text-cacao-950 font-display">
            Inventario y Trazabilidad por Lote
          </h2>
          <span className="text-xs text-cacao-600 font-medium">
            {lotesFiltrados.length} {lotesFiltrados.length === 1 ? 'lote listado' : 'lotes listados'}
          </span>
        </div>

        {cargando ? (
          <div className="p-12 text-center text-cacao-600 bg-white rounded-2xl border border-cacao-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cacao-300 border-t-cacao-800 mb-3" />
            <p className="text-sm">Cargando inventario de lotes cacaoteros…</p>
          </div>
        ) : lotesFiltrados.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-cacao-200 space-y-2">
            <span className="text-3xl">📦</span>
            <h3 className="text-base font-bold text-cacao-900">No se encontraron lotes</h3>
            <p className="text-xs text-cacao-600 max-w-md mx-auto">
              No hay registros que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          <>
            {/* VISTA ESCRITORIO (TABLA) */}
            <div className="hidden md:block bg-white rounded-2xl border border-cacao-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#2A1810] text-cacao-50 text-xs uppercase tracking-wider font-bold">
                      <th scope="col" className="py-4 px-5">LOTE</th>
                      <th scope="col" className="py-4 px-5">ORIGEN / PRODUCTOR</th>
                      <th scope="col" className="py-4 px-5 text-right">RECIBIDO</th>
                      <th scope="col" className="py-4 px-5 text-right">CONSUMIDO</th>
                      <th scope="col" className="py-4 px-5 text-right">DISPONIBLE</th>
                      <th scope="col" className="py-4 px-5 text-center">MERMA</th>
                      <th scope="col" className="py-4 px-5 text-center">ESTADO</th>
                      <th scope="col" className="py-4 px-5 text-center">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cacao-100 text-cacao-900 text-xs">
                    {lotesFiltrados.map((lote) => {
                      const mermaAlerta = Number(lote.merma_porcentaje ?? 0) > 15
                      const disponibleCero = Number(lote.cantidad_disponible ?? 0) === 0
                      return (
                        <tr
                          key={lote.id}
                          className="hover:bg-cacao-50/60 transition-colors"
                        >
                          {/* LOTE */}
                          <td className="py-4 px-5 font-bold text-cacao-950">
                            <span className="font-mono text-sm block">{lote.codigo}</span>
                            <span className="font-sans font-normal text-[11px] text-cacao-500">
                              {lote.fecha_recepcion}
                            </span>
                          </td>

                          {/* ORIGEN / PRODUCTOR */}
                          <td className="py-4 px-5">
                            <span className="font-bold text-cacao-950 block">
                              {lote.productor?.municipio}, Huila
                            </span>
                            <span className="text-cacao-600 block text-[11px]">
                              {lote.productor?.nombre}
                            </span>
                          </td>

                          {/* RECIBIDO */}
                          <td className="py-4 px-5 text-right font-medium text-cacao-900">
                            {formatKg(lote.cantidad_recibida)}
                          </td>

                          {/* CONSUMIDO */}
                          <td className="py-4 px-5 text-right text-cacao-600">
                            {formatKg(lote.cantidad_consumida)}
                          </td>

                          {/* DISPONIBLE */}
                          <td className="py-4 px-5 text-right font-bold">
                            {disponibleCero ? (
                              <span className="line-through text-cacao-400">0 kg</span>
                            ) : (
                              <span className="text-emerald-800 font-extrabold">
                                {formatKg(lote.cantidad_disponible)}
                              </span>
                            )}
                          </td>

                          {/* MERMA */}
                          <td className="py-4 px-5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                mermaAlerta
                                  ? 'bg-red-100 text-peligro-600 border border-red-200'
                                  : 'bg-cacao-100 text-cacao-700'
                              }`}
                            >
                              {lote.merma_porcentaje}%
                            </span>
                          </td>

                          {/* ESTADO */}
                          <td className="py-4 px-5 text-center">
                            <BadgeEstado estado={lote.estado} />
                          </td>

                          {/* ACCIONES */}
                          <td className="py-4 px-5 text-center">
                            <button
                              type="button"
                              onClick={() => setLoteParaDetalle(lote)}
                              className="px-3.5 py-1 rounded-md border border-cacao-300 bg-white hover:bg-cacao-100 text-cacao-800 font-semibold transition cursor-pointer text-xs shadow-2xs"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* VISTA MÓVIL (TARJETAS APILADAS) */}
            <div className="block md:hidden space-y-3">
              {lotesFiltrados.map((lote) => {
                const mermaAlerta = Number(lote.merma_porcentaje ?? 0) > 15
                const disponibleCero = Number(lote.cantidad_disponible ?? 0) === 0
                return (
                  <div
                    key={lote.id}
                    className="bg-white p-4 rounded-xl border border-cacao-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-cacao-100 pb-2">
                      <div>
                        <span className="font-mono font-bold text-base text-cacao-950">
                          {lote.codigo}
                        </span>
                        <span className="text-xs text-cacao-500 block">
                          {lote.fecha_recepcion}
                        </span>
                      </div>
                      <BadgeEstado estado={lote.estado} />
                    </div>

                    <div className="text-xs text-cacao-800 space-y-0.5">
                      <p>
                        <strong>Origen:</strong> {lote.productor?.municipio}, Huila
                      </p>
                      <p>
                        <strong>Productor:</strong> {lote.productor?.nombre}
                      </p>
                    </div>

                    {/* Inventario RF08 */}
                    <div className="grid grid-cols-3 gap-2 bg-[#FDF8F5] p-2.5 rounded-lg border border-cacao-100 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-cacao-500 block">Recibido</span>
                        <span className="font-bold text-cacao-900">{formatKg(lote.cantidad_recibida)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-cacao-500 block">Consumido</span>
                        <span className="font-medium text-cacao-700">{formatKg(lote.cantidad_consumida)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-800 font-semibold block">Disponible</span>
                        {disponibleCero ? (
                          <span className="line-through text-cacao-400 font-bold">0 kg</span>
                        ) : (
                          <span className="font-extrabold text-emerald-900">{formatKg(lote.cantidad_disponible)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <span className="text-cacao-600 mr-1">Merma:</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full ${
                            mermaAlerta
                              ? 'bg-red-100 text-peligro-600 font-bold'
                              : 'bg-cacao-100 text-cacao-800'
                          }`}
                        >
                          {lote.merma_porcentaje}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoteParaDetalle(lote)}
                        className="px-4 py-1.5 bg-white border border-cacao-300 hover:bg-cacao-50 text-cacao-800 font-semibold rounded-lg text-xs transition cursor-pointer"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Modal Detalle Lote (Solo lectura para Operador) */}
      <ModalDetalleLote
        abierto={Boolean(loteParaDetalle)}
        lote={loteParaDetalle}
        alCerrar={() => setLoteParaDetalle(null)}
        esAdmin={false}
      />
    </div>
  )
}
