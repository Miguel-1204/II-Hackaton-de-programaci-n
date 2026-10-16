const { validateReceptionBody } = require('../validators/recepciones.validator')

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 25 : Number(query.limit)
  if (!Number.isSafeInteger(page) || page <= 0) return { error: 'page debe ser un entero positivo' }
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100) {
    return { error: 'limit debe ser un entero entre 1 y 100' }
  }
  return { value: { page, limit } }
}

function createInventarioController(inventarioService) {
  return {
    async receive(request, response, next) {
      const validation = validateReceptionBody(
        request.body,
        request.get('Idempotency-Key'),
      )
      if (validation.error) return response.status(400).json({ error: validation.error })
      try {
        const result = await inventarioService.receive(validation.value, request.user.id)
        return response.status(result.idempotente ? 200 : 201).json({ lote: result })
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },

    async list(request, response, next) {
      const pagination = parsePagination(request.query)
      if (pagination.error) return response.status(400).json({ error: pagination.error })
      const productorId = request.query.productorId === undefined
        ? undefined
        : Number(request.query.productorId)
      if (productorId !== undefined && (!Number.isSafeInteger(productorId) || productorId <= 0)) {
        return response.status(400).json({ error: 'productorId debe ser un entero positivo' })
      }
      for (const field of ['search', 'municipio', 'estado']) {
        if (request.query[field] !== undefined && typeof request.query[field] !== 'string') {
          return response.status(400).json({ error: `${field} debe ser texto` })
        }
      }

      try {
        const result = await inventarioService.list({
          ...pagination.value,
          productorId,
          search: request.query.search?.trim() || undefined,
          municipio: request.query.municipio?.trim()
            ? `%${request.query.municipio.trim()}%`
            : undefined,
          estado: request.query.estado?.trim().toUpperCase() || undefined,
        })
        return response.status(200).json(result)
      } catch (error) {
        return next(error)
      }
    },

    async getBalance(request, response, next) {
      const loteId = Number(request.params.id)
      if (!Number.isSafeInteger(loteId) || loteId <= 0) {
        return response.status(400).json({ error: 'ID de lote inválido' })
      }
      try {
        const result = await inventarioService.getBalance(loteId)
        return response.status(200).json(result)
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },

    async listMovements(request, response, next) {
      const loteId = Number(request.params.id)
      if (!Number.isSafeInteger(loteId) || loteId <= 0) {
        return response.status(400).json({ error: 'ID de lote inválido' })
      }
      const pagination = parsePagination(request.query)
      if (pagination.error) return response.status(400).json({ error: pagination.error })
      try {
        const result = await inventarioService.listMovements(loteId, pagination.value)
        return response.status(200).json(result)
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },
  }
}

module.exports = { createInventarioController }
