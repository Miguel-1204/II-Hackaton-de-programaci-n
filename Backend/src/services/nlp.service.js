/**
 * @fileoverview Intérprete determinista de consultas analíticas de solo lectura.
 */

const HUILA_MUNICIPIOS = [
  'campoalegre',
  'algeciras',
  'garzón',
  'garzon',
  'gigante',
  'la plata',
  'neiva',
  'palermo',
  'pitalito',
  'rivera',
]

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function formatPeriod(filters) {
  if (!filters.fechaDesde && !filters.fechaHasta) return 'histórico completo'
  const date = (value) => value.toISOString().slice(0, 10)
  return `${filters.fechaDesde ? date(filters.fechaDesde) : 'inicio'} a ${filters.fechaHasta ? date(filters.fechaHasta) : 'actualidad'}`
}

function createNlpService({ estadisticasModel, clock = () => new Date() }) {
  if (!estadisticasModel) {
    throw new Error('estadisticasModel es una dependencia obligatoria para el servicio NLP')
  }

  function extractMunicipio(text) {
    const municipio = HUILA_MUNICIPIOS.find((candidate) => text.includes(candidate))
    if (!municipio) return undefined
    return municipio.split(' ').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
  }

  function extractPeriod(text) {
    const today = clock()
    const localDate = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(today)
        .filter((part) => ['year', 'month', 'day'].includes(part.type))
        .map((part) => [part.type, Number(part.value)]),
    )
    const end = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day, 5))
    if (/\b(este mes|mes actual|durante el mes)\b/.test(text)) {
      return {
        fechaDesde: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 5)),
        fechaHasta: end,
        periodo: 'mes actual',
      }
    }
    if (/\b(esta semana|ultima semana|ultimos 7 dias|ultimos siete dias)\b/.test(text)) {
      const start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 6)
      return { fechaDesde: start, fechaHasta: end, periodo: 'últimos 7 días' }
    }
    return { periodo: 'histórico completo' }
  }

  function classifyIntent(text) {
    if (/(balance general|balance de productos|balance por producto|resumen de productos|estado del inventario por producto)/.test(text)) {
      return 'CONSULTA_BALANCE_PRODUCTOS'
    }
    if (/bloquead|retenid|bloqueo/.test(text)) return 'CONSULTA_LOTES_BLOQUEADOS'
    if (/incidencia|alerta|calidad|defecto/.test(text)) return 'CONSULTA_INCIDENCIAS_CALIDAD'
    if (/costo promedio|coste promedio|promedio.*(costo|coste)|costo.*kilogramo|costo.*por kg|costo.*por kilo/.test(text)) {
      return 'CONSULTA_COSTO_PROMEDIO_KG'
    }
    if (/productor|productores/.test(text) && /(merma|perdida|desperdicio)/.test(text) && /(superior|mayor|mas de|mas del|sobrepasa|supera|15\s*%)/.test(text)) {
      return 'CONSULTA_PRODUCTORES_MERMA_UMBRAL'
    }
    if (/promedio.*merma|merma.*promedio|porcentaje promedio.*merma/.test(text)) {
      return 'CONSULTA_MERMA_PROMEDIO'
    }
    if (/costo|coste|gasto|gastamos|inversion|cuanto costo|cuanto se gasto/.test(text)) {
      return 'CONSULTA_COSTOS_TOTALES'
    }
    if (/transformacion|transformaciones/.test(text) && /(mayor|mas alta|mas elevada|top|mayores)/.test(text) && /(merma|perdida)/.test(text)) {
      return 'CONSULTA_TRANSFORMACIONES_MAYOR_MERMA'
    }
    if (/(cuanto|cantidad|total).*(cacao|procesad|transformad)|cacao.*procesad/.test(text)) {
      return 'CONSULTA_CANTIDAD_PROCESADA'
    }
    if (/inventario|saldo|stock|existencia|disponible/.test(text)) return 'CONSULTA_SALDO_INVENTARIO'
    if (/merma|perdida|rendimiento|desperdicio/.test(text)) return 'CONSULTA_MERMA_PROMEDIO'
    return 'CONSULTA_NO_SOPORTADA'
  }

  function summarizeCosts(rows) {
    return rows.reduce((totals, row) => {
      const currency = String(row.moneda || '').toUpperCase()
      if (currency) totals[currency] = (totals[currency] || 0) + Number(row.costo_total || 0)
      return totals
    }, {})
  }

  function moneySummary(totals) {
    const currencies = Object.entries(totals)
    return currencies.length
      ? currencies.map(([currency, total]) => `${currency} ${total.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`).join('; ')
      : 'sin costos registrados'
  }

  return {
    async procesarConsulta(pregunta) {
      const normalizada = normalizeText(pregunta)
      const intencion = classifyIntent(normalizada)
      const municipio = extractMunicipio(normalizada)
      const periodo = extractPeriod(normalizada)
      const filters = {
        ...(municipio ? { municipio } : {}),
        ...(periodo.fechaDesde ? { fechaDesde: periodo.fechaDesde, fechaHasta: periodo.fechaHasta } : {}),
      }
      const parametrosExtraidos = {
        ...filters,
        periodo: periodo.periodo,
      }

      if (intencion === 'CONSULTA_NO_SOPORTADA') {
        return {
          pregunta,
          intencionDetectada: intencion,
          confianza: 0,
          parametrosExtraidos,
          datos: null,
          respuestaEnLenguajeNatural: 'No pude identificar una consulta analítica compatible. Pregunta por mermas, productores sobre el 15 %, cantidades procesadas, costos, inventario, lotes bloqueados o incidencias abiertas.',
        }
      }

      let confianza = 0.94
      let datos
      let respuestaEnLenguajeNatural

      switch (intencion) {
        case 'CONSULTA_BALANCE_PRODUCTOS': {
          const productos = await estadisticasModel.getBalanceProductos()
          const palabrasIgnoradas = new Set(['balance', 'general', 'producto', 'productos', 'por', 'de', 'del', 'el', 'la', 'los', 'las', 'para', 'inventario', 'resumen', 'consultados', 'consultadas', 'actual', 'actuales', 'stock', 'existencia', 'existencias', 'total', 'consulta'])
          const terminosProducto = normalizada
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length > 2 && !palabrasIgnoradas.has(word))
          const seleccion = terminosProducto.length
            ? productos.filter((item) => terminosProducto.every((term) => normalizeText(item.producto).includes(term)))
            : productos
          const totalDisponibleKg = seleccion.reduce((sum, item) => sum + item.disponibleKg, 0)
          const totalLotes = seleccion.reduce((sum, item) => sum + item.lotes, 0)
          datos = {
            productos: seleccion,
            resumen: {
              totalProductos: seleccion.length,
              totalLotes,
              cantidadRegistradaKg: seleccion.reduce((sum, item) => sum + item.cantidadRegistradaKg, 0),
              consumidoKg: seleccion.reduce((sum, item) => sum + item.consumidoKg, 0),
              disponibleKg: totalDisponibleKg,
            },
          }
          respuestaEnLenguajeNatural = seleccion.length
            ? `Balance de ${seleccion.length} producto(s): ${totalDisponibleKg.toLocaleString('es-CO')} kg disponibles en ${totalLotes} lotes. Se excluyen del saldo disponible los lotes bloqueados y los saldos no evaluables.`
            : 'No encontré productos que coincidan con el nombre consultado. Prueba con el nombre del catálogo o pide el balance general de productos.'
          break
        }
        case 'CONSULTA_PRODUCTORES_MERMA_UMBRAL': {
          const rows = await estadisticasModel.getMermasPorProductor({ ...filters, superaUmbral: true })
          datos = rows.filter((row) => row.estado_evaluacion === 'EVALUABLE' && row.supera_umbral === true)
          const productores = [...new Set(datos.map((row) => row.productor_nombre))]
          respuestaEnLenguajeNatural = datos.length
            ? `En ${periodo.periodo}${municipio ? ` en ${municipio}` : ''}, ${productores.length} productor(es) presentan transformaciones con merma superior al 15 %: ${productores.join(', ')}. Se encontraron ${datos.length} resultados verificables.`
            : `No se encontraron productores con mermas superiores al 15 % en ${periodo.periodo}${municipio ? ` en ${municipio}` : ''}.`
          break
        }
        case 'CONSULTA_MERMA_PROMEDIO': {
          const rows = await estadisticasModel.getMermasPorProductor(filters)
          const evaluables = rows.filter((row) => row.estado_evaluacion === 'EVALUABLE' && row.merma_porcentaje !== null)
          if (/municipio|municipios|por localidad/.test(normalizada) && !municipio) {
            const groups = new Map()
            for (const row of evaluables) {
              const group = groups.get(row.municipio) || []
              group.push(Number(row.merma_porcentaje))
              groups.set(row.municipio, group)
            }
            datos = [...groups].map(([nombre, values]) => ({
              municipio: nombre,
              transformacionesEvaluadas: values.length,
              mermaPromedioPorcentaje: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
            }))
            respuestaEnLenguajeNatural = datos.length
              ? `Merma promedio por municipio para ${periodo.periodo}: ${datos.map((item) => `${item.municipio}: ${item.mermaPromedioPorcentaje} % (${item.transformacionesEvaluadas} transformaciones)`).join('; ')}.`
              : `No hay mermas evaluables por municipio para ${periodo.periodo}.`
          } else {
            datos = evaluables
            const average = evaluables.length
              ? evaluables.reduce((sum, row) => sum + Number(row.merma_porcentaje), 0) / evaluables.length
              : null
            respuestaEnLenguajeNatural = average === null
              ? `No se encontraron registros de merma evaluables para ${periodo.periodo}${municipio ? ` en ${municipio}` : ''}.`
              : `La merma promedio es ${average.toFixed(2)} % en ${evaluables.length} transformaciones evaluables para ${periodo.periodo}${municipio ? ` en ${municipio}` : ''}.`
          }
          break
        }
        case 'CONSULTA_TRANSFORMACIONES_MAYOR_MERMA': {
          const rows = await estadisticasModel.getMermasPorProductor(filters)
          datos = rows
            .filter((row) => row.estado_evaluacion === 'EVALUABLE' && row.merma_porcentaje !== null)
            .sort((a, b) => Number(b.merma_porcentaje) - Number(a.merma_porcentaje))
            .slice(0, 10)
          respuestaEnLenguajeNatural = datos.length
            ? `Las transformaciones con mayor merma para ${periodo.periodo} son: ${datos.map((row) => `${row.transformacion_codigo} (${Number(row.merma_porcentaje).toFixed(2)} %)`).join('; ')}.`
            : `No hay transformaciones con merma evaluable para ${periodo.periodo}.`
          break
        }
        case 'CONSULTA_CANTIDAD_PROCESADA': {
          const summary = await estadisticasModel.getResumenGlobal(filters)
          const kg = summary.metricasProcesamiento.totalEntradaKg
          datos = { cantidadEntradaAcumuladaKg: kg, periodo: periodo.periodo }
          respuestaEnLenguajeNatural = `Se registraron ${Number(kg).toLocaleString('es-CO')} kg de entrada acumulada en transformaciones durante ${periodo.periodo}. La cifra suma las entradas de cada transformación y no representa cacao único sin doble conteo entre etapas.`
          break
        }
        case 'CONSULTA_COSTO_PROMEDIO_KG': {
          if (municipio) {
            return {
              pregunta,
              intencionDetectada: 'CONSULTA_NO_SOPORTADA',
              confianza: 0,
              parametrosExtraidos,
              datos: null,
              respuestaEnLenguajeNatural: 'No es posible atribuir costos por kilogramo a un municipio: los costos se registran por transformación y no por productor.',
            }
          }
          const averageData = await estadisticasModel.getCostoPromedioPorKg(filters)
          const average = averageData.costoPromedioCOPKg
          datos = { ...averageData, periodo: periodo.periodo }
          respuestaEnLenguajeNatural = average === null
            ? `No hay costos COP y cantidades de salida comparables suficientes para calcular el costo promedio por kilogramo en ${periodo.periodo}.`
            : `El costo promedio registrado es ${average.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP/kg, calculado como ${Number(averageData.costoCOP).toLocaleString('es-CO')} COP dividido por ${Number(averageData.salidaAcumuladaKg).toLocaleString('es-CO')} kg de salida acumulada de transformaciones con costos COP en ${periodo.periodo}.`
          break
        }
        case 'CONSULTA_COSTOS_TOTALES': {
          const rows = await estadisticasModel.getCostos(filters)
          const totals = summarizeCosts(rows)
          datos = { costosPorMoneda: totals, periodo: periodo.periodo }
          respuestaEnLenguajeNatural = `Costos de procesamiento para ${periodo.periodo}: ${moneySummary(totals)}. No se suman monedas distintas entre sí.`
          break
        }
        case 'CONSULTA_LOTES_BLOQUEADOS': {
          const rows = await estadisticasModel.getEstadoLotes()
          datos = rows.filter((row) => row.bloqueado === true)
          respuestaEnLenguajeNatural = datos.length
            ? `Hay ${datos.length} lote(s) en estado BLOQUEADO: ${datos.map((row) => `${row.lote_codigo} (motivo: ${row.motivo_estado_actual || 'No especificado'})`).join('; ')}.`
            : 'No hay lotes bloqueados registrados actualmente.'
          break
        }
        case 'CONSULTA_SALDO_INVENTARIO': {
          const rows = await estadisticasModel.getInventario(filters)
          const evaluables = rows.filter((row) => row.saldo_inventario_kg !== null)
          const kg = evaluables.reduce((sum, row) => sum + Number(row.saldo_inventario_kg), 0)
          datos = { lotesEvaluables: evaluables.length, saldoKg: kg, municipio }
          respuestaEnLenguajeNatural = `El saldo de inventario${municipio ? ` en ${municipio}` : ''} es ${kg.toLocaleString('es-CO')} kg en ${evaluables.length} lotes.`
          break
        }
        case 'CONSULTA_INCIDENCIAS_CALIDAD': {
          const rows = await estadisticasModel.getIncidencias({ soloAbiertas: true })
          datos = rows
          respuestaEnLenguajeNatural = rows.length
            ? `Hay ${rows.length} incidencia(s) abierta(s) en el sistema.`
            : 'No se registran incidencias abiertas actualmente.'
          break
        }
        default:
          confianza = 0
          datos = null
          respuestaEnLenguajeNatural = 'No pude identificar una consulta analítica compatible.'
      }

      return {
        pregunta,
        intencionDetectada: intencion,
        confianza,
        parametrosExtraidos,
        datos,
        respuestaEnLenguajeNatural,
      }
    },
  }
}

module.exports = {
  createNlpService,
}
