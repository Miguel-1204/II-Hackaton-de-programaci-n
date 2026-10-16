require('dotenv').config()

const { createDatabase } = require('./src/config/db')
const { createApp } = require('./src/app')

const port = Number(process.env.PORT) || 3000
const { db } = createDatabase()
const app = createApp({ db })

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend escuchando en el puerto ${port}`)
})