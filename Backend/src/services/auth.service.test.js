const assert = require('node:assert/strict')
const http = require('node:http')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const { createAuthenticationMiddleware, requireRoles } = require('../middlewares/auth.middleware')
const { createApp } = require('../app')
const { hashPassword } = require('../../scripts/db/password')
const { createAuthService } = require('./auth.service')

const JWT_SECRET = 'test-only-secret-with-at-least-32-bytes'
const users = new Map()

let server
let baseUrl
let operatorToken
let adminToken

function createTestAuthModel() {
  return {
    async findByEmail(email) {
      return [...users.values()].find((user) => user.correo === email) || null
    },
    async findById(id) {
      return users.get(id) || null
    },
  }
}

async function send(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: response.status, body: await response.json() }
}

test('auth API and role authorization', async (t) => {
  const password = 'test-password-not-for-production'
  const passwordHash = await hashPassword(password)
  users.set(1, {
    id: 1,
    nombre: 'Operador de prueba',
    correo: 'operador@example.test',
    passwordHash,
    activo: true,
    roles: ['OPERADOR'],
  })
  users.set(2, {
    id: 2,
    nombre: 'Administradora de prueba',
    correo: 'admin@example.test',
    passwordHash,
    activo: true,
    roles: ['ADMINISTRADOR'],
  })

  const authModel = createTestAuthModel()
  const authService = createAuthService({ authModel, jwtSecret: JWT_SECRET })
  const app = createApp({ authModel, jwtSecret: JWT_SECRET })
  app.get(
    '/api/operations',
    createAuthenticationMiddleware(authService),
    requireRoles('OPERADOR', 'ADMINISTRADOR'),
    (_request, response) => response.json({ allowed: true }),
  )
  app.get(
    '/api/admin',
    createAuthenticationMiddleware(authService),
    requireRoles('ADMINISTRADOR'),
    (_request, response) => response.json({ allowed: true }),
  )

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const operatorLogin = await send('/api/auth/login', {
    method: 'POST',
    body: { email: 'operador@example.test', password },
  })
  assert.equal(operatorLogin.status, 200, 'valid credentials should sign in')
  operatorToken = operatorLogin.body.token
  assert.ok(operatorToken)
  assert.equal(operatorLogin.body.user.passwordHash, undefined)
  assert.equal(operatorLogin.body.user.roles[0], 'OPERADOR')

  const adminLogin = await send('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@example.test', password },
  })
  assert.equal(adminLogin.status, 200)
  adminToken = adminLogin.body.token

  await t.test('rejects an incorrect password with a generic response', async () => {
    const result = await send('/api/auth/login', {
      method: 'POST',
      body: { email: 'operador@example.test', password: 'wrong-password' },
    })
    assert.equal(result.status, 401)
    assert.deepEqual(result.body, { error: 'Credenciales inválidas' })
  })

  await t.test('rejects an unknown account with the same generic response', async () => {
    const result = await send('/api/auth/login', {
      method: 'POST',
      body: { email: 'missing@example.test', password },
    })
    assert.equal(result.status, 401)
    assert.deepEqual(result.body, { error: 'Credenciales inválidas' })
  })

  await t.test('rejects requests without a token', async () => {
    const result = await send('/api/auth/me')
    assert.equal(result.status, 401)
  })

  await t.test('rejects invalid and expired tokens', async () => {
    const invalid = await send('/api/auth/me', { token: 'not-a-jwt' })
    assert.equal(invalid.status, 401)

    const expiredToken = jwt.sign({}, JWT_SECRET, {
      algorithm: 'HS256',
      subject: '1',
      issuer: 'hackaton-backend',
      expiresIn: -1,
    })
    const expired = await send('/api/auth/me', { token: expiredToken })
    assert.equal(expired.status, 401)
  })

  await t.test('allows operators to access operational routes', async () => {
    const result = await send('/api/operations', { token: operatorToken })
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { allowed: true })
  })

  await t.test('denies operators access to administrative routes', async () => {
    const result = await send('/api/admin', { token: operatorToken })
    assert.equal(result.status, 403)
  })

  await t.test('allows administrators to access administrative routes', async () => {
    const result = await send('/api/admin', { token: adminToken })
    assert.equal(result.status, 200)
  })

  await t.test('returns the authenticated public user and roles from /me', async () => {
    const result = await send('/api/auth/me', { token: operatorToken })
    assert.equal(result.status, 200)
    assert.deepEqual(result.body.user, {
      id: 1,
      nombre: 'Operador de prueba',
      correo: 'operador@example.test',
      roles: ['OPERADOR'],
    })
  })

  await t.test('never returns password hashes or credentials in auth responses', async () => {
    const result = await send('/api/auth/login', {
      method: 'POST',
      body: { email: 'operador@example.test', password },
    })
    assert.equal(result.status, 200)
    assert.equal(JSON.stringify(result.body).includes(password), false)
    assert.equal(JSON.stringify(result.body).includes(passwordHash), false)

    const me = await send('/api/auth/me', { token: result.body.token })
    assert.equal(JSON.stringify(me.body).includes(passwordHash), false)
    assert.equal(JSON.stringify(me.body).includes('passwordHash'), false)
  })

  t.after(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  })
})
