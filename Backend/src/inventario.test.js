const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { createApp } = require('./app')
const { validateReceptionBody } = require('./validators/recepciones.validator')

function buildApp() {
  const productoresService = {
    async create(data) {
      return { id: 10, ...data, activo: true }
    },
    async getById(id) {
      return { id, nombre: 'Productor de prueba', identificacion: 'CC-123', municipio: 'Rivera', activo: true }
    },
    async list() {
      return {
        items: [{ id: 10, nombre: 'Productor de prueba', identificacion: 'CC-123', municipio: 'Rivera', activo: true }],
        page: 1,
        limit: 25,
        total: 1,
      }
    },
    async update() {
      return { id: 10, nombre: 'Productor actualizado', identificacion: 'CC-123', municipio: 'Rivera', activo: true }
    },
    async deactivate() {
      return { id: 10, nombre: 'Productor actualizado', identificacion: 'CC-123', municipio: 'Rivera', activo: false }
    },
  }
  const inventarioService = {
    async receive(data, usuarioId) {
      return {
        id: 12,
        codigo: data.codigo,
        cantidadRecibida: data.cantidad,
        unidad: data.unidad,
        usuarioId,
        idempotente: false,
      }
    },
    async list() {
      return { items: [], page: 1, limit: 25, total: 0 }
    },
    async getBalance(id) {
      return { lote: { id }, inventario: { saldoInventarioKg: 12 } }
    },
    async listMovements() {
      return { items: [], page: 1, limit: 25, total: 0 }
    },
  }
  const authService = {
    async authenticateToken(token) {
      const roles = {
        admin: ['ADMINISTRADOR'],
        operator: ['OPERADOR'],
        guest: ['VISITANTE'],
      }[token]
      if (!roles) throw new Error('Token inválido')
      return { id: token === 'admin' ? 1 : 2, roles }
    },
  }
  return createApp({ authService, productoresService, inventarioService })
}

describe('API de productores y recepción de inventario', () => {
  it('valida recepciones comparables y normaliza unidades', () => {
    const result = validateReceptionBody({
      productorId: 2,
      codigo: 'CAC-TEST',
      cantidad: 1500,
      unidad: 'gramos',
      fechaRecepcion: '2026-06-01',
    }, 'rec-001')

    assert.equal(result.error, undefined)
    assert.equal(result.value.unidad, 'g')
    assert.equal(result.value.claveIdempotencia, 'recepcion:rec-001')
    assert.equal(validateReceptionBody({
      productorId: 2,
      codigo: 'CAC-TEST',
      cantidad: 5,
      unidad: 'saco',
    }, 'rec-002').error !== undefined, true)
    assert.equal(validateReceptionBody({
      productorId: 2,
      codigo: 'CAC-TEST',
      cantidad: 5,
      unidad: 'kg',
    }, undefined).error !== undefined, true)
  })

  it('exige autenticación y reserva la gestión de productores al administrador', async () => {
    const app = buildApp()

    await request(app).get('/api/inventario/lotes').expect(401)
    await request(app)
      .post('/api/productores')
      .set('Authorization', 'Bearer operator')
      .send({ nombre: 'A', identificacion: 'B', municipio: 'C' })
      .expect(403)
    await request(app)
      .post('/api/productores')
      .set('Authorization', 'Bearer admin')
      .send({ nombre: 'A', identificacion: 'B', municipio: 'C' })
      .expect(201)
  })

  it('oculta la identificación personal al operador y la incluye para el administrador', async () => {
    const app = buildApp()
    const operatorResponse = await request(app)
      .get('/api/productores')
      .set('Authorization', 'Bearer operator')
      .expect(200)
    const adminResponse = await request(app)
      .get('/api/productores')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    assert.equal(operatorResponse.body.items[0].identificacion, undefined)
    assert.equal(adminResponse.body.items[0].identificacion, 'CC-123')
  })

  it('permite la recepción operativa solo con Idempotency-Key y no filtra datos internos', async () => {
    const app = buildApp()
    await request(app)
      .post('/api/recepciones')
      .set('Authorization', 'Bearer operator')
      .send({ productorId: 3, codigo: 'CAC-12', cantidad: 10, unidad: 'kg' })
      .expect(400)

    const response = await request(app)
      .post('/api/recepciones')
      .set('Authorization', 'Bearer operator')
      .set('Idempotency-Key', 'recepcion-001')
      .send({ productorId: 3, codigo: 'CAC-12', cantidad: 10, unidad: 'kg' })
      .expect(201)

    assert.equal(response.body.lote.usuarioId, 2)
    assert.equal(JSON.stringify(response.body).includes('password'), false)
    assert.equal(JSON.stringify(response.body).includes('claveIdempotencia'), false)
  })

  it('reserva el bloqueo de lotes y transformaciones a los roles autorizados', async () => {
    const app = createApp({
      authService: {
        async authenticateToken() {
          return { id: 2, roles: ['VISITANTE'] }
        },
      },
      transformacionesService: {
        async listTransformaciones() {
          return []
        },
      },
    })

    await request(app)
      .get('/api/transformaciones')
      .set('Authorization', 'Bearer cualquier-token')
      .expect(403)
  })
})
