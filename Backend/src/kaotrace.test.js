/**
 * @fileoverview Pruebas automatizadas de procesamiento y analítica para Kaotrace (Tareas 1 a 9).
 * Valida conversiones, esquemas, transformaciones, mermas, alertas >15%, atribución,
 * costos y márgenes, trazabilidad, bloqueo administrativo, estadísticas, PDF y NLP.
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const { cantidadAKg } = require('./utils/conversion')
const { validateCreateTransformacionBody } = require('./validators/transformaciones.validator')
const { validateCreateProductoBody, validateCreateCostoBody } = require('./validators/productos.validator')
const { validateUpdateEstadoLoteBody, validateCreateIncidenciaBody } = require('./validators/incidencias-estados.validator')
const { validateEstadisticasQuery } = require('./validators/estadisticas.validator')
const { validateNlpQueryBody } = require('./validators/nlp.validator')

const { createTransformacionesService } = require('./services/transformaciones.service')
const { createProductosService } = require('./services/productos.service')
const { createTrazabilidadService } = require('./services/trazabilidad.service')
const { createIncidenciasEstadosService } = require('./services/incidencias-estados.service')
const { createEstadisticasService } = require('./services/estadisticas.service')
const { createReportesService } = require('./services/reportes.service')
const { createNlpService } = require('./services/nlp.service')
const { createApp } = require('./app')

describe('Kaotrace - Tarea 1 y 2: Conversión, Transformaciones, Mermas e Idempotencia', () => {
  it('cantidadAKg normaliza unidades a kilogramos y rechaza no comparables', () => {
    assert.equal(cantidadAKg(100, 'kg'), 100)
    assert.equal(cantidadAKg('50.5', 'kilogramos'), 50.5)
    assert.equal(cantidadAKg(1000, 'g'), 1)
    assert.equal(cantidadAKg(250, 'gramos'), 0.25)
    assert.equal(cantidadAKg(2, 't'), 2000)
    assert.equal(cantidadAKg(1.5, 'toneladas'), 1500)
    assert.equal(cantidadAKg(100, 'saco'), null)
    assert.equal(cantidadAKg('invalido', 'kg'), null)
  })

  it('valida el cuerpo de transformaciones rechazando datos incompletos o negativos', () => {
    assert.ok(validateCreateTransformacionBody(null).error)
    assert.ok(validateCreateTransformacionBody({ codigo: '' }).error)
    assert.ok(validateCreateTransformacionBody({ codigo: 'T1', etapa: 'SECADO', lotesEntrada: [] }).error)
    assert.ok(
      validateCreateTransformacionBody({
        codigo: 'T1',
        etapa: 'SECADO',
        lotesEntrada: [{ loteId: 1, cantidad: -10, unidad: 'kg' }],
        lotesSalida: [{ loteId: 2, cantidad: 5, unidad: 'kg' }],
      }).error,
    )

    const valido = validateCreateTransformacionBody({
      codigo: 'TR-2026-001',
      etapa: 'fermentacion',
      claveIdempotencia: 'IDEMP-123',
      lotesEntrada: [{ loteId: 1, cantidad: 100, unidad: 'KG' }],
      lotesSalida: [{ loteId: 2, cantidad: 80, unidad: 'KG' }],
      costos: [{ concepto: 'Mano de obra', valor: 50000, moneda: 'cop' }],
    })

    assert.equal(valido.error, undefined)
    assert.equal(valido.value.etapa, 'FERMENTACION')
    assert.equal(valido.value.costos[0].moneda, 'COP')
  })

  it('garantiza idempotencia si se provee clave_idempotencia ya existente', async () => {
    const existingTrans = {
      id: 99,
      codigo: 'TR-EXISTENTE',
      claveIdempotencia: 'IDEMP-UNIQUE-KEY',
      analiticaMerma: { merma_porcentaje: 10, supera_umbral: false },
    }

    const mockTransformacionesModel = {
      async findByClaveIdempotencia(key) {
        return key === 'IDEMP-UNIQUE-KEY' ? existingTrans : null
      },
      async findById(id) {
        return id === 99 ? existingTrans : null
      },
    }

    const mockLotesModel = {
      async findById() {
        return { id: 1, codigo: 'CAC001', estado: 'RECIBIDO' }
      },
      async getSaldoInventario() {
        return { saldoInventarioKg: 500 }
      },
    }

    const service = createTransformacionesService({
      transformacionesModel: mockTransformacionesModel,
      lotesModel: mockLotesModel,
    })

    const result = await service.createTransformacion({
      codigo: 'TR-REINTENTO',
      etapa: 'SECADO',
      claveIdempotencia: 'IDEMP-UNIQUE-KEY',
      lotesEntrada: [{ loteId: 1, cantidad: 10, unidad: 'kg' }],
      lotesSalida: [{ loteId: 2, cantidad: 9, unidad: 'kg' }],
    })

    assert.equal(result.idempotente, true)
    assert.equal(result.transformacion.id, 99)
  })

  it('rechaza procesar lotes en estado BLOQUEADO', async () => {
    const mockTransformacionesModel = {
      async findByClaveIdempotencia() { return null },
    }
    const mockLotesModel = {
      async findById(id) {
        if (id === 10) {
          return { id: 10, codigo: 'CAC-BLOQ', estado: 'BLOQUEADO' }
        }
        return { id: 20, codigo: 'CAC-OUT', estado: 'RECIBIDO' }
      },
      async getSaldoInventario() { return { saldoInventarioKg: 100 } },
    }

    const service = createTransformacionesService({
      transformacionesModel: mockTransformacionesModel,
      lotesModel: mockLotesModel,
    })

    await assert.rejects(
      () =>
        service.createTransformacion({
          codigo: 'TR-BLOQ',
          etapa: 'SECADO',
          lotesEntrada: [{ loteId: 10, cantidad: 50, unidad: 'kg' }],
          lotesSalida: [{ loteId: 20, cantidad: 40, unidad: 'kg' }],
        }),
      (err) => err.statusCode === 400 && err.message.includes('BLOQUEADO'),
    )
  })

  it('rechaza procesar si el saldo de inventario es insuficiente', async () => {
    const mockTransformacionesModel = {
      async findByClaveIdempotencia() { return null },
    }
    const mockLotesModel = {
      async findById() {
        return { id: 1, codigo: 'CAC001', estado: 'RECIBIDO' }
      },
      async getSaldoInventario() {
        return { saldoInventarioKg: 40 } // Solo 40 kg disponibles
      },
    }

    const service = createTransformacionesService({
      transformacionesModel: mockTransformacionesModel,
      lotesModel: mockLotesModel,
    })

    await assert.rejects(
      () =>
        service.createTransformacion({
          codigo: 'TR-INSUFICIENTE',
          etapa: 'FERMENTACION',
          lotesEntrada: [{ loteId: 1, cantidad: 100, unidad: 'kg' }], // Requiere 100 kg
          lotesSalida: [{ loteId: 2, cantidad: 80, unidad: 'kg' }],
        }),
      (err) => err.statusCode === 400 && err.message.includes('Saldo insuficiente'),
    )
  })

  it('genera alerta automática en incidencias cuando la merma supera el umbral del 15 %', async () => {
    let alertaCreada = false
    const mockTransformacionesModel = {
      async findByClaveIdempotencia() { return null },
      async create(data) {
        // Simulación: entrada 100 kg, salida 80 kg -> merma 20% (> 15%)
        alertaCreada = true
        return {
          transformacion: { id: 501, codigo: data.codigo },
          merma: { entrada_kg: 100, salida_kg: 80, merma_porcentaje: 20, supera_umbral: true },
          alertaGenerada: true,
        }
      },
    }
    const mockLotesModel = {
      async findById() {
        return { id: 1, codigo: 'CAC001', estado: 'RECIBIDO' }
      },
      async getSaldoInventario() {
        return { saldoInventarioKg: 200 }
      },
    }

    const service = createTransformacionesService({
      transformacionesModel: mockTransformacionesModel,
      lotesModel: mockLotesModel,
    })

    const result = await service.createTransformacion({
      codigo: 'TR-MERMA-ALTA',
      etapa: 'SECADO',
      lotesEntrada: [{ loteId: 1, cantidad: 100, unidad: 'kg' }],
      lotesSalida: [{ loteId: 2, cantidad: 80, unidad: 'kg' }],
    })

    assert.equal(alertaCreada, true)
    assert.equal(result.alertaGenerada, true)
    assert.equal(result.merma.supera_umbral, true)
    assert.equal(result.merma.merma_porcentaje, 20)
  })
})

describe('Kaotrace - Tarea 3: Catálogo Comercial, Costos y Márgenes de Venta', () => {
  it('registra productos y calcula costos unitarios y márgenes de venta', async () => {
    const mockProductosModel = {
      async findByCodigo() { return null },
      async create(data) { return { id: 1, ...data } },
      async calculateMargenes(transId) {
        return {
          transformacionId: transId,
          moneda: 'COP',
          costosTotal: 200000,
          totalSalidaKg: 80,
          productosDerivados: [
            {
              loteId: 2,
              loteCodigo: 'DERIV-01',
              productoNombre: 'Chocolate 70% Huila',
              cantidadSalida: 80,
              precioReferencia: 5000,
              costoUnitario: 2500, // 200000 / 80
              margenNeto: 2500,    // 5000 - 2500
              margenPorcentaje: 50, // (2500 / 5000) * 100
            },
          ],
        }
      },
    }

    const service = createProductosService({ productosModel: mockProductosModel })
    const producto = await service.createProducto({
      codigo: 'CHOC-70',
      nombre: 'Chocolate Premium 70%',
      precioReferencia: 5000,
      unidadComercial: 'Barra 100g',
    })

    assert.equal(producto.id, 1)
    assert.equal(producto.codigo, 'CHOC-70')

    const margenes = await service.calculateMargenes(100)
    assert.equal(margenes.costosTotal, 200000)
    assert.equal(margenes.productosDerivados[0].costoUnitario, 2500)
    assert.equal(margenes.productosDerivados[0].margenNeto, 2500)
    assert.equal(margenes.productosDerivados[0].margenPorcentaje, 50)
  })
})

describe('Kaotrace - Tarea 4: Trazabilidad Integral Bidireccional', () => {
  it('reconstruye el recorrido de materias primas y productos derivados', async () => {
    const mockTrazabilidadModel = {
      async getTrazabilidadCompleta(codigo) {
        if (codigo === 'CAC001') {
          return {
            lote: { id: 1, codigo: 'CAC001', cantidadRecibida: 100, unidad: 'kg' },
            productor: { id: 1, nombre: 'Finca El Paraíso', municipio: 'Rivera' },
            aguasArriba: [],
            aguasAbajo: [
              {
                transformacion: { transformacion_codigo: 'TR-SECADO-01', etapa: 'SECADO' },
                lotesSalida: [{ lote_codigo: 'SEC001', cantidad_obtenida: 82 }],
              },
            ],
            incidencias: [],
            historialEstados: [{ estadoAnterior: 'RECIBIDO', estadoNuevo: 'DISPONIBLE' }],
          }
        }
        return null
      },
    }

    const service = createTrazabilidadService({ trazabilidadModel: mockTrazabilidadModel })
    const trazabilidad = await service.getTrazabilidadPorCodigo('CAC001')

    assert.equal(trazabilidad.lote.codigo, 'CAC001')
    assert.equal(trazabilidad.productor.municipio, 'Rivera')
    assert.equal(trazabilidad.aguasAbajo.length, 1)
    assert.equal(trazabilidad.aguasAbajo[0].transformacion.etapa, 'SECADO')

    await assert.rejects(
      () => service.getTrazabilidadPorCodigo('NO-EXISTE'),
      (err) => err.statusCode === 404,
    )
  })
})

describe('Kaotrace - Tarea 5: Incidencias, Control de Estados y Bloqueo Administrativo', () => {
  it('exige estrictamente rol ADMINISTRADOR y motivo para cambiar estado de lotes', async () => {
    let estadoActualizado = false
    const mockIncidenciasEstadosModel = {
      async updateEstadoLote(loteId, usuarioId, estadoNuevo, motivo) {
        estadoActualizado = true
        return {
          lote: { id: loteId, estado: estadoNuevo },
          historial: { loteId, usuarioId, estadoNuevo, motivo },
        }
      },
    }

    const service = createIncidenciasEstadosService({
      incidenciasEstadosModel: mockIncidenciasEstadosModel,
    })

    const operario = { id: 2, nombre: 'Operario', roles: ['OPERADOR'] }
    const admin = { id: 1, nombre: 'Administrador', roles: ['ADMINISTRADOR'] }

    // 1. Operario intenta bloquear -> 403 Forbidden
    await assert.rejects(
      () => service.updateEstadoLote(3, operario, 'BLOQUEADO', 'Sospecha de hongos'),
      (err) => err.statusCode === 403 && err.message.includes('ADMINISTRADOR'),
    )

    // 2. Administrador intenta sin motivo -> 400 Bad Request
    await assert.rejects(
      () => service.updateEstadoLote(3, admin, 'BLOQUEADO', '   '),
      (err) => err.statusCode === 400 && err.message.includes('motivo es estrictamente obligatorio'),
    )

    // 3. Administrador con motivo válido -> 200 OK
    const result = await service.updateEstadoLote(3, admin, 'BLOQUEADO', 'Sospecha de contaminación cruzada')
    assert.equal(estadoActualizado, true)
    assert.equal(result.lote.estado, 'BLOQUEADO')
    assert.equal(result.historial.motivo, 'Sospecha de contaminación cruzada')
  })
})

describe('Kaotrace - Tarea 6, 7 y 8: Estadísticas, Reportes PDF e Intérprete NLP', () => {
  const mockEstadisticasModel = {
    async getResumenGlobal() {
      return {
        metricasProcesamiento: {
          totalTransformaciones: 3,
          transformacionesEvaluables: 3,
          transformacionesConAlerta: 1,
          totalEntradaKg: 300,
          totalSalidaKg: 250,
          totalMermaKg: 50,
          mermaGlobalPorcentaje: 16.67,
        },
        costosPorMoneda: [{ moneda: 'COP', total: 150000 }],
        inventario: { totalLotes: 3, saldoTotalKg: 330, lotesBloqueados: 1 },
        incidencias: { total: 2, abiertas: 1 },
      }
    },
    async getMermasPorProductor(filters = {}) {
      return [
        {
          transformacion_id: 1,
          transformacion_codigo: 'TR-RIV-01',
          etapa: 'SECADO',
          productor_nombre: 'CAC001',
          municipio: 'Rivera',
          entrada_kg: 100,
          salida_kg: 80,
          merma_kg: 20,
          merma_porcentaje: 20,
          estado_evaluacion: 'EVALUABLE',
          supera_umbral: true,
        },
      ]
    },
    async getCostos() {
      return [{ transformacion_id: 1, moneda: 'COP', costo_total: 150000 }]
    },
    async getEstadoLotes() {
      return [
        {
          lote_id: 3,
          lote_codigo: 'CAC003',
          productor_nombre: 'CAC003',
          estado_actual: 'BLOQUEADO',
          bloqueado: true,
          motivo_estado_actual: 'Humedad elevada',
        },
      ]
    },
    async getInventario() {
      return [
        { lote_id: 1, lote_codigo: 'CAC001', municipio: 'Rivera', saldo_inventario_kg: 100 },
      ]
    },
    async getIncidencias() {
      return [
        { incidencia_id: 1, lote_codigo: 'CAC001', tipo: 'MERMA_EXCESIVA', abierta: true },
      ]
    },
  }

  it('genera un buffer PDF válido y formateado con cabecera %PDF-', async () => {
    const reportesService = createReportesService({ estadisticasModel: mockEstadisticasModel })
    const pdfBuffer = await reportesService.generateMermaProductorPdf({ municipio: 'Rivera' }, { solicitante: 'Admin Test' })

    assert.ok(Buffer.isBuffer(pdfBuffer))
    assert.ok(pdfBuffer.length > 1000, 'El PDF debe tener un tamaño sustancial')
    const header = pdfBuffer.subarray(0, 5).toString('utf8')
    assert.equal(header, '%PDF-')
  })

  it('el intérprete NLP identifica intenciones, extrae municipios del Huila y responde en lenguaje natural', async () => {
    const nlpService = createNlpService({ estadisticasModel: mockEstadisticasModel })

    // Consulta 1: Merma en Rivera
    const resMerma = await nlpService.procesarConsulta('¿Cuál es la merma promedio en Rivera?')
    assert.equal(resMerma.intencionDetectada, 'CONSULTA_MERMA_PROMEDIO')
    assert.equal(resMerma.parametrosExtraidos.municipio, 'Rivera')
    assert.ok(resMerma.respuestaEnLenguajeNatural.includes('Rivera'))
    assert.ok(resMerma.respuestaEnLenguajeNatural.includes('20.00 %') || resMerma.respuestaEnLenguajeNatural.includes('20 %'))

    // Consulta 2: Lotes bloqueados
    const resBloqueados = await nlpService.procesarConsulta('¿Qué lotes están bloqueados actualmente?')
    assert.equal(resBloqueados.intencionDetectada, 'CONSULTA_LOTES_BLOQUEADOS')
    assert.ok(resBloqueados.respuestaEnLenguajeNatural.includes('CAC003'))
    assert.ok(resBloqueados.respuestaEnLenguajeNatural.includes('BLOQUEADO'))

    // Consulta 3: Costos
    const resCostos = await nlpService.procesarConsulta('¿Cuánto costó el procesamiento de cacao?')
    assert.equal(resCostos.intencionDetectada, 'CONSULTA_COSTOS_TOTALES')
    assert.ok(resCostos.respuestaEnLenguajeNatural.includes('150.000') || resCostos.respuestaEnLenguajeNatural.includes('150000'))

    // Consulta 4: Inventario
    const resInv = await nlpService.procesarConsulta('¿Cuál es el inventario disponible?')
    assert.equal(resInv.intencionDetectada, 'CONSULTA_SALDO_INVENTARIO')
    assert.ok(resInv.respuestaEnLenguajeNatural.includes('kg'))
  })
})

describe('Kaotrace - Tarea 9: Pruebas de Integración HTTP y Control de Acceso (Supertest)', () => {
  const adminUser = { id: 1, nombre: 'Admin', correo: 'admin@kaotrace.com', roles: ['ADMINISTRADOR'] }
  const operarioUser = { id: 2, nombre: 'Operario', correo: 'operario@kaotrace.com', roles: ['OPERADOR'] }

  const mockAuthService = {
    async authenticateToken(token) {
      if (token === 'admin-token') return adminUser
      if (token === 'operario-token') return operarioUser
      const err = new Error('Token inválido')
      err.name = 'AuthenticationError'
      throw err
    },
  }

  const mockEstadisticasModel = {
    async getResumenGlobal() {
      return {
        metricasProcesamiento: { totalTransformaciones: 1, totalEntradaKg: 100, totalSalidaKg: 80, totalMermaKg: 20, mermaGlobalPorcentaje: 20 },
        costosPorMoneda: [],
        inventario: { totalLotes: 1, saldoTotalKg: 100, lotesBloqueados: 0 },
        incidencias: { total: 0, abiertas: 0 },
      }
    },
    async getMermasPorProductor() {
      return [
        {
          transformacion_id: 1,
          transformacion_codigo: 'TR-DEMO',
          etapa: 'SECADO',
          productor_nombre: 'CAC001',
          municipio: 'Rivera',
          entrada_kg: 100,
          salida_kg: 80,
          merma_kg: 20,
          merma_porcentaje: 20,
          estado_evaluacion: 'EVALUABLE',
          supera_umbral: true,
        },
      ]
    },
    async getCostos() { return [] },
    async getInventario() { return [] },
    async getEstadoLotes() { return [] },
    async getIncidencias() { return [] },
  }

  const mockIncidenciasEstadosService = {
    async updateEstadoLote(loteId, user, estadoNuevo, motivo) {
      if (!user.roles.includes('ADMINISTRADOR')) {
        const err = new Error('Solo ADMINISTRADOR puede cambiar estado')
        err.statusCode = 403
        throw err
      }
      return { lote: { id: loteId, estado: estadoNuevo }, motivo }
    },
    async createIncidencia() { return { id: 1 } },
    async listIncidencias() { return [] },
    async getHistorialEstados() { return [] },
  }

  const estadisticasService = createEstadisticasService({ estadisticasModel: mockEstadisticasModel })
  const reportesService = createReportesService({ estadisticasModel: mockEstadisticasModel })
  const nlpService = createNlpService({ estadisticasModel: mockEstadisticasModel })

  const app = createApp({
    authService: mockAuthService,
    estadisticasService,
    reportesService,
    nlpService,
    incidenciasEstadosService: mockIncidenciasEstadosService,
  })

  it('GET /health responde 200 con estado ok', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
  })

  it('rutas protegidas rechazan peticiones sin token con 401', async () => {
    const res = await request(app).get('/api/estadisticas/resumen')
    assert.equal(res.status, 401)
  })

  it('GET /api/estadisticas/resumen responde 200 con token válido', async () => {
    const res = await request(app)
      .get('/api/estadisticas/resumen')
      .set('Authorization', 'Bearer admin-token')

    assert.equal(res.status, 200)
    assert.equal(res.body.metricasProcesamiento.totalTransformaciones, 1)
  })

  it('GET /api/reportes/merma-productor/pdf descarga documento binario PDF', async () => {
    const res = await request(app)
      .get('/api/reportes/merma-productor/pdf')
      .set('Authorization', 'Bearer admin-token')

    assert.equal(res.status, 200)
    assert.equal(res.headers['content-type'], 'application/pdf')
    assert.ok(res.headers['content-disposition'].includes('attachment'))
    assert.ok(res.body.length > 500)
  })

  it('POST /api/nlp/consultar restringe acceso a OPERADOR (403) y permite a ADMINISTRADOR (200)', async () => {
    // 1. Operario intenta acceder a NLP -> 403 Forbidden
    const resDenegada = await request(app)
      .post('/api/nlp/consultar')
      .set('Authorization', 'Bearer operario-token')
      .send({ pregunta: '¿Cuál es la merma en Rivera?' })

    assert.equal(resDenegada.status, 403)

    // 2. Administrador accede a NLP -> 200 OK
    const resPermitida = await request(app)
      .post('/api/nlp/consultar')
      .set('Authorization', 'Bearer admin-token')
      .send({ pregunta: '¿Cuál es la merma en Rivera?' })

    assert.equal(resPermitida.status, 200)
    assert.equal(resPermitida.body.intencionDetectada, 'CONSULTA_MERMA_PROMEDIO')
    assert.ok(resPermitida.body.respuestaEnLenguajeNatural)
  })

  it('PATCH /api/lotes/:id/estado bloquea a OPERADOR y permite a ADMINISTRADOR', async () => {
    const resOperario = await request(app)
      .patch('/api/lotes/1/estado')
      .set('Authorization', 'Bearer operario-token')
      .send({ estadoNuevo: 'BLOQUEADO', motivo: 'Motivo de prueba' })

    assert.equal(resOperario.status, 403)

    const resAdmin = await request(app)
      .patch('/api/lotes/1/estado')
      .set('Authorization', 'Bearer admin-token')
      .send({ estadoNuevo: 'BLOQUEADO', motivo: 'Sospecha de hongos' })

    assert.equal(resAdmin.status, 200)
    assert.equal(resAdmin.body.lote.estado, 'BLOQUEADO')
  })
})
