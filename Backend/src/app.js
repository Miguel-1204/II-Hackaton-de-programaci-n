const cors = require('cors')
const express = require('express')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

module.exports = app