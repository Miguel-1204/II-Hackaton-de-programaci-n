/**
 * @fileoverview Controlador HTTP para la descarga de reportes oficiales en formato PDF.
 */

const { validateEstadisticasQuery } = require('../validators/estadisticas.validator')
const { validateNlpQueryBody } = require('../validators/nlp.validator')

/**
 * Factoría que instancia el controlador de reportes PDF.
 *
 * @param {Object} reportesService - Servicio de reportes.
 * @returns {Object} Métodos de manejo de peticiones Express.
 */
function createReportesController(reportesService) {
  if (!reportesService) {
    throw new Error('reportesService es requerido para el controlador')
  }

  return {
    /**
     * Genera y descarga el informe oficial en PDF de mermas por productor y período.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async descargarReporteMermaPdf(request, response, next) {
      const validation = validateEstadisticasQuery(request.query)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const metadata = {
          solicitante: request.user?.nombre || 'Administrador Kaotrace',
        }

        const pdfBuffer = await reportesService.generateMermaProductorPdf(validation.value, metadata)
        const filename = `reporte-merma-kaotrace-${Date.now()}.pdf`

        response.setHeader('Content-Type', 'application/pdf')
        response.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        response.setHeader('Content-Length', pdfBuffer.length)

        return response.status(200).send(pdfBuffer)
      } catch (error) {
        return next(error)
      }
    },

    async descargarBalanceProductosPdf(request, response, next) {
      const validation = validateNlpQueryBody(request.body)
      if (validation.error) return response.status(400).json({ error: validation.error })
      try {
        const pdfBuffer = await reportesService.generateBalanceProductosPdf(validation.value.pregunta, {
          solicitante: request.user?.nombre || 'Administrador Kaotrace',
        })
        response.setHeader('Content-Type', 'application/pdf')
        response.setHeader('Content-Disposition', `attachment; filename="balance-productos-kaotrace-${Date.now()}.pdf"`)
        response.setHeader('Content-Length', pdfBuffer.length)
        return response.status(200).send(pdfBuffer)
      } catch (error) {
        if (error.status === 400) return response.status(400).json({ error: error.message })
        return next(error)
      }
    },

    async descargarConsultaPdf(request, response, next) {
      const validation = validateNlpQueryBody(request.body)
      if (validation.error) return response.status(400).json({ error: validation.error })
      try {
        const pdfBuffer = await reportesService.generateConsultaPdf(validation.value.pregunta, {
          solicitante: request.user?.nombre || 'Administrador Kaotrace',
        })
        response.setHeader('Content-Type', 'application/pdf')
        response.setHeader('Content-Disposition', `attachment; filename="consulta-kaotrace-${Date.now()}.pdf"`)
        response.setHeader('Content-Length', pdfBuffer.length)
        return response.status(200).send(pdfBuffer)
      } catch (error) {
        if (error.status === 400) return response.status(400).json({ error: error.message })
        return next(error)
      }
    },

    async descargarInventarioCsv(request, response, next) {
      const municipio = request.query.municipio
      const estado = request.query.estado
      if (municipio !== undefined && (
        typeof municipio !== 'string' ||
        !municipio.trim() ||
        municipio.length > 150
      )) {
        return response.status(400).json({ error: 'municipio debe ser texto de hasta 150 caracteres' })
      }
      const allowedStates = ['PENDIENTE', 'LIBERADO', 'BLOQUEADO']
      if (
        estado !== undefined &&
        (typeof estado !== 'string' || !allowedStates.includes(estado.trim().toUpperCase()))
      ) {
        return response.status(400).json({ error: 'estado no es válido' })
      }
      try {
        const csv = await reportesService.generateInventarioCsv({
          municipio: municipio ? `%${municipio.trim()}%` : undefined,
          estado: estado?.trim().toUpperCase(),
        })
        response.setHeader('Content-Type', 'text/csv; charset=utf-8')
        response.setHeader(
          'Content-Disposition',
          `attachment; filename="kaotrace-inventario-${Date.now()}.csv"`,
        )
        return response.status(200).send(csv)
      } catch (error) {
        return next(error)
      }
    },
  }
}

module.exports = {
  createReportesController,
}
