/**
 * @fileoverview Controlador HTTP para catálogo comercial de productos, costos de transformación y márgenes.
 */

const {
  validateCreateProductoBody,
  validateCreateCostoBody,
} = require('../validators/productos.validator')

/**
 * Factoría que instancia el controlador de productos y costos.
 *
 * @param {Object} productosService - Servicio de productos.
 * @returns {Object} Métodos de manejo de peticiones Express.
 */
function createCostosProductosController(productosService) {
  if (!productosService) {
    throw new Error('productosService es requerido para el controlador')
  }

  return {
    async listProductosPublicos(request, response, next) {
      try {
        const productos = await productosService.listProductosPublicos()
        return response.status(200).json({ productos })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Registra un nuevo producto en el catálogo comercial.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async createProducto(request, response, next) {
      const validation = validateCreateProductoBody(request.body)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const nuevo = await productosService.createProducto(validation.value, request.user.id)
        return response.status(201).json(nuevo)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    /**
     * Lista todos los productos disponibles en el catálogo comercial.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async listProductos(request, response, next) {
      try {
        const productos = await productosService.listProductos()
        return response.status(200).json({ productos })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Obtiene un producto por su ID.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getProductoById(request, response, next) {
      const id = Number(request.params.id)
      if (!Number.isSafeInteger(id) || id <= 0) {
        return response.status(400).json({ error: 'ID de producto inválido' })
      }

      try {
        const prod = await productosService.getProductoById(id)
        return response.status(200).json(prod)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    async getFichaPublica(request, response, next) {
      const { codigo } = request.params
      if (!codigo || !codigo.trim() || codigo.length > 100) {
        return response.status(400).json({ error: 'Código de producto inválido' })
      }
      try {
        const ficha = await productosService.getFichaPublica(codigo.trim())
        return response.status(200).json(ficha)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    /**
     * Registra un costo directo en una transformación.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async addCosto(request, response, next) {
      const transformacionId = Number(request.params.id)
      if (!Number.isSafeInteger(transformacionId) || transformacionId <= 0) {
        return response.status(400).json({ error: 'ID de transformación inválido' })
      }

      const validation = validateCreateCostoBody(request.body)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const costo = await productosService.addCostoTransformacion(
          transformacionId,
          validation.value,
          request.user.id,
        )
        return response.status(201).json(costo)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    /**
     * Obtiene el cálculo de costos unitarios y márgenes de venta para una transformación.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getMargenes(request, response, next) {
      const transformacionId = Number(request.params.id)
      if (!Number.isSafeInteger(transformacionId) || transformacionId <= 0) {
        return response.status(400).json({ error: 'ID de transformación inválido' })
      }

      try {
        const margenes = await productosService.calculateMargenes(transformacionId)
        return response.status(200).json(margenes)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },
  }
}

module.exports = {
  createCostosProductosController,
}
