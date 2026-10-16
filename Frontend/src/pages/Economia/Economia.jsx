import { useState, useMemo, useEffect } from 'react'
import { obtenerLotes } from '../../services/lotesService'
import { obtenerCostosPersistidos } from '../../services/economiaService'
import { IconCacao, IconGear, IconChart, IconFormula, IconAlert, IconCheck } from '../../component/Icons'

const formatCop = (n) => {
  if (n === null || n === undefined || isNaN(n)) return 'N/A'
  return `$ ${Number(n).toLocaleString('es-CO')} COP`
}

export default function Economia() {
  const [lotes, setLotes] = useState([])
  const [loteIdSeleccionado, setLoteIdSeleccionado] = useState('')
  const [costosRegistrados, setCostosRegistrados] = useState([])
  const [errorCarga, setErrorCarga] = useState('')

  useEffect(() => {
    let activo = true
    Promise.allSettled([obtenerLotes(), obtenerCostosPersistidos()])
      .then(([lotesResult, costosResult]) => {
        if (!activo) return
        if (lotesResult.status === 'fulfilled') {
          setLotes(lotesResult.value)
          if (lotesResult.value.length) setLoteIdSeleccionado(String(lotesResult.value[0].id))
        }
        if (costosResult.status === 'fulfilled') setCostosRegistrados(costosResult.value)
        const failedResult = [lotesResult, costosResult].find((result) => result.status === 'rejected')
        if (failedResult) setErrorCarga(failedResult.reason?.message || 'No se pudieron cargar todos los datos económicos.')
      })
    return () => {
      activo = false
    }
  }, [])

  const loteSeleccionado = useMemo(() => {
    return lotes.find((l) => l.id === Number(loteIdSeleccionado)) || null
  }, [lotes, loteIdSeleccionado])

  const costosPorMoneda = useMemo(() => costosRegistrados.reduce((totals, item) => {
    const currency = String(item.moneda || '').toUpperCase()
    if (currency) totals[currency] = (totals[currency] || 0) + Number(item.costo_total || 0)
    return totals
  }, {}), [costosRegistrados])

  // Parámetros editables por el jurado (RF05, RF12)
  const [costoTotalEtapa, setCostoTotalEtapa] = useState(1500000) // COP
  const [kilosSalida, setKilosSalida] = useState(100) // kg
  const [precioVentaKg, setPrecioVentaKg] = useState(24000) // COP/kg

  // Cuando cambia el lote del selector, actualizamos valores sugeridos
  const handleCambiarLote = (id) => {
    setLoteIdSeleccionado(id)
    const encontrado = lotes.find((l) => l.id === Number(id))
    if (encontrado) {
      const kgReal = encontrado.cantidad_recibida || 100
      const costoUnitarioReal = encontrado.costo_unitario || 15000
      setCostoTotalEtapa(kgReal * costoUnitarioReal)
      setKilosSalida(kgReal)
      setPrecioVentaKg(Math.round(costoUnitarioReal * 1.5))
    }
  }

  // Cálculos reactivos con protección contra división entre cero (RF12)
  const calculos = useMemo(() => {
    const costoTotalNum = Number(costoTotalEtapa) || 0
    const kilosNum = Number(kilosSalida) || 0
    const precioVentaNum = Number(precioVentaKg) || 0

    // Si kilos es 0 o menor, se evita la división entre cero
    if (kilosNum <= 0) {
      return {
        costoUnitario: null,
        margenPct: null,
        gananciaTotal: null,
        ingresoTotal: null,
        esValido: false,
        mensajeError: 'Kilos obtenidos es 0: no es posible calcular costo unitario (división entre cero evitada).'
      }
    }

    const costoUnitario = costoTotalNum / kilosNum
    const ingresoTotal = precioVentaNum * kilosNum
    const gananciaTotal = ingresoTotal - costoTotalNum

    let margenPct = null
    if (precioVentaNum > 0) {
      margenPct = ((precioVentaNum - costoUnitario) / precioVentaNum) * 100
    }

    return {
      costoUnitario: Math.round(costoUnitario),
      margenPct: margenPct !== null ? Number(margenPct.toFixed(1)) : null,
      gananciaTotal: Math.round(gananciaTotal),
      ingresoTotal: Math.round(ingresoTotal),
      esValido: true,
      mensajeError: null
    }
  }, [costoTotalEtapa, kilosSalida, precioVentaKg])

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-cacao-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-cacao-950 tracking-tight">
              Análisis económico y costos
            </h1>
          </div>
          <p className="mt-1 text-sm text-cacao-700">
            Explora costos y rendimientos con una simulación que no registra ventas ni modifica el inventario.
          </p>
        </div>
      </header>

      {errorCarga && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{errorCarga}</p>}
      <section className="bg-white p-5 rounded-2xl border border-cacao-200 shadow-2xs space-y-2">
        <h2 className="text-sm font-bold text-cacao-950 uppercase tracking-wider">Costos de transformación persistidos</h2>
        <div className="rounded-xl border border-cacao-100 bg-[#FDF8F5] p-3">
          {Object.keys(costosPorMoneda).length
            ? <div className="mt-2 flex flex-wrap gap-2">{Object.entries(costosPorMoneda).map(([moneda, total]) => <span key={moneda} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-cacao-900">{moneda}: {Number(total).toLocaleString('es-CO')}</span>)}</div>
            : <p className="mt-1 text-xs text-cacao-500">No hay costos de transformación registrados.</p>}
        </div>
      </section>

      {/* Selector de Lote para Precarga Rápida */}
      <section className="bg-white p-4 rounded-2xl border border-cacao-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconCacao className="w-5 h-5 text-cacao-600" />
          <span className="text-xs font-bold text-cacao-900 uppercase tracking-wide">
            Lote cacaotero evaluado:
          </span>
        </div>
        <select
          value={loteIdSeleccionado}
          onChange={(e) => handleCambiarLote(e.target.value)}
          className="px-3 py-2 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-xs font-semibold text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
        >
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.codigo} — {l.productor?.municipio} ({l.tipo_material}) • Base: {formatCop(l.costo_unitario)}/kg
            </option>
          ))}
        </select>
      </section>

      {/* FORMULARIO DE PARÁMETROS EDITABLES (RF05, RF12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de Inputs Editables */}
        <section className="lg:col-span-5 bg-white p-6 rounded-2xl border border-cacao-200 shadow-2xs space-y-5">
          <div className="border-b border-cacao-100 pb-3">
            <h2 className="text-sm font-bold text-cacao-950 uppercase tracking-wider flex items-center gap-2">
              <IconGear className="w-4 h-4 text-cacao-500" /> Parámetros Editables por el Jurado
            </h2>
            <p className="text-xs text-cacao-600 mt-0.5">
              Modifica cualquiera de los tres valores para recalcular al instante.
            </p>
          </div>

          <div className="space-y-4">
            {/* Input 1: Costo Total de Etapa */}
            <div>
              <label className="block text-xs font-bold text-cacao-800 uppercase tracking-wide mb-1.5">
                Costo Total de Etapa ($ COP) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={costoTotalEtapa}
                  onChange={(e) => setCostoTotalEtapa(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-14 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-sm font-bold text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-cacao-400">COP</span>
              </div>
              <span className="text-[11px] text-cacao-500 mt-1 block">
                Materia prima + mano de obra + insumos de transformación.
              </span>
            </div>

            {/* Input 2: Kilos Obtenidos a la Salida */}
            <div>
              <label className="block text-xs font-bold text-cacao-800 uppercase tracking-wide mb-1.5">
                Kilos Obtenidos a la Salida (kg) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={kilosSalida}
                  onChange={(e) => setKilosSalida(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-12 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-sm font-bold text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-cacao-400">kg</span>
              </div>
              <span className="text-[11px] text-cacao-500 mt-1 block">
                Masa final aprovechable (descontando merma por secado/tostado).
              </span>
            </div>

            {/* Input 3: Precio Hipotético de Venta */}
            <div>
              <label className="block text-xs font-bold text-cacao-800 uppercase tracking-wide mb-1.5">
                Precio Hipotético de Venta ($ COP / kg) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={precioVentaKg}
                  onChange={(e) => setPrecioVentaKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-14 bg-[#FDF8F5] border border-cacao-200 rounded-xl text-sm font-bold text-cacao-900 focus:bg-white focus:ring-2 focus:ring-cacao-500 focus:outline-hidden"
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-cacao-400">COP/kg</span>
              </div>
              <span className="text-[11px] text-cacao-500 mt-1 block">
                Precio objetivo pactado con compradores de chocolatería fina.
              </span>
            </div>
          </div>
        </section>

        {/* Panel de Resultados en Tiempo Real */}
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-cacao-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-cacao-100 pb-3">
              <h2 className="text-sm font-bold text-cacao-950 uppercase tracking-wider flex items-center gap-2">
                <IconChart className="w-4 h-4 text-cacao-600" /> Resultados en Tiempo Real
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                {loteSeleccionado ? `Lote ${loteSeleccionado.codigo}` : 'Sin lotes registrados'}
              </span>
            </div>

            {/* Aviso de división entre cero si aplica */}
            {!calculos.esValido && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-peligro-600 text-xs font-medium flex items-center gap-2">
                <IconAlert className="w-4 h-4" />
                <span>{calculos.mensajeError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Costo Unitario */}
              <div className="p-4 rounded-xl bg-[#FDF8F5] border border-cacao-200 space-y-1">
                <span className="text-[11px] font-bold text-cacao-600 uppercase tracking-wider block">
                  Costo Unitario ($/kg)
                </span>
                <span className="text-2xl font-black text-cacao-950 block">
                  {calculos.costoUnitario !== null ? `${formatCop(calculos.costoUnitario)}/kg` : 'N/A'}
                </span>
                <span className="text-[11px] text-cacao-500">
                  Costo por kilogramo final obtenido
                </span>
              </div>

              {/* Card Margen sobre Venta */}
              <div
                className={`p-4 rounded-xl border space-y-1 ${
                  calculos.margenPct === null
                    ? 'bg-cacao-50 border-cacao-200'
                    : calculos.margenPct >= 25
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : calculos.margenPct >= 10
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-red-50/70 border-red-300'
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider block text-cacao-700">
                  Margen sobre Venta (%)
                </span>
                <span
                  className={`text-2xl font-black block ${
                    calculos.margenPct === null
                      ? 'text-cacao-400'
                      : calculos.margenPct >= 25
                      ? 'text-emerald-900'
                      : calculos.margenPct >= 10
                      ? 'text-amber-900'
                      : 'text-peligro-600'
                  }`}
                >
                  {calculos.margenPct !== null ? `${calculos.margenPct}%` : 'N/A'}
                </span>
                <span className="text-[11px] text-cacao-600">
                  {calculos.margenPct >= 25
                    ? <span className="flex items-center gap-1"><IconCheck className="w-3 h-3 text-emerald-600" /> Rentabilidad Óptima Huila</span>
                    : calculos.margenPct >= 10
                    ? <span className="flex items-center gap-1"><IconAlert className="w-3 h-3 text-amber-600" /> Margen Ajustado</span>
                    : <span className="flex items-center gap-1"><IconAlert className="w-3 h-3 text-peligro-600" /> Alerta de Pérdida o Costo Alto</span>}
                </span>
              </div>

              {/* Card Ingreso Total */}
              <div className="p-4 rounded-xl bg-white border border-cacao-200 space-y-1">
                <span className="text-[11px] font-bold text-cacao-600 uppercase tracking-wider block">
                  Ingreso Total Esperado
                </span>
                <span className="text-xl font-bold text-cacao-900 block">
                  {formatCop(calculos.ingresoTotal)}
                </span>
                <span className="text-[11px] text-cacao-500">
                  Venta de {kilosSalida || 0} kg a {formatCop(precioVentaKg)}/kg
                </span>
              </div>

              {/* Card Ganancia Bruta */}
              <div className="p-4 rounded-xl bg-white border border-cacao-200 space-y-1">
                <span className="text-[11px] font-bold text-cacao-600 uppercase tracking-wider block">
                  Utilidad Bruta Estimada
                </span>
                <span
                  className={`text-xl font-black block ${
                    (calculos.gananciaTotal || 0) >= 0 ? 'text-emerald-800' : 'text-peligro-600'
                  }`}
                >
                  {formatCop(calculos.gananciaTotal)}
                </span>
                <span className="text-[11px] text-cacao-500">
                  Ingreso Total − Costo Total Etapa
                </span>
              </div>
            </div>
          </div>

          {/* FÓRMULAS Y SUPUESTOS VISIBLES (RF05) */}
          <div className="bg-white p-5 rounded-2xl border border-cacao-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-cacao-900 uppercase tracking-wider flex items-center gap-2">
              <IconFormula className="w-4 h-4 text-cacao-500" /> Fórmulas Utilizadas y Supuestos Económicos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-cacao-50/80 border border-cacao-200/80 font-mono text-[11px] text-cacao-800 space-y-1">
                <strong className="font-sans block text-cacao-900 font-bold">Fórmula Costo Unitario:</strong>
                <code>Costo Unitario ($/kg) = Costo Total ($) ÷ Masa Salida (kg)</code>
              </div>

              <div className="p-3 rounded-xl bg-cacao-50/80 border border-cacao-200/80 font-mono text-[11px] text-cacao-800 space-y-1">
                <strong className="font-sans block text-cacao-900 font-bold">Fórmula Margen sobre Venta:</strong>
                <code>Margen (%) = [(Precio Venta − Costo Unitario) ÷ Precio Venta] × 100</code>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-cacao-800 leading-relaxed text-[11px]">
              <strong className="text-amber-950 font-bold">Supuestos aplicados:</strong> El costo total de etapa incluye la compra de materia prima al productor huilense según tabla de calidades, costo de mano de obra directa de operario de acopio, empaque biorresistente y flete veredal a planta de transformación. Se asume tasa de cambio e insumos estables para el batch.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
