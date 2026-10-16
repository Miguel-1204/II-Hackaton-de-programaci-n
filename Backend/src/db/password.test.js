const assert = require('node:assert/strict')
const test = require('node:test')
const { hashPassword, verifyPassword } = require('../utils/password')

test('password hashes use scrypt and a fresh salt', async () => {
  const first = await hashPassword('example-only')
  const second = await hashPassword('example-only')

  assert.match(first, /^scrypt\$32768\$8\$1\$/)
  assert.notEqual(first, second)
  assert.notEqual(first, 'example-only')
  assert.equal(await verifyPassword('example-only', first), true)
  assert.equal(await verifyPassword('incorrect', first), false)
})

test('password hashing rejects an empty password', async () => {
  await assert.rejects(hashPassword(''), /no puede estar vacía/)
})

test('password verification rejects malformed hashes', async () => {
  assert.equal(await verifyPassword('password', 'not-a-hash'), false)
})
