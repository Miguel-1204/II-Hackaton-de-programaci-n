const { promisify } = require('node:util')
const { randomBytes, scrypt } = require('node:crypto')

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

module.exports = { hashPassword }
