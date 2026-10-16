import { Link } from 'react-router-dom'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import './Nosotros.css'

const PASOS = [
  {
    titulo: 'Recepción',
    texto: 'Cada lote que llega se registra con su productor, origen, fecha y cantidad.',
  },
  {
    titulo: 'Transformación',
    texto: 'Seguimos cada etapa del proceso y medimos la merma para cuidar el rendimiento.',
  },
  {
    titulo: 'Ficha del producto',
    texto: 'El comprador consulta el origen y el estado con un enlace o un QR.',
  },
]

const ORIGENES = [
  { municipio: 'Rivera', lote: 'CAC001' },
  { municipio: 'Campoalegre', lote: 'CAC002' },
  { municipio: 'Algeciras', lote: 'CAC003' },
]

const DATOS = [
  { valor: '3', etiqueta: 'municipios del Huila' },
  { valor: '3', etiqueta: 'lotes con origen registrado' },
  { valor: '1', etiqueta: 'sistema de trazabilidad' },
]

/* Íconos simples en línea (heredan el color del texto) */
const Icono = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    width="26"
    height="26"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const IconoMision = () => (
  <Icono>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Icono>
)

const IconoVision = () => (
  <Icono>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icono>
)

const IconoUbicacion = () => (
  <Icono>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icono>
)

export default function Nosotros() {
  return (
    <div className="bg-cacao-50 text-cacao-900 font-sans min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Portada */}
        <section className="nosotros-hero">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
            <h1 className="nosotros-titulo font-display text-4xl font-semibold text-cacao-50 sm:text-5xl">
              Nosotros
            </h1>
            <p className="mt-4 max-w-xl text-lg text-cacao-100">
              Una asociación cacaotera del Huila que registra cada lote para que su origen se pueda
              consultar de principio a fin.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
          {/* Quiénes somos */}
          <section aria-labelledby="quienes" className="grid items-stretch gap-6 md:grid-cols-5">
            <div className="md:col-span-3">
              <h2
                id="quienes"
                className="nosotros-seccion-titulo font-display text-2xl font-semibold text-cacao-800"
              >
                Quiénes somos
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-cacao-700">
                <p>
                  Recibimos cacao seco de distintas fincas y lo transformamos para ofrecer productos
                  con origen conocido.
                </p>
                <p>
                  Antes llevábamos los registros en cuadernos y hojas de cálculo. Hoy los reunimos en
                  un solo sistema para saber qué entra, qué se transforma y qué se vende.
                </p>
              </div>
            </div>

            <aside
              aria-label="Datos del caso"
              className="nosotros-origen rounded-xl p-5 text-cacao-50 md:col-span-2"
            >
              <dl className="space-y-4">
                {DATOS.map((d) => (
                  <div key={d.etiqueta} className="flex items-center gap-4">
                    <dt className="font-display text-4xl font-semibold text-mazorca-400">
                      {d.valor}
                    </dt>
                    <dd className="text-sm text-cacao-100">{d.etiqueta}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </section>

          {/* Misión y visión */}
          <section className="grid gap-4 sm:grid-cols-2" aria-label="Misión y visión">
            <article className="nosotros-card rounded-xl border border-cacao-200 bg-white p-5">
              <span className="nosotros-icono">
                <IconoMision />
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold text-cacao-800">Misión</h2>
              <p className="mt-2 text-sm leading-relaxed text-cacao-700">
                Transformar y comercializar el cacao de nuestras fincas con registros claros y
                verificables.
              </p>
            </article>
            <article className="nosotros-card rounded-xl border border-cacao-200 bg-white p-5">
              <span className="nosotros-icono">
                <IconoVision />
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold text-cacao-800">Visión</h2>
              <p className="mt-2 text-sm leading-relaxed text-cacao-700">
                Ser reconocidos por un cacao del Huila cuyo origen y calidad el comprador puede
                comprobar por sí mismo.
              </p>
            </article>
          </section>

          {/* De la finca al comprador */}
          <section aria-labelledby="como">
            <h2
              id="como"
              className="nosotros-seccion-titulo font-display text-2xl font-semibold text-cacao-800"
            >
              De la finca al comprador
            </h2>
            <ol className="nosotros-pasos mt-5 grid gap-4 md:grid-cols-3">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="rounded-xl border border-cacao-200 bg-white p-5">
                  <span className="nosotros-numero" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-semibold text-cacao-800">{p.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-cacao-700">{p.texto}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Origen */}
          <section aria-labelledby="origen">
            <h2
              id="origen"
              className="nosotros-seccion-titulo font-display text-2xl font-semibold text-cacao-800"
            >
              Dónde nace nuestro cacao
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {ORIGENES.map((o) => (
                <li
                  key={o.lote}
                  className="nosotros-origen flex items-center gap-3 rounded-xl p-4 text-cacao-50"
                >
                  <span className="text-mazorca-400">
                    <IconoUbicacion />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold">{o.municipio}</p>
                    <p className="text-sm text-cacao-200">Lote {o.lote}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Cierre */}
          <section className="nosotros-cta flex flex-col items-start justify-between gap-4 rounded-xl p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-xl font-semibold text-cacao-800">
                ¿Quieres conocer nuestros productos?
              </h2>
              <p className="mt-1 text-sm text-cacao-700">
                Consulta el origen y el estado de cada lote.
              </p>
            </div>
            <Link
              to="/productos"
              className="rounded-lg bg-cacao-800 px-5 py-2.5 font-semibold text-cacao-50 hover:bg-cacao-900
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-mazorca-500
                         focus-visible:ring-offset-2 focus-visible:ring-offset-cacao-100"
            >
              Ver nuestros cacaos
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}