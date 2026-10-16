const postgres = require('postgres')
const { drizzle } = require('drizzle-orm/postgres-js')
const schema = require('../db/schema')

function createDatabase() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL no está configurada')
  }

  const client = postgres(connectionString, { max: 10 })
  const db = drizzle(client, { schema })

  return { client, db }
}

module.exports = { createDatabase }
