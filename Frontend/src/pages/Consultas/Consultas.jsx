import { useState } from 'react'
import { consultarNlp, descargarBalanceProductosPdf } from '../../services/nlpService'
import { IconRobot, IconInfo, IconSearch, IconFormula, IconExclamation } from '../../component/Icons'

const CONSULTAS_EJEMPLO = [
  'balance general de productos',
  'inventario disponible en Rivera',
  'mermas mayores al 15%',
  'lotes bloqueados',
  'alertas activas',
  'costo promedio por kilogramo',
]

const etiquetas = {
  producto: 'Producto', codigo: 'Código', lotes: 'Lotes',
  cantidadRegistradaKg: 'Cantidad registrada (kg)', consumidoKg: 'Salidas registradas (kg)',
  disponibleKg: 'Disponible (kg)', precioReferencia: 'Precio de referencia',
  unidadComercial: 'Unidad comercial', lote_codigo: 'Lote', productor_nombre: 'Productor',
  municipio: 'Municipio', merma_porcentaje: 'Merma (%)', transformacion_codigo: 'Transformación',
  costo_total: 'Costo total', moneda: 'Moneda', tipo: 'Tipo', severidad: 'Severidad',
  estado: 'Estado', creada_en: 'Fecha',
}

function label(key) {
  return etiquetas[key] || key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ')
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toLocaleString('es-CO', { maximumFractionDigits: 2 })
  return String(value)
}

function getRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.productos)) return data.productos
  if (data?.costosPorMoneda) {
    return Object.entries(data.costosPorMoneda).map(([moneda, total]) => ({ moneda, costo_total: total }))
  }
  if (data && typeof data === 'object') return [data]
  return []
}

function interpretacion(resultado) {
  const params = resultado?.parametrosExtraidos || {}
  const filtros = []
  if (params.municipio) filtros.push(`municipio ${params.municipio}`)
  if (params.periodo) filtros.push(params.periodo)
  if (params.lote) filtros.push(`lote ${params.lote}`)
  return `Consulta procesada por el backend: ${resultado?.intencionDetectada || 'sin intención'}${filtros.length ? `; filtros: ${filtros.join(', ')}` : ''}.`
}

