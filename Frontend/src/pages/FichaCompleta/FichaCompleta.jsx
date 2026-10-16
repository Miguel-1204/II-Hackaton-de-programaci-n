import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import { obtenerFichaTecnicaPublica } from '../../services/catalogoPublicoService'
import './FichaCompleta.css'

const moneda = (valor) => valor == null
  ? 'No registrado'
  : `$ ${Number(valor).toLocaleString('es-CO')} COP`

const fecha = (valor) => {
  if (!valor) return 'No registrada'
  const raw = String(valor)
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw)
  return Number.isNaN(parsed.getTime()) ? String(valor) : parsed.toLocaleDateString('es-CO')
}

export default function FichaCompleta() {
  const { id: codigo } = useParams()
  const navigate = useNavigate()
  const [ficha, setFicha] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    obtenerFichaTecnicaPublica(codigo)
      .then((data) => { if (activo) setFicha(data) })
      .catch((err) => { if (activo) setError(err.message || 'No se pudo cargar la ficha técnica.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [codigo])

  const volver = () => navigate('/nuestros-cacaos')
  const producto = ficha?.producto

  return (
    <div className="min-h-screen flex flex-col bg-cacao-50 text-cacao-900 font-sans">
      <Navbar />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <button
            onClick={volver}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-cacao-800 font-medium shadow-sm hover:bg-cacao-100 transition-colors"
          >
            Volver al catálogo
          </button>
          {cargando ? (
            <p role="status" className="text-center py-12 text-cacao-700">Cargando ficha técnica…</p>
          ) : error ? (
            <div role="alert" className="text-center py-12 text-peligro-600">{error}</div>
          ) : producto && (
            <div className="text-center">
              <p className="font-mono text-sm text-cacao-600">{producto.codigo}</p>
              <h1 className="font-display text-3xl font-bold text-cacao-900 mb-2">{producto.nombre}</h1>
              <p className="text-cacao-600">{producto.descripcion || 'Sin descripción registrada.'}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${ficha.disponible ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                <span className="font-bold text-lg text-cacao-700">Estado comercial: {ficha.estadoComercial}</span>
              </div>
            </div>
          )}
        </header>

        {!cargando && !error && ficha && (
          <>
            <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Resumen del producto">
              <div className="bg-white p-5 rounded-xl border border-cacao-200">
                <h2 className="font-semibold text-cacao-800">Origen registrado</h2>
                <p className="mt-2 text-cacao-600">{ficha.origenes.length ? ficha.origenes.join(', ') : 'Sin trazabilidad de origen asociada.'}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-cacao-200">
                <h2 className="font-semibold text-cacao-800">Stock liberado</h2>
                <p className="mt-2 text-cacao-600">{Number(ficha.stockDisponibleKg || 0).toLocaleString('es-CO')} kg</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-cacao-200">
                <h2 className="font-semibold text-cacao-800">Precio de referencia</h2>
                <p className="mt-2 text-cacao-600">{moneda(producto.precioReferencia)}{producto.unidadComercial ? ` / ${producto.unidadComercial}` : ''}</p>
              </div>
            </section>

            <section className="mb-8" aria-labelledby="lotes-producto-titulo">
              <h2 id="lotes-producto-titulo" className="font-display text-2xl font-bold text-cacao-800 mb-5">Lotes y trazabilidad</h2>
              {ficha.lotes.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-cacao-200 text-cacao-600">
                  Aún no hay lotes vinculados a este producto en la base de datos.
                </div>
              ) : (
                <div className="space-y-5">
                  {ficha.lotes.map((lote) => (
                    <article key={lote.id} className="bg-white p-6 rounded-xl border border-cacao-200 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-mono text-lg font-bold text-cacao-900">Lote {lote.codigo}</h3>
                          <p className="text-sm text-cacao-600">Recibido: {fecha(lote.fechaRecepcion)}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-cacao-100 text-cacao-800">{lote.estado}</span>
                      </div>
                      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div><dt className="text-cacao-500">Cantidad registrada</dt><dd className="font-semibold">{lote.cantidad} {lote.unidad}</dd></div>
                        <div><dt className="text-cacao-500">Material</dt><dd className="font-semibold">{lote.tipoMaterial || 'No especificado'}</dd></div>
                        <div><dt className="text-cacao-500">Productor / municipio</dt><dd className="font-semibold">{lote.productor || 'No registrado'}{lote.municipio ? ` · ${lote.municipio}` : ''}</dd></div>
                        <div><dt className="text-cacao-500">Saldo actual</dt><dd className="font-semibold">{lote.disponibleKg == null ? 'No evaluable' : `${Number(lote.disponibleKg).toLocaleString('es-CO')} kg`}</dd></div>
                      </dl>

                      {lote.trazabilidad.length === 0 ? (
                        <p className="mt-5 border-t border-cacao-100 pt-4 text-sm text-cacao-600">No hay transformaciones de origen asociadas a este lote.</p>
                      ) : (
                        <div className="mt-5 border-t border-cacao-100 pt-4 space-y-4">
                          <h4 className="font-semibold text-cacao-800">Procesos vinculados</h4>
                          {lote.trazabilidad.map((paso) => (
                            <div key={paso.clave} className="rounded-lg bg-cacao-50 p-4 text-sm">
                              <p className="font-semibold text-cacao-900">{paso.transformacion} · {paso.etapa}</p>
                              <p className="mt-1 text-cacao-700">Fecha: {fecha(paso.fechaProcesamiento)}</p>
                              <p className="text-cacao-700">Entrada: {paso.cantidadEntrada} {paso.unidadEntrada} desde lote {paso.loteEntrada}</p>
                              <p className="text-cacao-700">Productor: {paso.productor || 'No registrado'}{paso.municipioOrigen ? ` (${paso.municipioOrigen})` : ''}</p>
                              <p className="text-cacao-700">Salida: {paso.cantidadSalida} {paso.unidadSalida}</p>
                              {paso.mermaPorcentaje != null && (
                                <p className="text-cacao-700">Merma: {paso.mermaKg} kg ({paso.mermaPorcentaje} %)</p>
                              )}
                              {paso.incidencias.length > 0 && (
                                <div className="mt-2 border-t border-cacao-200 pt-2">
                                  <p className="font-semibold">Incidencias registradas</p>
                                  {paso.incidencias.map((incidencia, index) => (
                                    <p key={`${paso.clave}-inc-${index}`} className="text-cacao-700">
                                      {incidencia.tipo} · {incidencia.severidad} · {incidencia.estado}: {incidencia.descripcion}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-8" aria-labelledby="comercial-titulo">
              <div className="bg-cacao-100 p-6 rounded-xl border border-cacao-200">
                <h2 id="comercial-titulo" className="font-display text-2xl font-bold text-cacao-800 mb-4">Información comercial registrada</h2>
                <div className="space-y-2 text-cacao-700">
                  <p><strong>Unidad comercial:</strong> {producto.unidadComercial || 'No especificada'}</p>
                  <p><strong>Precio de referencia:</strong> {moneda(producto.precioReferencia)}</p>
                  <p><strong>Disponibilidad:</strong> {ficha.disponible ? 'Sí' : 'No'}</p>
                  <p><strong>Stock liberado:</strong> {Number(ficha.stockDisponibleKg || 0).toLocaleString('es-CO')} kg</p>
                  <p><strong>Lotes registrados:</strong> {ficha.lotes.length}</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
