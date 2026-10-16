import { api } from './api'

export function consultarNlp(pregunta) {
  return api('/nlp/consultar', {
    method: 'POST',
    body: JSON.stringify({ pregunta }),
  })
}

export async function descargarBalanceProductosPdf(pregunta) {
  const response = await api('/reportes/balance-productos/pdf', {
    method: 'POST',
    body: JSON.stringify({ pregunta }),
  })
  return response.blob()
}
