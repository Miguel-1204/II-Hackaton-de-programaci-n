import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { obtenerResumenOperador } from '../../services/operadorService'
import BadgeEstado from '../../component/BadgeEstado'
import './DashboardOperador.css'

const kg = (n) => `${Number(n ?? 0).toLocaleString('es-CO')} kg`

export default function DashboardOperador() {
  const { usuario } = useAuth()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setDatos(await obtenerResumenOperador())
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const inventario = datos?.inventario ?? []
  const mermas = datos?.mermas ?? []
  const alertas = mermas.filter((m) => m.alerta)
  const totalDisponible = inventario.reduce((s, l) => s + Number(l.disponible ?? 0), 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-cacao-800">Panel del operador</h1>
      <p className="mt-1 text-cacao-700">Hola, {usuario?.nombre}. ¿Qué vas a registrar hoy?</p>

      {/* Acciones */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/lotes/nuevo" className="op-boton op-boton-principal">
          Recibir lote
        </Link>
        <Link to="/transformaciones/nueva" className="op-boton">
          Registrar transformación
        </Link>
        <Link to="/lotes" className="op-boton">
          Consultar trazabilidad
        </Link>
      </div>

      {cargando && (
        <p role="status" className="mt-8 text-cacao-700">
          Cargando información…
        </p>
      )}

      {error && (
        <div role="alert" className="op-aviso mt-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-peligro-600">{error}</span>
          <button type="button" onClick={cargar} className="op-boton">
            Reintentar
          </button>
        </div>
      )}

      {datos && (
        <>
          {/* Resumen en una frase */}
          <p className="mt-8 text-cacao-800">
            Tienes <strong>{inventario.length}</strong>{' '}
            {inventario.length === 1 ? 'lote registrado' : 'lotes registrados'} y{' '}
            <strong>{kg(totalDisponible)}</strong> disponibles para transformar.
          </p>

          {/* Alertas */}
          <section aria-labelledby="alertas" className="mt-6">
            <h2 id="alertas" className="text-lg font-semibold text-cacao-800">
              Para revisar
            </h2>
            {alertas.length === 0 ? (
              <p className="mt-2 text-sm text-cacao-700">
                Ninguna transformación superó el límite de merma.
              </p>
            ) : (
              <div className="op-aviso mt-2">
                <p className="text-sm text-cacao-800">
                  La merma superó el 15 % en {alertas.length === 1 ? 'esta transformación' : 'estas transformaciones'}:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cacao-700">
                  {alertas.map((a) => (
                    <li key={a.id}>
                      <strong>{a.codigo}</strong>, {a.etapa}: {a.merma_pct} % de merma
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Existencias */}
          <section aria-labelledby="existencias" className="mt-8">
            <h2 id="existencias" className="text-lg font-semibold text-cacao-800">
              Lotes
            </h2>
            {inventario.length === 0 ? (
              <p className="mt-2 text-sm text-cacao-700">
                Todavía no hay lotes. Empieza con «Recibir lote».
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="op-tabla w-full text-left text-sm">
                  <caption className="sr-only">
                    Cantidades recibidas, consumidas y disponibles por lote
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Lote</th>
                      <th scope="col">Origen</th>
                      <th scope="col">Recibido</th>
                      <th scope="col">Consumido</th>
                      <th scope="col">Disponible</th>
                      <th scope="col">Estado</th>
                      <th scope="col">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.map((l) => (
                      <tr key={l.id}>
                        <th scope="row">{l.codigo}</th>
                        <td>{l.origen}</td>
                        <td>{kg(l.recibido)}</td>
                        <td>{kg(l.consumido)}</td>
                        <td>{kg(l.disponible)}</td>
                        <td>
                          <BadgeEstado estado={l.estado} />
                        </td>
                        <td>
                          <Link to={`/lotes/${l.id}`} className="op-enlace">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}