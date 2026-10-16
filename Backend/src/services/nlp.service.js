/**
 * @fileoverview Intérprete seguro y determinista de consultas en lenguaje natural para analítica de Kaotrace.
 * Mapea intenciones sobre consultas parametrizadas de solo lectura contra las vistas analíticas de PostgreSQL.
 */

const HUILA_MUNICIPIOS = [
  'rivera',
  'campoalegre',
  'algeciras',
  'gigante',
  'garzon',
  'garzón',
  'neiva',
  'palermo',
  'pitalito',
  'la plata',
]

/**
 * Factoría que instancia el servicio de procesamiento de lenguaje natural (NLP) seguro.
 *
 * @param {Object} dependencies - Dependencias inyectadas.
 * @param {Object} dependencies.estadisticasModel - Modelo de estadísticas sobre vistas analíticas.
 * @returns {Object} Métodos del intérprete.
 */
function createNlpService({ estadisticasModel }) {
  if (!estadisticasModel) {
    throw new Error('estadisticasModel es una dependencia obligatoria para el servicio NLP')
  }

  /**
   * Extrae el municipio mencionado en la consulta si coincide con municipios cacaoteros del Huila.
   *
   * @param {string} text - Texto en minúsculas.
   * @returns {string|null} Municipio normalizado o null.
   */
  function extractMunicipio(text) {
    for (const m of HUILA_MUNICIPIOS) {
      if (text.includes(m)) {
        return m.charAt(0).toUpperCase() + m.slice(1)
      }
    }
    return null
  }

  /**
   * Identifica la intención analítica mediante reglas deterministas de coincidencia léxica.
   *
   * @param {string} text - Pregunta normalizada.
   * @returns {{ intencion: string, confianza: number }}
   */
  function classifyIntent(text) {
    if (text.includes('bloquead') || text.includes('retenid') || text.includes('bloqueo')) {
      return { intencion: 'CONSULTA_LOTES_BLOQUEADOS', confianza: 0.95 }
    }
    if (text.includes('incidencia') || text.includes('alerta') || text.includes('calidad') || text.includes('defecto')) {
      return { intencion: 'CONSULTA_INCIDENCIAS_CALIDAD', confianza: 0.92 }
    }
    if (text.includes('costo') || text.includes('gasto') || text.includes('inversion') || text.includes('inversión') || text.includes('cuanto costo') || text.includes('cuánto costó')) {
      return { intencion: 'CONSULTA_COSTOS_TOTALES', confianza: 0.94 }
    }
    if (text.includes('inventario') || text.includes('saldo') || text.includes('stock') || text.includes('existencia') || text.includes('disponible')) {
      return { intencion: 'CONSULTA_SALDO_INVENTARIO', confianza: 0.93 }
    }
    if (text.includes('merma') || text.includes('perdida') || text.includes('pérdida') || text.includes('rendimiento') || text.includes('desperdicio')) {
      return { intencion: 'CONSULTA_MERMA_PROMEDIO', confianza: 0.96 }
    }

    return { intencion: 'CONSULTA_RESUMEN_GENERAL', confianza: 0.85 }
  }

  return {
    /**
     * Interpreta una pregunta en lenguaje natural, ejecuta de forma segura la consulta parametrizada
     * y formula una respuesta ejecutiva sintetizada en español.
     *
     * @param {string} pregunta - Pregunta formulada por el usuario administrador.
     * @returns {Promise<{
     *   pregunta: string,
     *   intencionDetectada: string,
     *   confianza: number,
     *   parametrosExtraidos: Object,
     *   datos: unknown,
     *   respuestaEnLenguajeNatural: string
     * }>}
     */
    async procesarConsulta(pregunta) {
      const normalizada = pregunta.toLowerCase().trim()
      const { intencion, confianza } = classifyIntent(normalizada)
      const municipio = extractMunicipio(normalizada)
      const parametrosExtraidos = { municipio: municipio || undefined }

      let datos = null
      let respuestaEnLenguajeNatural = ''

      switch (intencion) {
        case 'CONSULTA_MERMA_PROMEDIO': {
          const rows = await estadisticasModel.getMermasPorProductor(parametrosExtraidos)
          datos = rows
          const evaluables = rows.filter((r) => r.estado_evaluacion === 'EVALUABLE' && r.merma_porcentaje !== null)

          if (evaluables.length === 0) {
            respuestaEnLenguajeNatural = municipio
              ? `No se encontraron registros de merma evaluables para el municipio de ${municipio}.`
              : 'No se encontraron registros de transformaciones con mermas evaluables en el sistema.'
          } else {
            const sumMerma = evaluables.reduce((acc, curr) => acc + Number(curr.merma_porcentaje), 0)
            const promedio = (sumMerma / evaluables.length).toFixed(2)
            const conAlerta = evaluables.filter((r) => r.supera_umbral === true).length

            respuestaEnLenguajeNatural = municipio
              ? `En el municipio de ${municipio}, la merma promedio registrada es del ${promedio} % sobre ${evaluables.length} transformaciones evaluadas.${conAlerta > 0 ? ` Se identificaron ${conAlerta} transformaciones que superaron el umbral crítico del 15 %.` : ' Todas las transformaciones se mantienen dentro del umbral operativo permitido.'}`
              : `A nivel general, la merma promedio registrada es del ${promedio} % en ${evaluables.length} transformaciones evaluadas.${conAlerta > 0 ? ` Hay ${conAlerta} transformaciones con alerta por superar estrictamente el umbral del 15 %.` : ''}`
          }
          break
        }

        case 'CONSULTA_COSTOS_TOTALES': {
          const rows = await estadisticasModel.getCostos()
          datos = rows
          if (rows.length === 0) {
            respuestaEnLenguajeNatural = 'Actualmente no se registran costos de transformación en la plataforma.'
          } else {
            const totalCop = rows
              .filter((r) => r.moneda === 'COP')
              .reduce((acc, curr) => acc + Number(curr.costo_total), 0)
            const totalTransformaciones = rows.length
            respuestaEnLenguajeNatural = `Los costos totales registrados para procesos de transformación ascienden a $ ${totalCop.toLocaleString('es-CO')} COP en ${totalTransformaciones} registros de costos.`
          }
          break
        }

        case 'CONSULTA_LOTES_BLOQUEADOS': {
          const rows = await estadisticasModel.getEstadoLotes()
          const bloqueados = rows.filter((r) => r.bloqueado === true)
          datos = bloqueados

          if (bloqueados.length === 0) {
            respuestaEnLenguajeNatural = 'Excelente noticia: En este momento no hay lotes bloqueados en el sistema Kaotrace. Todo el grano en inventario está disponible o en proceso normal.'
          } else {
            const listaCodigos = bloqueados.map((b) => `${b.lote_codigo} (${b.productor_nombre || 'Sin productor'}, Motivo: "${b.motivo_estado_actual || 'No especificado'}")`).join('; ')
            respuestaEnLenguajeNatural = `Se identificaron ${bloqueados.length} lote(s) en estado BLOQUEADO por control de calidad: ${listaCodigos}.`
          }
          break
        }

        case 'CONSULTA_SALDO_INVENTARIO': {
          const rows = await estadisticasModel.getInventario(parametrosExtraidos)
          datos = rows
          const evaluables = rows.filter((r) => r.saldo_inventario_kg !== null)
          const totalKg = evaluables.reduce((acc, curr) => acc + Number(curr.saldo_inventario_kg), 0)

          respuestaEnLenguajeNatural = municipio
            ? `En el municipio de ${municipio}, el saldo de inventario disponible es de ${totalKg.toLocaleString('es-CO')} kg distribuidos en ${evaluables.length} lotes evaluables.`
            : `El inventario total disponible en Kaotrace asciende a ${totalKg.toLocaleString('es-CO')} kg de cacao distribuidos en ${evaluables.length} lotes de recepción.`
          break
        }

        case 'CONSULTA_INCIDENCIAS_CALIDAD': {
          const rows = await estadisticasModel.getIncidencias({ soloAbiertas: true })
          datos = rows

          if (rows.length === 0) {
            respuestaEnLenguajeNatural = 'No se registran incidencias de calidad abiertas en este momento.'
          } else {
            const porTipo = rows.reduce((acc, curr) => {
              acc[curr.tipo] = (acc[curr.tipo] || 0) + 1
              return acc
            }, {})
            const resumenTipos = Object.entries(porTipo).map(([tipo, cant]) => `${cant} de tipo ${tipo}`).join(', ')
            respuestaEnLenguajeNatural = `Hay ${rows.length} incidencia(s) abierta(s) pendientes de atención en el sistema (${resumenTipos}).`
          }
          break
        }

        default: {
          const resumen = await estadisticasModel.getResumenGlobal()
          datos = resumen
          const m = resumen.metricasProcesamiento
          respuestaEnLenguajeNatural = `Resumen Kaotrace: ${m.totalTransformaciones} transformaciones procesadas (${m.totalEntradaKg} kg recibidos, ${m.totalSalidaKg} kg producidos, merma global del ${m.mermaGlobalPorcentaje} %). Inventario actual: ${resumen.inventario.saldoTotalKg} kg en ${resumen.inventario.totalLotes} lotes, con ${resumen.inventario.lotesBloqueados} lote(s) bloqueado(s) y ${resumen.incidencias.abiertas} incidencia(s) abierta(s).`
          break
        }
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
