import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import BadgeEstado from '../../component/BadgeEstado'
import ModalDetalleLote from '../Lotes/ModalDetalleLote'
import {
  MUNICIPIOS_HUILA,
  obtenerLotes,
  persistirLotesDemo,
  cambiarEstadoLote
} from '../../services/lotesService'
import { registrarAuditoria, descargarCSV } from '../../services/adminService'
import { IconCheck, IconX, IconSearch, IconEmergency, IconEye, IconLock, IconUnlock, IconAlert, IconDownload } from '../../component/Icons'

const formatKg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`
const formatCop = (n) => `$ ${Number(n ?? 0).toLocaleString('es-CO')} COP`

export default function Productos() {
  const [searchParams] = useSearchParams()
  const loteUrlParam = searchParams.get('lote')

  const [lotes, setLotes] = useState([])
  const [cargando, setCargando] = useState(true)

  // Filtros RF11
  const [busqueda, setBusqueda] = useState(loteUrlParam || '')
  const [filtroMunicipio, setFiltroMunicipio] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Modales
  const [loteParaDetalle, setLoteParaDetalle] = useState(null)
  const [loteParaCambioEstado, setLoteParaCambioEstado] = useState(null)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [nuevoEstadoSeleccionado, setNuevoEstadoSeleccionado] = useState('Bloqueado')
  const [errorMotivo, setErrorMotivo] = useState('')
  const [mensajeToast, setMensajeToast] = useState(null)

  useEffect(() => {
    let montado = true
    async function cargar() {
      try {
        const datos = await obtenerLotes()
        if (montado) setLotes(datos)
      } catch {
        if (montado) setLotes([])
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
    setTimeout(() => setMensajeToast(null), 4000)
  }

  // Filtrado de lotes RF11
  const lotesFiltrados = useMemo(() => {
    return lotes.filter((l) => {
      const matchBusqueda =
        !busqueda ||
        l.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.productor?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.productor?.municipio.toLowerCase().includes(busqueda.toLowerCase())

      const matchMunicipio =
        filtroMunicipio === 'todos' ||
        (l.productor?.municipio || '').toLowerCase() === filtroMunicipio.toLowerCase()

      const matchEstado =
        filtroEstado === 'todos' ||
        (l.estado || '').toLowerCase() === filtroEstado.toLowerCase()

      return matchBusqueda && matchMunicipio && matchEstado
    })
  }, [lotes, busqueda, filtroMunicipio, filtroEstado])

  // Exportar CSV (RF11) con las columnas requeridas:
  // Código, Origen, Recibido, Consumido, Disponible, Estado, Costo Unitario
  const handleExportarCSV = () => {
    if (lotesFiltrados.length === 0) {
      mostrarToast('No hay datos para exportar con los filtros actuales', 'error')
      return
    }

    const cabeceras = [
      'Codigo',
      'Origen',
      'Recibido',
      'Consumido',
      'Disponible',
      'Estado',
      'Costo Unitario'
    ]

    const filas = lotesFiltrados.map((l) => [
      `"${l.codigo}"`,
      `"${l.productor?.municipio || ''}, Huila (${l.productor?.nombre || ''})"`,
      l.cantidad_recibida ?? 0,
      l.cantidad_consumida ?? 0,
      l.cantidad_disponible ?? 0,
      `"${l.estado || ''}"`,
      l.costo_unitario ?? 0
    ])

    const fechaStr = new Date().toISOString().split('T')[0]
    descargarCSV(`lotes_administrador_huila_${fechaStr}.csv`, cabeceras, filas)
    mostrarToast(`Se descargó el CSV con ${lotesFiltrados.length} lotes.`)
  }

  // Abrir modal de bloqueo / liberación (RF09)
  const abrirModalEstado = (lote, accionSugerida) => {
    setLoteParaCambioEstado(lote)
    setNuevoEstadoSeleccionado(accionSugerida || (lote.estado.toUpperCase() === 'BLOQUEADO' ? 'Liberado' : 'Bloqueado'))
    setMotivoCambio('')
    setErrorMotivo('')
  }

  // Confirmar cambio de estado (RF09 y Caso Incidencia Hora 12)
  const handleConfirmarEstado = async (e) => {
    e.preventDefault()
    setErrorMotivo('')

    if (!motivoCambio.trim() || motivoCambio.trim().length < 6) {
      setErrorMotivo('El motivo es obligatorio (mínimo 6 caracteres) para cumplir la norma de auditoría.')
      return
    }

    const loteAfectado = loteParaCambioEstado
    const estadoPrevio = loteAfectado.estado
    const nuevoEstado = nuevoEstadoSeleccionado
    try {
      await cambiarEstadoLote(loteAfectado.id, nuevoEstado, motivoCambio.trim())
    } catch (error) {
      setErrorMotivo(error.message)
      return
    }
    const fechaActual = new Date().toISOString().replace('T', ' ').substring(0, 16)

    const nuevaLista = lotes.map((item) => {
      if (item.id === loteAfectado.id) {
        const histPrevio = item.historial_estados || []
        const nuevaEntrada = {
          id: Date.now(),
          estado_anterior: estadoPrevio,
          estado_nuevo: nuevoEstado,
          fecha: fechaActual,
          usuario: 'Ing. María Gómez (Admin)',
          motivo: motivoCambio.trim()
        }
        return {
          ...item,
          estado: nuevoEstado,
          historial_estados: [nuevaEntrada, ...histPrevio]
        }
      }
      return item
    })

    setLotes(nuevaLista)
    persistirLotesDemo(nuevaLista)

    // Registrar en auditoría global inmutable (RF10)
    registrarAuditoria({
      id: Date.now(),
      fecha: fechaActual,
      usuario: 'Ing. María Gómez (Admin)',
      entidad: `Lote ${loteAfectado.codigo}`,
      operacion: nuevoEstado === 'Bloqueado' ? 'Bloqueo de Lote' : 'Liberación de Lote',
      valor_anterior: estadoPrevio,
      valor_nuevo: nuevoEstado,
      motivo: motivoCambio.trim()
    })

    mostrarToast(`Lote ${loteAfectado.codigo} cambiado a ${nuevoEstado} exitosamente.`)
    setLoteParaCambioEstado(null)
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {mensajeToast && (
        <div
          role="status"
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-3 toast-enter ${
            mensajeToast.tipo === 'error'
              ? 'bg-red-50 text-peligro-600 border-red-300'
              : 'bg-cacao-900 text-cacao-50 border-cacao-700'
          }`}
        >
          <span>{mensajeToast.tipo === 'error'
            ? <IconX className="w-4 h-4 text-peligro-600" />
            : <IconCheck className="w-4 h-4 text-emerald-400" />}</span>
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-cacao-200">
        <div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-cacao-950 tracking-tight">
              Gestión de Lotes, Trazabilidad y Calidad
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cacao-100 text-cacao-800 border border-cacao-300">
              RF03, RF09, RF11
            </span>
          </div>
          <p className="mt-1 text-sm text-cacao-700">
            Control de inventarios, valorización de materias primas y gestión de estados con motivo obligatorio.
          </p>
        </div>

        {/* Botón Exportar CSV (RF11) */}
        <button
          type="button"
          onClick={handleExportarCSV}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs md:text-sm font-semibold rounded-xl shadow-2xs hover:shadow-sm transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <IconDownload className="w-4 h-4" />
          <span>Exportar CSV ({lotesFiltrados.length})</span>
        </button>
      </header>

      {/* BANNER ESPECIAL: SIMULADOR DE INCIDENCIA HORA 12 */}
      <section className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <IconEmergency className="w-6 h-6 text-peligro-600" />
          <div>
            <h3 className="text-xs font-bold text-peligro-600 uppercase tracking-wide">
              Incidencia de Calidad - Hora 12 (Hackathon)
            </h3>
            <p className="text-xs text-cacao-800">
              Puedes bloquear inmediatamente el lote <strong>CAC001</strong> para simular la detección de merma crítica y registrar la justificación en auditoría.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const cac001 = lotes.find((l) => l.codigo === 'CAC001')
            if (cac001) {
              abrirModalEstado(cac001, 'Bloqueado')
              setMotivoCambio('Incidencia Hora 12: Detección de merma del 20% en secado por humedad residual y granos partidos.')
            }
          }}
          className="px-3.5 py-1.5 rounded-lg bg-peligro-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shadow-2xs"
        >
          🔒 Bloquear CAC001 (Incidencia)
        </button>
      </section>

      {/* FILTROS RF11 */}
      <section className="bg-white p-5 rounded-2xl border border-cacao-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cacao-900 uppercase tracking-wider flex items-center gap-2">
            <IconSearch className="w-4 h-4 text-cacao-500" /> Filtros Avanzados de Inventario
          </span>
          {(busqueda || filtroMunicipio !== 'todos' || filtroEstado !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('')
                setFiltroMunicipio('todos')
                setFiltroEstado('todos')
              }}
              className="text-xs text-cacao-700 hover:text-cacao-950 underline font-medium cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Buscar */}
          <div>
            <label className="block text-[11px] font-bold text-cacao-800 uppercase tracking-wide mb-1">
              Buscar Código o Productor
            </label>
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej. CAC001, Rivera, Silva..."
                className="w-full px-3 py-2 pl-9 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2.5 text-cacao-400 text-xs">🔎</span>
            </div>
          </div>

          {/* Municipio */}
          <div>
            <label className="block text-[11px] font-bold text-cacao-800 uppercase tracking-wide mb-1">
              Municipio de Origen (Huila)
            </label>
            <select
              value={filtroMunicipio}
              onChange={(e) => setFiltroMunicipio(e.target.value)}
              className="w-full px-3 py-2 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
            >
              <option value="todos">Todos los municipios</option>
              {MUNICIPIOS_HUILA.map((mun) => (
                <option key={mun} value={mun}>
                  {mun}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-[11px] font-bold text-cacao-800 uppercase tracking-wide mb-1">
              Estado de Calidad
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="liberado">Liberado</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
        </div>
      </section>

      {/* TABLA DE PRODUCTOS Y LOTES PARA EL ADMINISTRADOR */}
      <section className="bg-white rounded-2xl border border-cacao-200 shadow-2xs overflow-hidden space-y-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#2A1810] text-cacao-50 text-[11px] uppercase tracking-wider font-bold">
                <th scope="col" className="py-3.5 px-4">Código</th>
                <th scope="col" className="py-3.5 px-4">Origen / Productor</th>
                <th scope="col" className="py-3.5 px-4 text-right">Recibido</th>
                <th scope="col" className="py-3.5 px-4 text-right">Consumido</th>
                <th scope="col" className="py-3.5 px-4 text-right">Disponible</th>
                <th scope="col" className="py-3.5 px-4 text-center">Merma</th>
                <th scope="col" className="py-3.5 px-4 text-right">Costo Unitario</th>
                <th scope="col" className="py-3.5 px-4 text-center">Estado</th>
                <th scope="col" className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cacao-100 text-cacao-900">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-cacao-500">
                    Cargando inventario de lotes...
                  </td>
                </tr>
              ) : lotesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-cacao-500">
                    No se encontraron lotes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                lotesFiltrados.map((lote) => {
                  const esBloqueado = lote.estado === 'Bloqueado'
                  const mermaAlerta = Number(lote.merma_porcentaje ?? 0) > 15
                  return (
                    <tr key={lote.id} className="hover:bg-cacao-50/70 transition-colors">
                      {/* Código */}
                      <td className="py-3 px-4 font-mono font-bold text-cacao-950">
                        {lote.codigo}
                        <span className="block font-sans font-normal text-[10px] text-cacao-500">
                          {lote.fecha_recepcion}
                        </span>
                      </td>

                      {/* Origen */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-cacao-950 block">
                          {lote.productor?.municipio}, Huila
                        </span>
                        <span className="text-cacao-600 text-[11px] block">
                          {lote.productor?.nombre}
                        </span>
                      </td>

                      {/* Recibido */}
                      <td className="py-3 px-4 text-right font-medium">
                        {formatKg(lote.cantidad_recibida)}
                      </td>

                      {/* Consumido */}
                      <td className="py-3 px-4 text-right text-cacao-600">
                        {formatKg(lote.cantidad_consumida)}
                      </td>

                      {/* Disponible */}
                      <td className="py-3 px-4 text-right font-bold">
                        {Number(lote.cantidad_disponible) === 0 ? (
                          <span className="line-through text-cacao-400">0 kg</span>
                        ) : (
                          <span className="text-emerald-800 font-extrabold">
                            {formatKg(lote.cantidad_disponible)}
                          </span>
                        )}
                      </td>

                      {/* Merma */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            mermaAlerta
                              ? 'bg-red-100 text-peligro-600 border border-red-200'
                              : 'bg-cacao-100 text-cacao-700'
                          }`}
                        >
                          {lote.merma_porcentaje}%
                        </span>
                      </td>

                      {/* Costo Unitario (Exclusivo Administrador) */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-cacao-800">
                        {formatCop(lote.costo_unitario)}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <BadgeEstado estado={lote.estado} />
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* RF03: Ver Trazabilidad */}
                        <button
                          type="button"
                          onClick={() => setLoteParaDetalle(lote)}
                          className="px-2.5 py-1 rounded-md border border-cacao-300 bg-white hover:bg-cacao-100 text-cacao-800 font-semibold transition cursor-pointer text-xs flex items-center gap-1.5"
                          title="Ver recorrido y ficha técnica completa"
                        >
                          <IconEye className="w-3.5 h-3.5" /> Ver Trazabilidad
                        </button>

                        {/* RF09: Bloquear / Liberar con motivo obligatorio */}
                        <button
                          type="button"
                          onClick={() => abrirModalEstado(lote, esBloqueado ? 'Liberado' : 'Bloqueado')}
                          className={`px-2.5 py-1 rounded-md text-white font-semibold transition cursor-pointer text-xs ${
                            esBloqueado
                              ? 'bg-emerald-700 hover:bg-emerald-800'
                              : 'bg-peligro-600 hover:bg-red-700'
                          }`}
                          title="Gestionar estado con justificación obligatoria"
                        >
                          {esBloqueado
                            ? <><IconUnlock className="w-3.5 h-3.5 inline mr-1" />Liberar</>
                            : <><IconLock className="w-3.5 h-3.5 inline mr-1" />Bloquear</>}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DETALLE DE TRAZABILIDAD (RF03) */}
      <ModalDetalleLote
        abierto={Boolean(loteParaDetalle)}
        lote={loteParaDetalle}
        alCerrar={() => setLoteParaDetalle(null)}
        esAdmin={true}
        alAbrirGestionEstado={(lote) => abrirModalEstado(lote)}
      />

      {/* MODAL CAMBIAR ESTADO CON MOTIVO OBLIGATORIO (RF09) */}
      {loteParaCambioEstado && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-cacao-950/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-lg max-h-[94dvh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-cacao-200 my-auto">
            <div
              className={`flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 text-white ${
                nuevoEstadoSeleccionado === 'Bloqueado' ? 'bg-peligro-600' : 'bg-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {nuevoEstadoSeleccionado === 'Bloqueado'
                  ? <IconLock className="w-5 h-5" />
                  : <IconUnlock className="w-5 h-5" />}
                <div>
                  <h2 className="text-base font-bold font-display text-white">
                    RF09: {nuevoEstadoSeleccionado === 'Bloqueado' ? 'Bloquear Lote' : 'Liberar Lote'} ({loteParaCambioEstado.codigo})
                  </h2>
                  <p className="text-xs text-white/80">
                    Acción obligatoria con justificación técnica para auditoría
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoteParaCambioEstado(null)}
                className="text-white hover:bg-white/20 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmarEstado} className="p-3 sm:p-6 bg-[#FDF8F5] space-y-4">
              {errorMotivo && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-peligro-600 font-semibold flex items-center gap-2">
                  <IconAlert className="w-3.5 h-3.5" /> {errorMotivo}
                </div>
              )}

              <div className="p-3 bg-white border border-cacao-200 rounded-xl text-xs space-y-1">
                <p>
                  <strong>Lote:</strong> {loteParaCambioEstado.codigo} • {loteParaCambioEstado.tipo_material}
                </p>
                <p>
                  <strong>Origen:</strong> {loteParaCambioEstado.productor?.municipio}, Huila
                </p>
                <p>
                  <strong>Estado actual:</strong> {loteParaCambioEstado.estado} ➔{' '}
                  <strong className="text-cacao-900 font-bold uppercase">{nuevoEstadoSeleccionado}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-cacao-800 uppercase tracking-wide mb-1.5">
                  Motivo obligatorio del cambio de estado *
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoCambio}
                  onChange={(e) => setMotivoCambio(e.target.value)}
                  placeholder="Escribe la causa técnica, resultado de laboratorio o causal de retención..."
                  className="w-full px-3 py-2 bg-white border border-cacao-200 rounded-xl text-xs text-cacao-900 focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
                />
              </div>

              {/* Botones de plantilla rápida */}
              <div>
                <span className="text-[11px] font-semibold text-cacao-600 block mb-1">
                  Plantillas de justificación rápida:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Merma > 15% por humedad no evaporada y descarte de impurezas.',
                    'Aprobada prueba de corte y protocolo sensorial Huila Origen.',
                    'Riesgo de contaminación cruzada en tolva de fermentación.',
                    'Incidencia Hora 12: Bloqueo preventivo por merma crítica.'
                  ].map((plantilla, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMotivoCambio(plantilla)}
                      className="text-[10px] px-2 py-1 bg-cacao-100 hover:bg-cacao-200 text-cacao-800 rounded-md cursor-pointer transition text-left"
                    >
                      + {plantilla}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cacao-200">
                <button
                  type="button"
                  onClick={() => setLoteParaCambioEstado(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-cacao-300 text-cacao-700 bg-white hover:bg-cacao-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs cursor-pointer ${
                    nuevoEstadoSeleccionado === 'Bloqueado'
                      ? 'bg-peligro-600 hover:bg-red-700'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  Confirmar Cambio de Estado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
