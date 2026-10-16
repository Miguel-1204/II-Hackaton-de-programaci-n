const { promisify } = require('node:util')
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto')

const scryptAsync = promisify(scrypt)
const parameters = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('La contraseña del administrador no puede estar vacía')
  }

  const salt = randomBytes(16)
  const derivedKey = await scryptAsync(password, salt, 64, parameters)
  return [
    'scrypt',
    parameters.N,
    parameters.r,
    parameters.p,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$')
}

async function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') {
    return false
  }

  const parts = passwordHash.split('$')
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== String(parameters.N) ||
    parts[2] !== String(parameters.r) ||
    parts[3] !== String(parameters.p) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[4]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[5])
  ) {
    return false
  }

  const salt = Buffer.from(parts[4], 'base64url')
  const expected = Buffer.from(parts[5], 'base64url')
  if (salt.length !== 16 || expected.length !== 64) {
    return false
  }

  const actual = await scryptAsync(password, salt, expected.length, parameters)
  return timingSafeEqual(actual, expected)
}

module.exports = { hashPassword, verifyPassword }
