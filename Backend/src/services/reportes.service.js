/**
 * @fileoverview Servicio para la generación de reportes oficiales en formato PDF utilizando PDFKit.
 * Genera documentos ejecutivos descargables con filtros de fecha, datos de respaldo y resultados de merma por productor.
 */

const PDFDocument = require('pdfkit')

/**
 * Factoría que instancia el servicio de generación de reportes en PDF.
 *
 * @param {Object} dependencies - Dependencias inyectadas.
 * @param {Object} dependencies.estadisticasModel - Modelo de estadísticas y vistas analíticas.
 * @returns {Object} Métodos de generación de reportes.
 */
function createReportesService({ estadisticasModel, lotesModel, nlpService }) {
  if (!estadisticasModel) {
    throw new Error('estadisticasModel es una dependencia obligatoria')
  }

  return {
    /**
     * Genera un documento PDF descargable con el informe de merma por productor y período consultado.
     *
     * @param {Object} [filters] - Filtros del reporte (fechas, municipio, productor).
     * @param {Date} [filters.fechaDesde] - Fecha inicial.
     * @param {Date} [filters.fechaHasta] - Fecha final.
     * @param {string} [filters.municipio] - Municipio.
     * @param {number} [filters.productorId] - Productor.
     * @param {Object} [metadata] - Metadatos de emisión.
     * @param {string} [metadata.solicitante] - Nombre del usuario solicitante.
     * @returns {Promise<Buffer>} Buffer binario del documento PDF generado.
     */
    async generateMermaProductorPdf(filters = {}, metadata = {}) {
      const dataRows = await estadisticasModel.getMermasPorProductor(filters)
      const costos = await estadisticasModel.getCostos(filters)
      const costosPorTransformacion = new Map()
      for (const costo of costos) {
        const key = String(costo.transformacion_id)
        const entries = costosPorTransformacion.get(key) || []
        entries.push(costo)
        costosPorTransformacion.set(key, entries)
      }

      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'LETTER',
            margin: 40,
            info: {
              Title: 'Kaotrace - Reporte Oficial de Mermas por Productor',
              Author: 'Asociación Cacaotera del Huila - Kaotrace',
              Subject: 'Auditoría y Trazabilidad Agroindustrial',
            },
          })

          const chunks = []
          doc.on('data', (chunk) => chunks.push(chunk))
          doc.on('end', () => resolve(Buffer.concat(chunks)))
          doc.on('error', (err) => reject(err))

          // 1. Encabezado institucional
          doc.rect(40, 40, 532, 50).fill('#2c1810')
          doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
            .text('ASOCIACIÓN CACAOTERA DEL HUILA - KAOTRACE', 50, 52)
          doc.fontSize(10).font('Helvetica')
            .text('Sistema Integral de Trazabilidad, Auditoría y Control de Mermas', 50, 72)

          doc.moveDown(2)
          doc.fillColor('#2c1810').fontSize(14).font('Helvetica-Bold')
            .text('INFORME TÉCNICO DE MERMAS Y RENDIMIENTO POR PRODUCTOR', 40, 105)

          // 2. Metadatos de emisión y período consultado
          doc.fontSize(9).font('Helvetica').fillColor('#444444')
          const fechaEmision = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
          const periodoTexto = filters.fechaDesde || filters.fechaHasta
            ? `${filters.fechaDesde ? filters.fechaDesde.toISOString().split('T')[0] : 'Inicio'} a ${filters.fechaHasta ? filters.fechaHasta.toISOString().split('T')[0] : 'Actualidad'}`
            : 'Histórico Completo'

          doc.text(`Fecha de emisión: ${fechaEmision} | Solicitado por: ${metadata.solicitante || 'Administrador'}`)
          doc.text(`Período consultado: ${periodoTexto}${filters.municipio ? ` | Municipio: ${filters.municipio}` : ''}`)

          doc.moveDown(1)

          // 3. Resumen Ejecutivo (KPIs) calculado sobre las filas filtradas del reporte
          const evaluables = dataRows.filter(
            (row) => row.estado_evaluacion === 'EVALUABLE' && row.entrada_kg !== null,
          )
          const totalEntradaKg = evaluables.reduce((sum, row) => sum + Number(row.entrada_kg), 0)
          const totalSalidaKg = evaluables.reduce((sum, row) => sum + Number(row.salida_kg), 0)
          const totalMermaKg = totalEntradaKg - totalSalidaKg
          const mermaGlobal = totalEntradaKg > 0 ? (totalMermaKg / totalEntradaKg) * 100 : 0
          const alertas = evaluables.filter((row) => row.supera_umbral === true).length
          const startY = 155
          doc.rect(40, startY, 532, 42).fillAndStroke('#f7f4ef', '#d4c7b8')
          doc.fillColor('#2c1810').fontSize(10).font('Helvetica-Bold')
            .text('RESUMEN DE LOS REGISTROS FILTRADOS', 50, startY + 8)

          doc.fontSize(9).font('Helvetica').fillColor('#333333')
          doc.text(`Entrada: ${totalEntradaKg.toLocaleString('es-CO')} kg`, 50, startY + 26)
          doc.text(`Salida: ${totalSalidaKg.toLocaleString('es-CO')} kg`, 180, startY + 26)
          doc.text(`Merma: ${totalMermaKg.toLocaleString('es-CO')} kg (${mermaGlobal.toFixed(2)} %)`, 310, startY + 26)
          doc.text(`Alertas (>15%): ${alertas}`, 470, startY + 26)

          // 4. Tabla de Detalle por Productor
          let tableY = startY + 60
          doc.fillColor('#2c1810').fontSize(11).font('Helvetica-Bold')
            .text('DETALLE DE TRANSFORMACIONES Y EVALUACIÓN DE MERMA POR PRODUCTOR', 40, tableY)

          tableY += 18
          // Encabezado de la tabla
          doc.rect(40, tableY, 532, 20).fill('#5a3825')
          doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
          doc.text('CÓDIGO', 45, tableY + 6, { width: 65 })
          doc.text('PRODUCTOR', 115, tableY + 6, { width: 90 })
          doc.text('MUNICIPIO', 210, tableY + 6, { width: 65 })
          doc.text('ENTRADA (kg)', 280, tableY + 6, { width: 60, align: 'right' })
          doc.text('SALIDA (kg)', 345, tableY + 6, { width: 60, align: 'right' })
          doc.text('MERMA (%)', 410, tableY + 6, { width: 55, align: 'right' })
          doc.text('ALERTA >15%', 470, tableY + 6, { width: 50, align: 'center' })
          doc.text('ESTADO', 525, tableY + 6, { width: 45, align: 'center' })

          tableY += 20
          doc.font('Helvetica').fontSize(8)

          if (dataRows.length === 0) {
            doc.fillColor('#666666')
              .text('No se registraron transformaciones en el período o filtros seleccionados.', 45, tableY + 8)
          } else {
            for (let i = 0; i < dataRows.length; i++) {
              const row = dataRows[i]
              if (tableY + 42 > 700) {
                doc.addPage()
                tableY = 40
              }

              const isEven = i % 2 === 0
              if (isEven) {
                doc.rect(40, tableY, 532, 18).fill('#faf8f5')
              }

              const entradaFmt = row.entrada_kg !== null ? Number(row.entrada_kg).toFixed(1) : '-'
              const salidaFmt = row.salida_kg !== null ? Number(row.salida_kg).toFixed(1) : '-'
              const mermaFmt = row.merma_porcentaje !== null ? `${Number(row.merma_porcentaje).toFixed(2)} %` : 'N/A'
              const alerta = row.supera_umbral ? 'SÍ (>15%)' : (row.supera_umbral === false ? 'NO' : '-')

              doc.fillColor(row.supera_umbral ? '#b30000' : '#222222')
              doc.text(String(row.transformacion_codigo || '').substring(0, 10), 45, tableY + 5, { width: 65 })
              doc.text(String(row.productor_nombre || '').substring(0, 16), 115, tableY + 5, { width: 90 })
              doc.text(String(row.municipio || '').substring(0, 12), 210, tableY + 5, { width: 65 })
              doc.text(entradaFmt, 280, tableY + 5, { width: 60, align: 'right' })
              doc.text(salidaFmt, 345, tableY + 5, { width: 60, align: 'right' })
              doc.text(mermaFmt, 410, tableY + 5, { width: 55, align: 'right' })

              if (row.supera_umbral) {
                doc.fillColor('#b30000').font('Helvetica-Bold')
                doc.text(alerta, 470, tableY + 5, { width: 50, align: 'center' })
                doc.font('Helvetica')
              } else {
                doc.fillColor('#222222')
                doc.text(alerta, 470, tableY + 5, { width: 50, align: 'center' })
              }

              doc.fillColor(row.estado_evaluacion === 'EVALUABLE' ? '#006600' : '#885500')
              doc.text(row.estado_evaluacion === 'EVALUABLE' ? 'OK' : 'DESC.', 525, tableY + 5, { width: 45, align: 'center' })

              tableY += 18

              const involvedLots = Array.isArray(row.lotes_involucrados) ? row.lotes_involucrados : []
              const costRows = costosPorTransformacion.get(String(row.transformacion_id)) || []
              const costText = costRows.length
                ? costRows.map((cost) =>
                  `${cost.moneda}: ${Number(cost.costo_total).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`,
                ).join('; ')
                : 'Sin costos registrados'
              const evaluationText =
                `Evaluación: ${row.estado_evaluacion}; umbral: >${Number(row.umbral_porcentaje ?? 15)} %; ` +
                `supera umbral: ${row.supera_umbral === true ? 'Sí' : row.supera_umbral === false ? 'No' : 'No evaluable'}`
              const detailLines = involvedLots.map((lot) =>
                `Lote ${lot.lote_codigo}: ${lot.participacion}, ${lot.cantidad} ${lot.unidad}`,
              )
              if (detailLines.length === 0) detailLines.push('Lotes involucrados: detalle no disponible')
              detailLines.push(evaluationText, `Costos asociados: ${costText}`)

              for (const line of detailLines) {
                doc.font('Helvetica').fontSize(7.5).fillColor('#555555')
                const lineHeight = doc.heightOfString(line, { width: 520, lineGap: 1 })
                if (tableY + lineHeight + 3 > 700) {
                  doc.addPage()
                  tableY = 40
                }
                doc.text(line, 48, tableY, { width: 520, lineGap: 1 })
                tableY += lineHeight + 3
              }
            }
          }

          // Pie de página
          const bottomY = 720
          doc.fontSize(7).fillColor('#888888').font('Helvetica')
            .text('Este documento es un informe oficial emitido por la plataforma Kaotrace en cumplimiento de los estándares de trazabilidad agroindustrial de la Asociación Cacaotera del Huila. Todos los cálculos son verificables en PostgreSQL.', 40, bottomY, { width: 532, align: 'center' })

          doc.end()
        } catch (error) {
          reject(error)
        }
      })
    },

    async generateBalanceProductosPdf(pregunta, metadata = {}) {
      if (!nlpService) throw new Error('nlpService es requerido para generar el balance consultado')
      const resultado = await nlpService.procesarConsulta(pregunta)
      if (resultado.intencionDetectada !== 'CONSULTA_BALANCE_PRODUCTOS' || !resultado.datos) {
        const error = new Error('La consulta no produjo un balance de productos exportable')
        error.status = 400
        throw error
      }

      const { productos, resumen } = resultado.datos
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'LETTER',
            margin: 40,
            info: {
              Title: 'Kaotrace - Balance general de productos',
              Author: 'Asociación Cacaotera del Huila - Kaotrace',
              Subject: 'Balance de inventario por producto',
            },
          })
          const chunks = []
          doc.on('data', (chunk) => chunks.push(chunk))
          doc.on('end', () => resolve(Buffer.concat(chunks)))
          doc.on('error', reject)

          doc.rect(40, 40, 532, 54).fill('#2c1810')
          doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold')
            .text('ASOCIACIÓN CACAOTERA DEL HUILA - KAOTRACE', 50, 52)
          doc.fontSize(9).font('Helvetica')
            .text('Balance general de inventario por producto', 50, 74)

          doc.fillColor('#2c1810').fontSize(16).font('Helvetica-Bold')
            .text('BALANCE GENERAL DE PRODUCTOS', 40, 112)
          doc.fillColor('#444444').fontSize(9).font('Helvetica')
            .text(`Emitido: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`)
            .text(`Solicitado por: ${metadata.solicitante || 'Administrador'}`)
            .text(`Consulta: ${pregunta}`)

          const summaryY = 170
          doc.rect(40, summaryY, 532, 54).fillAndStroke('#f7f4ef', '#d4c7b8')
          doc.fillColor('#2c1810').fontSize(9).font('Helvetica-Bold')
            .text(`Productos: ${resumen.totalProductos}`, 50, summaryY + 10)
            .text(`Lotes: ${resumen.totalLotes}`, 180, summaryY + 10)
            .text(`Registrado: ${Number(resumen.cantidadRegistradaKg).toLocaleString('es-CO')} kg`, 285, summaryY + 10)
            .text(`Disponible: ${Number(resumen.disponibleKg).toLocaleString('es-CO')} kg`, 430, summaryY + 10)
          doc.font('Helvetica').fontSize(8).fillColor('#555555')
            .text(`Salidas registradas: ${Number(resumen.consumidoKg).toLocaleString('es-CO')} kg`, 50, summaryY + 32)

          let y = 245
          doc.fillColor('#2c1810').fontSize(11).font('Helvetica-Bold')
            .text('Disponible por producto', 40, y)
          y += 20
          const maxDisponible = Math.max(...productos.map((item) => Number(item.disponibleKg || 0)), 0)
          for (const item of productos) {
            if (y > 680) {
              doc.addPage()
              y = 45
            }
            const value = Number(item.disponibleKg || 0)
            doc.font('Helvetica').fontSize(8).fillColor('#333333')
              .text(String(item.producto).slice(0, 32), 42, y, { width: 145 })
            doc.rect(190, y + 1, 270, 9).fill('#eee6dd')
            if (maxDisponible > 0 && value > 0) {
              doc.rect(190, y + 1, Math.max((value / maxDisponible) * 270, 2), 9).fill('#07805d')
            }
            doc.text(`${value.toLocaleString('es-CO')} kg`, 470, y, { width: 90, align: 'right' })
            y += 18
          }

          y += 14
          if (y > 665) {
            doc.addPage()
            y = 45
          }
          doc.fillColor('#2c1810').fontSize(11).font('Helvetica-Bold')
            .text('Detalle de inventario', 40, y)
          y += 18
          doc.rect(40, y, 532, 20).fill('#5a3825')
          doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold')
            .text('PRODUCTO', 45, y + 6, { width: 130 })
            .text('LOTES', 180, y + 6, { width: 40, align: 'right' })
            .text('REGISTRADO (kg)', 225, y + 6, { width: 80, align: 'right' })
            .text('SALIDAS (kg)', 310, y + 6, { width: 75, align: 'right' })
            .text('DISPONIBLE (kg)', 390, y + 6, { width: 85, align: 'right' })
            .text('PRECIO REF.', 480, y + 6, { width: 85, align: 'right' })
          y += 20
          productos.forEach((item, index) => {
            if (y > 700) {
              doc.addPage()
              y = 45
            }
            if (index % 2 === 0) doc.rect(40, y, 532, 18).fill('#faf8f5')
            doc.fillColor('#222222').font('Helvetica').fontSize(7)
              .text(String(item.producto).slice(0, 24), 45, y + 5, { width: 130 })
              .text(String(item.lotes), 180, y + 5, { width: 40, align: 'right' })
              .text(Number(item.cantidadRegistradaKg).toLocaleString('es-CO'), 225, y + 5, { width: 80, align: 'right' })
              .text(Number(item.consumidoKg).toLocaleString('es-CO'), 310, y + 5, { width: 75, align: 'right' })
              .text(Number(item.disponibleKg).toLocaleString('es-CO'), 390, y + 5, { width: 85, align: 'right' })
              .text(item.precioReferencia == null ? 'No registrado' : `${Number(item.precioReferencia).toLocaleString('es-CO')} / ${item.unidadComercial || 'unidad'}`, 480, y + 5, { width: 85, align: 'right' })
            y += 18
          })

          doc.fontSize(7).fillColor('#666666').font('Helvetica')
            .text('El saldo disponible suma lotes evaluables en estado PENDIENTE o LIBERADO. Los lotes bloqueados y saldos no evaluables se excluyen. Las salidas consideran movimientos convertibles a kg. El precio de referencia se presenta como dato de catálogo y no se usa para valorizar inventario.', 40, 730, { width: 532, align: 'center' })
          doc.end()
        } catch (error) {
          reject(error)
        }
      })
    },

    async generateInventarioCsv(filters = {}) {
      if (!lotesModel) {
        throw new Error('lotesModel es requerido para exportar inventario')
      }
      const rows = await lotesModel.listInventoryCsv(filters)
      const headers = [
        'Identificador',
        'Código del lote',
        'Origen',
        'Cantidad recibida',
        'Unidad',
        'Saldo disponible (kg)',
        'Estado',
        'Costos asociados',
      ]
      const csvCell = (value) => {
        let text = value === null || value === undefined ? '' : String(value)
        if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
        return `"${text.replaceAll('"', '""')}"`
      }
      const lines = [headers, ...rows.map((row) => [
        row.id,
        row.codigo,
        row.origen,
        row.cantidadRecibida,
        row.unidad,
        row.saldoKg,
        row.estado,
        row.costos
          .map((cost) => `${cost.moneda}: ${Number(cost.total).toFixed(2)}`)
          .join('; '),
      ])]
      return `\uFEFF${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}\r\n`
    },
  }
}

module.exports = {
  createReportesService,
}
