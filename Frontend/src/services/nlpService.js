import { api, queryString } from './api'

export function consultarNlp(pregunta) {
  return api('/nlp/consultar', {
    method: 'POST',
    body: JSON.stringify({ pregunta }),
  })
}

export async function descargarConsultaPdf(pregunta) {
  const response = await api('/reportes/consulta/pdf', {
    method: 'POST',
    body: JSON.stringify({ pregunta }),
  })
  return response.blob()
}

export async function descargarReporteMermasPdf(filters = {}) {
  const response = await api(`/reportes/merma-productor/pdf${queryString(filters)}`)
  return response.blob()
}
