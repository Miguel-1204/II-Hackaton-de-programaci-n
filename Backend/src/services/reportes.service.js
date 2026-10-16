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
function createReportesService({ estadisticasModel }) {
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
      const resumen = await estadisticasModel.getResumenGlobal(filters)

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

          // 3. Resumen Ejecutivo (KPIs)
          const startY = 155
          doc.rect(40, startY, 532, 60).fillAndStroke('#f7f4ef', '#d4c7b8')
          doc.fillColor('#2c1810').fontSize(10).font('Helvetica-Bold')
            .text('RESUMEN GENERAL DEL PERÍODO', 50, startY + 8)

          doc.fontSize(9).font('Helvetica').fillColor('#333333')
          const metricas = resumen.metricasProcesamiento
          doc.text(`Total Entrada: ${metricas.totalEntradaKg.toLocaleString('es-CO')} kg`, 50, startY + 26)
          doc.text(`Total Salida: ${metricas.totalSalidaKg.toLocaleString('es-CO')} kg`, 180, startY + 26)
          doc.text(`Merma Acumulada: ${metricas.totalMermaKg.toLocaleString('es-CO')} kg (${metricas.mermaGlobalPorcentaje} %)`, 310, startY + 26)
          doc.text(`Alertas (> 15%): ${metricas.transformacionesConAlerta}`, 450, startY + 26)

          doc.text(`Lotes en Inventario: ${resumen.inventario.totalLotes} (${resumen.inventario.saldoTotalKg.toLocaleString('es-CO')} kg)`, 50, startY + 42)
          doc.text(`Lotes Bloqueados: ${resumen.inventario.lotesBloqueados}`, 240, startY + 42)
          doc.text(`Incidencias Abiertas: ${resumen.incidencias.abiertas}`, 400, startY + 42)

          // 4. Tabla de Detalle por Productor
          let tableY = startY + 80
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
              if (tableY > 700) {
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
  }
}

module.exports = {
  createReportesService,
}
