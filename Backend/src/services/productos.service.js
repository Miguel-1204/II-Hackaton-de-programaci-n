/**
 * @fileoverview Servicio de negocio para el catálogo comercial de productos, registro de costos y cálculo de márgenes.
 */

/**
 * Factoría que instancia el servicio de productos y costos.
 *
 * @param {Object} dependencies - Dependencias inyectadas.
 * @param {Object} dependencies.productosModel - Modelo de productos y costos.
 * @param {Object} dependencies.transformacionesModel - Modelo de transformaciones.
 * @returns {Object} Métodos de negocio para catálogo comercial, costos y márgenes.
 */
function createProductosService({ productosModel, transformacionesModel }) {
  if (!productosModel) {
    throw new Error('productosModel es una dependencia obligatoria')
  }

  return {
    /**
     * Registra un nuevo producto en el catálogo comercial verificando unicidad de código.
     *
     * @param {Object} data - Datos del producto comercial.
     * @returns {Promise<Object>} Producto creado.
     */
    async createProducto(data) {
      const existente = await productosModel.findByCodigo(data.codigo)
      if (existente) {
        const err = new Error(`Ya existe un producto registrado con el código "${data.codigo}"`)
        err.statusCode = 409
        throw err
      }

      return await productosModel.create(data)
    },

    /**
     * Obtiene el listado completo de productos del catálogo.
     *
     * @returns {Promise<Array<Object>>}
     */
    async listProductos() {
      return await productosModel.list()
    },

    /**
     * Obtiene un producto por su identificador único.
     *
     * @param {number} id - ID del producto.
     * @returns {Promise<Object>}
     */
    async getProductoById(id) {
      const prod = await productosModel.findById(id)
      if (!prod) {
        const err = new Error(`Producto con ID ${id} no encontrado`)
        err.statusCode = 404
        throw err
      }
      return prod
    },

    /**
     * Registra un nuevo costo de procesamiento en una transformación existente.
     *
     * @param {number} transformacionId - ID de la transformación.
     * @param {Object} data - Datos del costo (concepto, valor, moneda, observaciones).
     * @returns {Promise<Object>} Registro del costo creado.
     */
    async addCostoTransformacion(transformacionId, data) {
      if (transformacionesModel) {
        const trans = await transformacionesModel.findById(transformacionId)
        if (!trans) {
          const err = new Error(`Transformación con ID ${transformacionId} no encontrada`)
          err.statusCode = 404
          throw err
        }
      }

      return await productosModel.addCosto({
        transformacionId,
        concepto: data.concepto,
        valor: data.valor,
        moneda: data.moneda,
        observaciones: data.observaciones,
      })
    },

    /**
     * Calcula costos unitarios y márgenes comerciales de venta para los productos derivados de una transformación.
     *
     * @param {number} transformacionId - ID de la transformación.
     * @returns {Promise<Object>} Desglose de costos unitarios y márgenes de ganancia.
     */
    async calculateMargenes(transformacionId) {
      if (transformacionesModel) {
        const trans = await transformacionesModel.findById(transformacionId)
        if (!trans) {
          const err = new Error(`Transformación con ID ${transformacionId} no encontrada`)
          err.statusCode = 404
          throw err
        }
      }

      return await productosModel.calculateMargenes(transformacionId)
    },
  }
}

module.exports = {
  createProductosService,
}
