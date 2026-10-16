import { useParams, useNavigate } from "react-router-dom";
import { catalogProducts } from "../../data/catalogProducts";
import Navbar from "../../component/Navbar";
import Footer from "../../component/Footer";
import "./FichaCompleta.css";

export default function FichaCompleta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const producto = catalogProducts.find((p) => p.id === Number(id));

  if (!producto) {
    navigate("/nuestros-cacaos");
    return null;
  }

  const { trazabilidad, comercial, estado, lote, name } = producto;
  const isBloqueado = estado === "Bloqueado";

  return (
    <div className="min-h-screen flex flex-col bg-cacao-50 text-cacao-900 font-sans">
      <Navbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start mb-6 gap-4">
            <button
              onClick={() => navigate("/nuestros-cacaos")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-cacao-800 font-medium shadow-sm hover:bg-cacao-100 transition-colors"
            >
              Volver al catálogo
            </button>
            <div className="flex gap-2 ml-auto">
              <button className="px-4 py-2 rounded-lg bg-white text-cacao-800 font-medium shadow-sm hover:bg-cacao-100 transition-colors">
                Compartir
              </button>
              <button className="px-4 py-2 rounded-lg bg-cacao-800 text-white font-medium shadow-sm hover:bg-cacao-900 transition-colors">
                Ver QR
              </button>
            </div>
          </div>

          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-cacao-900 mb-2">
              {name}
            </h1>
            <p className="text-cacao-600 text-lg">Lote: {lote}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full bg-mazorca-600`} />
              <span className="font-bold text-lg text-mazorca-600">
                Estado: {estado}
              </span>
            </div>
            {isBloqueado && (
              <div className="mt-4 p-4 bg-mazorca-50 border border-mazorca-200 rounded-lg text-mazorca-700 text-sm">
                Este producto no está disponible para comercialización actualmente.
              </div>
            )}
          </div>
        </header>
        {/* Trazabilidad */}
        <section className="mb-8">
          <h2 className="font-display text-2xl font-bold text-cacao-800 mb-6">
            Origen y Trazabilidad
          </h2>
          <div className="space-y-6">
            {trazabilidad.map((paso, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-cacao-100 shadow-sm">
                <div>
                    <h3 className="font-bold text-cacao-800 mb-2">{paso.paso}</h3>
                    {paso.productor && (
                      <p className="text-cacao-600 mb-1"><strong>Productor:</strong> {paso.productor}</p>
                    )}
                    {paso.fechaRecepcion && (
                      <p className="text-cacao-600 mb-1"><strong>Fecha de recepción:</strong> {paso.fechaRecepcion}</p>
                    )}
                    {paso.cantidadRecibida && (
                      <p className="text-cacao-600 mb-1"><strong>Cantidad recibida:</strong> {paso.cantidadRecibida}</p>
                    )}
                    {paso.etapa && (
                      <p className="text-cacao-600 mb-1"><strong>Etapa:</strong> {paso.etapa}</p>
                    )}
                    {paso.fecha && (
                      <p className="text-cacao-600 mb-1"><strong>Fecha:</strong> {paso.fecha}</p>
                    )}
                    {paso.entrada && paso.salida && (
                      <p className="text-cacao-600 mb-1"><strong>Entrada:</strong> {paso.entrada}&nbsp;|&nbsp;<strong>Salida:</strong> {paso.salida}</p>
                    )}
                    {paso.rendimiento && (
                      <p className="text-cacao-600 mb-1"><strong>Rendimiento:</strong> {paso.rendimiento} (Merma del {paso.merma})</p>
                    )}
                    {paso.incidencias && (
                      <p className="text-cacao-600 mb-1"><strong>Incidencias:</strong> {paso.incidencias}</p>
                    )}
                    {paso.descripcion && (
                      <p className="text-cacao-700 mt-2">{paso.descripcion}</p>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </section>
        {/* Información Comercial */}
        <section className="mb-8">
          <div className="bg-cacao-100 p-6 rounded-xl border border-cacao-200">
            <h2 className="font-display text-2xl font-bold text-cacao-800 mb-4 flex items-center gap-2">
              Información Comercial Pública
            </h2>
            <div className="space-y-3">
              <p className="text-cacao-700"><strong>Presentación disponible:</strong> {comercial.presentacion}</p>
              <p className="text-cacao-700"><strong>Precio público de referencia:</strong> ${comercial.precioReferencia.toLocaleString("es-CO")} COP / kg</p>
              <p className="text-cacao-700"><strong>Valor total estimado:</strong> ${comercial.valorTotal.toLocaleString("es-CO")} COP</p>
              <p className="text-cacao-700"><strong>Condiciones:</strong> {comercial.condiciones}</p>
              <p className="text-cacao-700"><strong>Disponibilidad:</strong> {comercial.disponible ? "Sí" : "No"} ({comercial.stock})</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-8">
          <div className="bg-cacao-800 p-8 rounded-xl text-white text-center">
            <h2 className="font-display text-2xl font-bold mb-6">¿Interesado en este producto?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="flex-1 px-6 py-3 rounded-lg bg-white text-cacao-800 font-bold hover:bg-cacao-100 transition-colors">
                Solicitar cotización
              </button>
              <button className="flex-1 px-6 py-3 rounded-lg border-2 border-white text-white font-bold hover:bg-white/10 transition-colors">
                Contactar a la asociación
              </button>
            </div>
            <p className="mt-4 text-cacao-300 text-sm">
              Al hacer clic, se abre un formulario o se simula un enlace a WhatsApp (MVP).
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}