const assert = require('node:assert/strict')
const test = require('node:test')
const { hashPassword } = require('../../scripts/db/password')

test('password hashes use scrypt and a fresh salt', async () => {
  const first = await hashPassword('example-only')
  const second = await hashPassword('example-only')

  assert.match(first, /^scrypt\$32768\$8\$1\$/)
  assert.notEqual(first, second)
  assert.notEqual(first, 'example-only')
})

test('password hashing rejects an empty password', async () => {
  await assert.rejects(hashPassword(''), /no puede estar vacía/)
})
