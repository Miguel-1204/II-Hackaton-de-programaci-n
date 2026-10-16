function createAuditoriaController(auditoriaService) {
  if (!auditoriaService) {
    throw new Error('auditoriaService es requerido para el controlador')
  }

  return {
    async listEvents(_request, response, next) {
      try {
        const eventos = await auditoriaService.listEvents(500)
        return response.status(200).json({
          eventos: eventos.map((event) => ({
            id: Number(event.id),
            fecha: event.fecha_evento,
            usuario: event.usuario,
            entidad: event.entidad,
            entidadId: event.entidad_id,
            operacion: event.operacion,
            valoresAnteriores: event.valores_anteriores,
            valoresNuevos: event.valores_nuevos,
          })),
        })
      } catch (error) {
        return next(error)
      }
    },

    async listRecentMovements(_request, response, next) {
      try {
        const movimientos = await auditoriaService.listRecentMovements(10)
        return response.status(200).json({
          movimientos: movimientos.map((movement) => ({
            id: Number(movement.id),
            fecha: movement.creado_en,
            lote: movement.lote,
            tipo: movement.tipo_movimiento,
            cantidad: Number(movement.cantidad),
            unidad: movement.unidad,
            usuario: movement.usuario,
            operacion: movement.transformacion
              ? `Transformación ${movement.transformacion}`
              : movement.venta_id
                ? `Venta ${movement.venta_id}${movement.cliente ? ` a ${movement.cliente}` : ''}`
                : movement.tipo_movimiento === 'ENTRADA'
                  ? 'Recepción inicial'
                  : 'Salida de inventario',
          })),
        })
      } catch (error) {
        return next(error)
      }
    },
  }
}

module.exports = { createAuditoriaController }
