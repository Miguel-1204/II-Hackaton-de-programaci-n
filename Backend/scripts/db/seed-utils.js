require('dotenv').config()

const { createDatabase } = require('../../src/config/db')

async function runSeed(name, operation) {
  const { client, db } = createDatabase()
  try {
    await db.transaction(operation)
    console.log(`Seed ${name} ejecutado correctamente.`)
  } finally {
    await client.end()
  }
}

function runSeedCli(name, operation) {
  runSeed(name, operation).catch((error) => {
    console.error(`Error al ejecutar el seed ${name}:`, error)
    process.exitCode = 1
  })
}

module.exports = { runSeedCli }
