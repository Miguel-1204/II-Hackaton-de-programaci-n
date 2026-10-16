import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../component/Navbar";
import Footer from "../../component/Footer";
import { catalogProducts } from "../../data/catalogProducts";
import imagenFondo from "../../assets/Chocolate default.jpeg";
import "./NuestrosCacaos.css";

/**
 * Sección "Nuestros Cacaos" — Catálogo de productos.
 * Muestra la lista de productos en 3 columnas, con búsqueda por nombre
 * y por rango de precio, y efecto hover (tarjeta negra + nombre en blanco).
 */
export default function NuestrosCacaos() {
  const [busqueda, setBusqueda] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const navigate = useNavigate();

  // Estado del modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [volteado, setVolteado] = useState(false);

  const productosFiltrados = catalogProducts.filter((producto) => {
    const cumpleNombre = producto.name
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase());

    const min = Number(precioMin);
    const max = Number(precioMax);
    const cumpleMin = precioMin.trim() === "" || producto.price >= min;
    const cumpleMax = precioMax.trim() === "" || producto.price <= max;

    return cumpleNombre && cumpleMin && cumpleMax;
  });

  const baseInputCompact =
    "w-full rounded-lg border bg-white px-3 py-2 text-cacao-900 " +
    "placeholder:text-cacao-500/60 focus:outline-none focus:ring-2 " +
    "focus:ring-mazorca-500 focus:border-mazorca-500 border-cacao-200";

  const abrirModal = (producto) => {
    setProductoSeleccionado(producto);
    setVolteado(false);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoSeleccionado(null);
    setVolteado(false);
  };

  const manejarVoltear = () => {
    setVolteado((v) => !v);
  };

  const p = productoSeleccionado;

  if (modalAbierto && p) {
    return (
      <div className="min-h-screen flex flex-col bg-cacao-50 text-cacao-900 font-sans">
        <Navbar />

        {/* Modal Overlay */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={cerrarModal}
          role="dialog"
          aria-modal="true"
          aria-label="Ficha del producto"
        >
          <div
            className="w-full max-w-md p-0 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra superior del modal */}
            <div className="flex justify-between items-center p-4 bg-[#4a2a18] border-b border-cacao-200/50">
              <button
                onClick={manejarVoltear}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-cacao-800 text-sm font-medium shadow-sm hover:bg-cacao-200 transition-colors"
              >
                QR
              </button>
              <button
                onClick={cerrarModal}
                className="w-8 h-8 rounded-full bg-white text-cacao-600 flex items-center justify-center text-sm font-bold shadow-sm hover:bg-cacao-200 transition-colors"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Contenido del modal con efecto flip */}
            <div className="relative perspective-1000 h-[420px]">
              <div
                className={`flip-inner w-full h-full transition-transform duration-500 ${
                  volteado ? "rotate-y-180" : ""
                }`}
              >
                {/* FRENTE */}
                <div
                  className="flip-face flip-front absolute inset-0 bg-cacao-50 p-8 backface-hidden flex flex-col items-center text-center"
                >
                  <h2 className="font-display text-xl font-bold text-cacao-900 mb-6">
                    {p.name} - Lote {p.lote}
                  </h2>
                  <ul className="space-y-5 text-cacao-700 text-sm w-full max-w-md mx-auto">
                    <li className="flex justify-between px-2">
                      <span className="text-cacao-600">Origen:</span>
                      <span className="font-medium">{p.origen}</span>
                    </li>
                    <li className="flex justify-between px-2">
                      <span className="text-cacao-600">Presentación:</span>
                      <span className="font-medium">{p.presentacion}</span>
                    </li>
                    <li className="flex justify-between items-center px-2">
                      <span className="text-cacao-600">Estado:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-mazorca-600" />
                        <span className="font-medium text-mazorca-700">{p.estado}</span>
                      </span>
                    </li>
                  </ul>
                  <button
                    className="mt-6 w-full rounded-lg bg-cacao-800 px-4 py-3 font-semibold text-cacao-50 hover:bg-cacao-900 transition-colors"
                    onClick={() => navigate(`/ficha-completa/${p.id}`)}
                  >
                    Ver ficha completa
                  </button>
                </div>

                {/* REVERSO (código QR) */}
                <div
                  className="flip-face flip-back absolute inset-0 bg-cacao-50 p-6 backface-hidden flex flex-col items-center justify-center rotate-y-180"
                >
                  <div className="w-32 h-32 bg-white border-4 border-cacao-200 rounded-lg flex items-center justify-center mb-4 shadow-inner">
                    <svg
                      className="w-full h-full text-cacao-600"
                      viewBox="0 0 100 100"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="100" height="100" fill="none" />
                      <rect x="10" y="10" width="8" height="8" stroke="currentColor" strokeWidth="4" />
                      <rect x="82" y="10" width="8" height="8" stroke="currentColor" strokeWidth="4" />
                      <rect x="10" y="82" width="8" height="8" stroke="currentColor" strokeWidth="4" />
                      <rect x="82" y="82" width="8" height="8" stroke="currentColor" strokeWidth="4" />
                      <rect x="30" y="30" width="40" height="40" stroke="currentColor" strokeWidth="3" />
                      <rect x="35" y="35" width="30" height="30" fill="currentColor" />
                      <rect x="40" y="40" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <p className="text-cacao-700 text-sm font-medium">
                    Código QR del producto
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cacao-50 text-cacao-900 font-sans">
      <Navbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Encabezado */}
        <header className="text-center mb-10">
          <p className="font-display text-lg font-semibold text-cacao-700">
            Catálogo
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-cacao-800">
            Nuestros Cacaos
          </h1>
          <p className="mt-3 text-cacao-600">
            Explora y filtra nuestros productos de cacao.
          </p>
        </header>

        {/* Barra de búsqueda */}
        <section className="mb-8">
          <div className="rounded-xl p-4 shadow-sm bg-[#f5efe9]">
            <label
              htmlFor="busqueda"
              className="mb-1 block text-xs font-medium text-cacao-800"
            >
              Buscar por nombre
            </label>
            <input
              id="busqueda"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej.: chocolate, licor, polvo…"
              autoComplete="off"
              className={baseInputCompact}
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <label
                htmlFor="precioMin"
                className="text-xs font-medium text-cacao-800 sm:w-36"
              >
                Precio (desde
              </label>
              <input
                id="precioMin"
                type="number"
                min="0"
                value={precioMin}
                onChange={(e) => setPrecioMin(e.target.value)}
                placeholder="Mínimo"
                className={`${baseInputCompact} sm:max-w-32`}
              />
              <span className="text-xs text-cacao-600 sm:text-center">—</span>
              <label
                htmlFor="precioMax"
                className="text-xs font-medium text-cacao-800 sm:w-24"
              >
                hasta)
              </label>
              <input
                id="precioMax"
                type="number"
                min="0"
                value={precioMax}
                onChange={(e) => setPrecioMax(e.target.value)}
                placeholder="Máximo"
                className={`${baseInputCompact} sm:max-w-32`}
              />
            </div>
          </div>
        </section>

        {/* Resultado: productos en 3 columnas */}
        {productosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {productosFiltrados.map((producto) => (
              <article
                className="cacaos-card"
                key={producto.id}
                onClick={() => abrirModal(producto)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && abrirModal(producto)}
                style={{
                  backgroundImage: `url(${imagenFondo})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: "pointer",
                }}
              >
                {/* Capa que aparece al hacer hover: negra + nombre en blanco */}
                <div className="cacaos-overlay">
                  <span className="font-display text-2xl font-semibold">
                    {producto.name}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center text-cacao-600">
            No encontramos productos con esos criterios.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
