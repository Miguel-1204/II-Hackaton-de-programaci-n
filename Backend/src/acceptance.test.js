const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { createApp } = require('./app')
const { validateCreateCostoBody, validateCreateProductoBody } = require('./validators/productos.validator')
const { validateCreateTransformacionBody } = require('./validators/transformaciones.validator')
const { validateUpdateEstadoLoteBody } = require('./validators/incidencias-estados.validator')
const { createReportesService } = require('./services/reportes.service')

function createAcceptanceApp() {
  return createApp({
    authService: {
      async authenticateToken(token) {
        const roles = {
          admin: ['ADMINISTRADOR'],
          operator: ['OPERADOR'],
        }[token]
        if (!roles) {
          const error = new Error('Invalid token')
          error.name = 'AuthenticationError'
          throw error
        }
        return { id: token === 'admin' ? 1 : 2, nombre: 'Usuario de prueba', roles }
      },
    },
    productosService: {
      async createProducto(data) { return { id: 10, ...data } },
      async listProductos() { return [] },
      async getProductoById(id) { return { id } },
      async getFichaPublica(codigo) {
        return {
          producto: { codigo, nombre: 'Chocolate de prueba' },
          estadoComercial: 'BLOQUEADO',
          disponible: false,
          origenes: ['La Plata'],
          lotes: [{ codigo: 'SAL-01', trazabilidad: [{ loteEntrada: 'CAC-01', municipioOrigen: 'La Plata' }] }],
        }
      },
      async addCostoTransformacion() { return { id: 5 } },
      async calculateMargenes() { return { costosTotal: 1600000 } },
    },
    estadisticasService: {
      async getResumenGlobal() { return { metricasProcesamiento: { totalTransformaciones: 0 } } },
      async getMermasPorProductor() { return [] },
      async getCostos() { return [] },
      async getInventario() { return [] },
      async getEstadoLotes() { return [] },
      async getIncidencias() { return [] },
    },
    reportesService: {
      async generateMermaProductorPdf() { return Buffer.from('%PDF-test') },
      async generateInventarioCsv() { return '\uFEFFIdentificador,Código\r\n1,CAC001\r\n' },
    },
  })
}

describe('Auditoría de cumplimiento Kaotrace', () => {
  it('restringe estadísticas, costos y productos internos al rol administrativo', async () => {
    const app = createAcceptanceApp()
    await request(app).get('/api/estadisticas/resumen').set('Authorization', 'Bearer operator').expect(403)
    await request(app).get('/api/estadisticas/resumen').set('Authorization', 'Bearer admin').expect(200)
    await request(app).post('/api/productos').set('Authorization', 'Bearer operator')
      .send({ codigo: 'P1', nombre: 'Producto' }).expect(403)
    await request(app).post('/api/productos/5/costos')
      .set('Authorization', 'Bearer operator')
      .send({ concepto: 'Energía', valor: 1, moneda: 'COP' })
      .expect(403)
    await request(app).get('/api/productos/5/margenes')
      .set('Authorization', 'Bearer operator')
      .expect(403)
    await request(app).get('/api/reportes/merma-productor/pdf')
      .set('Authorization', 'Bearer operator')
      .expect(403)
    await request(app).get('/api/reportes/inventario.csv')
      .set('Authorization', 'Bearer operator')
      .expect(403)
  })

  it('expone una ficha comercial limitada sin autenticación ni datos internos', async () => {
    const response = await request(createAcceptanceApp())
      .get('/api/public/productos/PROD-1')
      .expect(200)

    assert.equal(response.body.estadoComercial, 'BLOQUEADO')
    assert.equal(response.body.disponible, false)
    const body = JSON.stringify(response.body).toLowerCase()
    for (const forbidden of ['costo', 'precio', 'identificacion', 'productorid', 'password', 'token']) {
      assert.equal(body.includes(forbidden), false, `${forbidden} no debe exponerse`)
    }
  })

  it('valida filtros y devuelve un CSV UTF-8 descargable solo al administrador', async () => {
    const app = createAcceptanceApp()
    await request(app).get('/api/reportes/inventario.csv')
      .set('Authorization', 'Bearer admin')
      .query({ estado: 'SIN_ESTADO' })
      .expect(400)
    const response = await request(app).get('/api/reportes/inventario.csv?municipio=La%20Plata&estado=LIBERADO')
      .set('Authorization', 'Bearer admin')
      .expect(200)
    assert.match(response.headers['content-type'], /text\/csv; charset=utf-8/)
    assert.match(response.headers['content-disposition'], /attachment/)
    assert.ok(response.text.startsWith('\uFEFF'))
  })

  it('escapa CSV, conserva acentos y resume costos por moneda sin exponer información privada', async () => {
    const service = createReportesService({
      estadisticasModel: {},
      lotesModel: {
        async listInventoryCsv() {
          return [{
            id: 1,
            codigo: '=HYPERLINK("x")',
            origen: 'La Plata, Huila',
            cantidadRecibida: 80,
            unidad: 'kg',
            saldoKg: 80,
            estado: 'LIBERADO',
            costos: [{ moneda: 'COP', total: 1600000 }],
          }]
        },
      },
    })
    const csv = await service.generateInventarioCsv()
    assert.ok(csv.startsWith('\uFEFF'))
    assert.ok(csv.includes('"La Plata, Huila"'))
    assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'))
    assert.ok(csv.includes('"COP: 1600000.00"'))
    assert.equal(csv.includes('identificacion'), false)
  })

  it('rechaza cantidades cero, unidades no comparables y estados arbitrarios', () => {
    const base = {
      codigo: 'TR-TEST',
      etapa: 'SECADO',
      lotesEntrada: [{ loteId: 1, cantidad: 1, unidad: 'kg' }],
      lotesSalida: [{ loteId: 2, cantidad: 1, unidad: 'kg' }],
    }
    assert.ok(validateCreateTransformacionBody({
      ...base,
      lotesEntrada: [{ loteId: 1, cantidad: 0, unidad: 'kg' }],
    }).error)
    assert.ok(validateCreateTransformacionBody({
      ...base,
      lotesSalida: [{ loteId: 2, cantidad: 1, unidad: 'saco' }],
    }).error)
    assert.equal(validateUpdateEstadoLoteBody({ estadoNuevo: 'LIBERADO', motivo: 'Control aprobado' }).error, undefined)
    assert.ok(validateUpdateEstadoLoteBody({ estadoNuevo: 'ELIMINADO', motivo: 'x' }).error)
  })

  it('valida datos de costos/productos, incluyendo límites decimales y precio cero', () => {
    assert.equal(validateCreateProductoBody({
      codigo: 'P-0',
      nombre: 'Producto sin precio',
      precioReferencia: 0,
      unidadComercial: 'kg',
    }).error, undefined)
    assert.ok(validateCreateProductoBody({
      codigo: 'P-1',
      nombre: 'Producto',
      precioReferencia: 'invalido',
    }).error)
    assert.ok(validateCreateProductoBody({
      codigo: 'P-2',
      nombre: 'Producto',
      precioReferencia: 1.239,
    }).error)
    assert.ok(validateCreateCostoBody({ concepto: 'Energía', valor: -1, moneda: 'COP' }).error)
    assert.ok(validateCreateCostoBody({ concepto: 'Energía', valor: 'x', moneda: 'COP' }).error)
    assert.equal(validateCreateCostoBody({ concepto: 'Energía', valor: 0, moneda: 'COP' }).error, undefined)
  })
})