function BalanceChart({ productos }) {
  const max = Math.max(...productos.map((item) => Number(item.disponibleKg || 0)), 0)
  if (!productos.length) return null

  return (
    <div className="bg-white rounded-2xl border border-cacao-200 p-4 shadow-2xs">
      <h3 className="font-bold text-sm text-cacao-950 mb-3">Inventario disponible por producto</h3>
      <div className="space-y-3" role="img" aria-label="Gráfica de barras de inventario disponible por producto">
        {productos.map((item) => {
          const kg = Number(item.disponibleKg || 0)
          const width = max > 0 ? Math.max((kg / max) * 100, kg > 0 ? 2 : 0) : 0
          return (
            <div key={item.productoId} className="grid grid-cols-[minmax(90px,1fr)_3fr_auto] items-center gap-3 text-xs">
              <span className="truncate text-cacao-800" title={item.producto}>{item.producto}</span>
              <div className="h-3 rounded-full bg-cacao-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${width}%` }} />
              </div>
              <span className="text-right font-semibold text-cacao-900">{kg.toLocaleString('es-CO')} kg</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Consultas({ abierto = true, alCerrar }) {
  const [textoConsulta, setTextoConsulta] = useState('')
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const [historialConsultas, setHistorialConsultas] = useState([])

  if (!abierto) return null

  const procesarConsulta = async (consultaTexto = textoConsulta) => {
    const pregunta = consultaTexto.trim()
    if (!pregunta || cargando) return
    setCargando(true)
    setError('')
    setResultado(null)
    try {
      const respuesta = await consultarNlp(pregunta)
      setResultado(respuesta)
      setHistorialConsultas((prev) => [pregunta, ...prev.filter((item) => item !== pregunta)].slice(0, 5))
    } catch (err) {
      setError(err.message || 'No fue posible consultar el backend.')
    } finally {
      setCargando(false)
    }
  }

  const handleEnviarFormulario = (event) => {
    event.preventDefault()
    procesarConsulta()
  }

  const handleDescargarBalance = async () => {
    if (!resultado?.pregunta || descargandoPdf) return
    setDescargandoPdf(true)
    setError('')
    try {
      const blob = await descargarBalanceProductosPdf(resultado.pregunta)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `balance-productos-kaotrace-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err.message || 'No fue posible generar el PDF del balance.')
    } finally {
      setDescargandoPdf(false)
    }
  }

  const rows = getRows(resultado?.datos)
  const columnas = rows.length ? Object.keys(rows[0]).filter((key) => rows[0][key] === null || typeof rows[0][key] !== 'object') : []
  const balance = resultado?.intencionDetectada === 'CONSULTA_BALANCE_PRODUCTOS' ? resultado.datos : null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-nlp-titulo" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-cacao-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-cacao-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 bg-[#2C1A14] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mazorca-500/20 border border-mazorca-500/40 text-mazorca-400 font-bold flex items-center justify-center text-xl"><IconRobot /></div>
            <div>
              <h2 id="modal-nlp-titulo" className="text-lg font-bold font-display">Consultas en lenguaje natural</h2>
              <p className="text-xs text-cacao-200">Consultas deterministas sobre datos del sistema</p>
            </div>
          </div>
          {alCerrar && <button type="button" onClick={alCerrar} className="p-1.5 rounded-xl text-cacao-200 hover:text-white hover:bg-cacao-800" aria-label="Cerrar modal"><span className="text-xl">×</span></button>}
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-[#FDF8F5]">
          <section className="p-4 rounded-2xl bg-gradient-to-r from-[#2C1A14] to-[#382119] text-white shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mazorca-400"><IconInfo className="w-4 h-4" /> Consultas disponibles</div>
            <p className="text-sm">Puedes consultar inventario, balance por producto, mermas, costos, lotes bloqueados y alertas activas. La consulta y sus resultados vienen del backend.</p>
            <p className="text-xs text-cacao-200">Ejemplo: <code className="bg-black/30 px-2 py-0.5 rounded text-mazorca-300">balance general de productos</code></p>
          </section>

          <section className="bg-white p-4 rounded-2xl border border-cacao-200 shadow-2xs space-y-3">
            <form onSubmit={handleEnviarFormulario} className="flex flex-col sm:flex-row gap-2.5">
              <input type="text" value={textoConsulta} onChange={(event) => setTextoConsulta(event.target.value)} placeholder="Escribe tu consulta..." className="w-full px-4 py-2.5 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-sm text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden" />
              <button type="submit" disabled={cargando} className="px-5 py-2.5 bg-cacao-800 hover:bg-cacao-900 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap"><IconSearch className="w-4 h-4" /><span>{cargando ? 'Consultando…' : 'Consultar'}</span></button>
            </form>
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-cacao-500 font-semibold text-[11px]">Sugerencias:</span>
              {CONSULTAS_EJEMPLO.map((ejemplo) => <button key={ejemplo} type="button" disabled={cargando} onClick={() => { setTextoConsulta(ejemplo); procesarConsulta(ejemplo) }} className="px-2 py-1 rounded-lg bg-cacao-50 hover:bg-cacao-100 border border-cacao-200 text-cacao-800 text-[11px]">{ejemplo}</button>)}
            </div>
            {historialConsultas.length > 0 && <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-cacao-100 text-[11px] text-cacao-600"><span className="font-semibold">Recientes:</span>{historialConsultas.map((item) => <button key={item} type="button" onClick={() => { setTextoConsulta(item); procesarConsulta(item) }} className="text-cacao-700 hover:text-cacao-950 underline">{item}</button>)}</div>}
          </section>

          {error && <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"><strong>No se pudo completar la consulta.</strong><p>{error}</p></div>}
          {resultado && (
            <section className="space-y-4">
              <div className={`p-3.5 rounded-xl border text-sm shadow-2xs ${resultado.confianza > 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
                <div className="font-semibold">{interpretacion(resultado)}</div>
                <p className="mt-1">{resultado.respuestaEnLenguajeNatural}</p>
              </div>

              {balance && balance.resumen && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Productos', balance.resumen.totalProductos],
                  ['Lotes', balance.resumen.totalLotes],
                  ['Registrado', `${formatValue(balance.resumen.cantidadRegistradaKg)} kg`],
                  ['Disponible', `${formatValue(balance.resumen.disponibleKg)} kg`],
                ].map(([title, value]) => <div key={title} className="bg-white rounded-xl border border-cacao-200 p-3"><p className="text-xs text-cacao-500">{title}</p><p className="font-bold text-cacao-950">{value}</p></div>)}
              </div>}

              {balance && <div className="flex justify-end">
                <button type="button" onClick={handleDescargarBalance} disabled={descargandoPdf || balance.productos?.length === 0} className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold">
                  {descargandoPdf ? 'Generando PDF…' : 'Descargar balance en PDF'}
                </button>
              </div>}

              {balance && <BalanceChart productos={balance.productos || []} />}

              {rows.length > 0 && <div className="bg-white rounded-2xl border border-cacao-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto"><table className="w-full text-left text-xs border-collapse">
                  <thead><tr className="bg-[#2A1810] text-cacao-50 text-[11px] uppercase tracking-wider font-bold">{columnas.map((key) => <th key={key} className="py-2.5 px-3.5">{label(key)}</th>)}</tr></thead>
                  <tbody className="divide-y divide-cacao-100 text-cacao-900">{rows.map((row, index) => <tr key={row.productoId || row.lote_id || row.transformacion_id || index} className="hover:bg-cacao-50/70">{columnas.map((key) => <td key={key} className="py-2.5 px-3.5">{formatValue(row[key])}</td>)}</tr>)}</tbody>
                </table></div>
              </div>}

              {(balance || resultado.datos?.costoPromedioCOPKg !== undefined) && <div className="p-3.5 rounded-xl bg-white border border-cacao-200 text-xs text-cacao-800 space-y-1 shadow-2xs"><span className="font-bold text-cacao-900 flex items-center gap-1.5"><IconFormula className="w-4 h-4 text-cacao-500" /> Fórmula y supuestos</span><p className="font-mono text-[11px] text-cacao-700 bg-cacao-50 p-2 rounded-lg border border-cacao-100">{balance ? 'Disponible por producto = suma del saldo de lotes evaluables en estado PENDIENTE o LIBERADO. Las salidas registradas se suman desde movimientos de inventario en kg. No se valoriza el stock con precio de referencia porque su unidad comercial puede no equivaler a kg.' : 'Costo promedio (COP/kg) = costos COP registrados ÷ kg de salida de transformaciones evaluables.'}</p></div>}

              {resultado.confianza === 0 && <div className="flex items-center gap-2 text-xs text-amber-800"><IconExclamation className="w-4 h-4" /> Intenta con una de las consultas sugeridas; las respuestas no reconocidas no generan datos inventados.</div>}
            </section>
          )}
        </div>
        {alCerrar && <div className="px-6 py-3 bg-white border-t border-cacao-200 flex items-center justify-between shrink-0"><span className="text-[11px] text-cacao-500">Datos leídos por el backend de Kaotrace</span><button type="button" onClick={alCerrar} className="px-4 py-1.5 bg-cacao-100 hover:bg-cacao-200 text-cacao-800 font-semibold rounded-lg text-xs">Cerrar</button></div>}
      </div>
    </div>
  )
}
