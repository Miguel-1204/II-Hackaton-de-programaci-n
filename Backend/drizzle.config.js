require('dotenv').config()

const { defineConfig } = require('drizzle-kit')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL debe estar configurada en Backend/.env')
}

module.exports = defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
})
