import { useState, useMemo, useEffect } from 'react'
import { obtenerAuditoria, descargarCSV } from '../../services/adminService'
import { IconDownload, IconSearch } from '../../component/Icons'

export default function Auditoria() {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroOperacion, setFiltroOperacion] = useState('todas')

  useEffect(() => {
    let activo = true
    obtenerAuditoria()
      .then((eventos) => {
        if (activo) setRegistros(eventos)
      })
      .catch((err) => {
        if (activo) setError(err.message || 'No se pudo cargar la auditoría.')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  const operacionesDisponibles = useMemo(() => {
    const setOps = new Set(registros.map((r) => r.operacion))
    return ['todas', ...Array.from(setOps)]
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      const matchBusqueda =
        !busqueda ||
        r.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.entidad.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.motivo && r.motivo.toLowerCase().includes(busqueda.toLowerCase())) ||
        r.valor_nuevo.toLowerCase().includes(busqueda.toLowerCase())

      const matchOperacion =
        filtroOperacion === 'todas' || r.operacion.toLowerCase() === filtroOperacion.toLowerCase()

      return matchBusqueda && matchOperacion
    })
  }, [registros, busqueda, filtroOperacion])

  const handleDescargarLog = () => {
    const cabeceras = ['Fecha', 'Usuario', 'Entidad', 'Operacion', 'Valor Anterior', 'Valor Nuevo', 'Motivo']
    const filas = registrosFiltrados.map((r) => [
      `"${r.fecha}"`,
      `"${r.usuario}"`,
      `"${r.entidad}"`,
      `"${r.operacion}"`,
      `"${r.valor_anterior}"`,
      `"${r.valor_nuevo}"`,
      `"${(r.motivo || '').replace(/"/g, '""')}"`
    ])
    const fechaStr = new Date().toISOString().split('T')[0]
    descargarCSV(`auditoria_trazabilidad_huila_${fechaStr}.csv`, cabeceras, filas)
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-cacao-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-cacao-950 tracking-tight">
              RF10: Pista de Auditoría e Inmutabilidad
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cacao-200 text-cacao-800 border border-cacao-300">
              Solo Lectura
            </span>
          </div>
          <p className="mt-1 text-sm text-cacao-700">
            Registro de trazabilidad técnica y gobernanza para certificaciones de cacao del Huila. Los registros son inmutables.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDescargarLog}
          className="px-4 py-2 bg-cacao-800 hover:bg-cacao-900 text-white rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <IconDownload className="w-4 h-4" />
          <span>Descargar Bitácora CSV</span>
        </button>
      </header>

      {/* Filtros */}
      <section className="bg-white p-4 rounded-2xl border border-cacao-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-cacao-700 uppercase whitespace-nowrap">
            Operación:
          </label>
          <select
            value={filtroOperacion}
            onChange={(e) => setFiltroOperacion(e.target.value)}
            className="px-3 py-1.5 bg-[#FDF8F5] border border-cacao-200 rounded-lg text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
          >
            {operacionesDisponibles.map((op) => (
              <option key={op} value={op}>
                {op === 'todas' ? 'Todas las operaciones' : op}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar usuario, lote o motivo..."
            className="w-full px-3 py-1.5 pl-8 bg-[#FDF8F5] border border-cacao-200 rounded-lg text-xs text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
          />
          <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-2 text-cacao-400" />
        </div>
      </section>

      {/* Tabla de Solo Lectura RF10 */}
      <section className="bg-white rounded-2xl border border-cacao-200 shadow-2xs overflow-hidden">
        {cargando && <p role="status" className="p-6 text-center text-cacao-700">Cargando auditoría…</p>}
        {error && <p role="alert" className="p-6 text-center text-peligro-600">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#2A1810] text-cacao-50 text-[11px] uppercase tracking-wider font-bold">
                <th scope="col" className="py-3.5 px-4">Fecha y Hora</th>
                <th scope="col" className="py-3.5 px-4">Usuario</th>
                <th scope="col" className="py-3.5 px-4">Entidad</th>
                <th scope="col" className="py-3.5 px-4">Operación</th>
                <th scope="col" className="py-3.5 px-4">Valor Anterior</th>
                <th scope="col" className="py-3.5 px-4">Valor Nuevo</th>
                <th scope="col" className="py-3.5 px-4">Justificación / Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cacao-100 text-cacao-900">
              {!cargando && !error && registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-cacao-500">
                    No hay registros de auditoría que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : !cargando && !error ? (
                registrosFiltrados.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`${idx % 2 === 0 ? 'bg-[#FDF8F5]/60' : 'bg-white'} hover:bg-cacao-100/50 transition`}
                  >
                    {/* Fecha */}
                    <td className="py-3 px-4 font-mono text-[11px] text-cacao-600 whitespace-nowrap">
                      {item.fecha}
                    </td>

                    {/* Usuario */}
                    <td className="py-3 px-4 font-semibold text-cacao-900">
                      {item.usuario}
                    </td>

                    {/* Entidad */}
                    <td className="py-3 px-4 font-mono font-bold text-cacao-950">
                      {item.entidad}
                    </td>

                    {/* Operación */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-cacao-100 text-cacao-800 text-[10px] font-bold uppercase">
                        {item.operacion}
                      </span>
                    </td>

                    {/* Valor Anterior */}
                    <td className="py-3 px-4 text-cacao-600">
                      {item.valor_anterior}
                    </td>

                    {/* Valor Nuevo (Resaltado en negrita según RF10) */}
                    <td className="py-3 px-4 font-bold text-cacao-950">
                      <span className="bg-mazorca-500/15 px-2 py-0.5 rounded text-cacao-950">
                        {item.valor_nuevo}
                      </span>
                    </td>

                    {/* Motivo */}
                    <td className="py-3 px-4 text-cacao-700 italic max-w-xs text-[11px] leading-relaxed">
                      {item.motivo || 'Sin observaciones'}
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between text-xs text-cacao-500 px-1">
        <span>Total: <strong>{registrosFiltrados.length}</strong> eventos auditados</span>
        <span>Integridad criptográfica y trazabilidad inmutable Huila</span>
      </div>
    </div>
  )
}
