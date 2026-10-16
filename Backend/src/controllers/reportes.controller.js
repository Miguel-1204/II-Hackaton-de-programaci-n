/**
 * @fileoverview Controlador HTTP para la descarga de reportes oficiales en formato PDF.
 */

const { validateEstadisticasQuery } = require('../validators/estadisticas.validator')

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
  }
}

module.exports = {
  createReportesController,
}
