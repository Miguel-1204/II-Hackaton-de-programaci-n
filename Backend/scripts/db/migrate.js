require('dotenv').config()

const { migrate } = require('drizzle-orm/postgres-js/migrator')
const { createDatabase } = require('../../src/config/db')

async function main() {
  const { client, db } = createDatabase()
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('Migraciones pendientes aplicadas correctamente.')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('No se pudieron aplicar las migraciones:', error)
  process.exitCode = 1
})
