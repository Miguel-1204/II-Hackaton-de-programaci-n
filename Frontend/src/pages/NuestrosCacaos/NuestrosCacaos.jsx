import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../component/Navbar";
import Footer from "../../component/Footer";
import { obtenerCatalogoPublico, obtenerFichaTecnicaPublica } from "../../services/catalogoPublicoService";
import imagenFondo from "../../assets/Chocolate default.jpeg";
import "./NuestrosCacaos.css";

const formatoCOP = (valor) => valor == null
  ? 'No registrado'
  : `$ ${Number(valor).toLocaleString('es-CO')} COP`;

/**
 * Sección "Nuestros Cacaos" — Catálogo de productos.
 * Muestra la lista de productos en 3 columnas, con búsqueda por nombre
 * y por rango de precio, y efecto hover (tarjeta negra + nombre en blanco).
 */
export default function NuestrosCacaos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const navigate = useNavigate();

  // Estado del modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [errorFicha, setErrorFicha] = useState("");
  const [volteado, setVolteado] = useState(false);
  const solicitudFicha = useRef(0);

  useEffect(() => {
    let activo = true;
    const cargarCatalogo = () => {
      obtenerCatalogoPublico()
        .then((items) => {
          if (!activo) return;
          setProductos(items);
          setErrorCatalogo("");
        })
        .catch((error) => {
          if (activo && productos.length === 0) setErrorCatalogo(error.message);
        })
        .finally(() => { if (activo) setCargando(false); });
    };

    const actualizarAlVolver = () => {
      if (document.visibilityState === "visible") cargarCatalogo();
    };

    cargarCatalogo();
    const intervalo = window.setInterval(cargarCatalogo, 30000);
    window.addEventListener("focus", cargarCatalogo);
    document.addEventListener("visibilitychange", actualizarAlVolver);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", cargarCatalogo);
      document.removeEventListener("visibilitychange", actualizarAlVolver);
    };
  }, []);

  const productosFiltrados = useMemo(() => productos.filter((producto) => {
    const cumpleNombre = producto.name
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase());

    const min = Number(precioMin);
    const max = Number(precioMax);
    const precio = Number(producto.price);
    const cumpleMin = precioMin.trim() === "" || (Number.isFinite(precio) && precio >= min);
    const cumpleMax = precioMax.trim() === "" || (Number.isFinite(precio) && precio <= max);

    return cumpleNombre && cumpleMin && cumpleMax;
  }), [productos, busqueda, precioMin, precioMax]);

  const baseInputCompact =
    "w-full rounded-lg border bg-white px-3 py-2 text-cacao-900 " +
    "placeholder:text-cacao-500/60 focus:outline-none focus:ring-2 " +
    "focus:ring-mazorca-500 focus:border-mazorca-500 border-cacao-200";

  const abrirModal = async (producto) => {
    const solicitudActual = ++solicitudFicha.current;
    setProductoSeleccionado(producto);
    setFichaSeleccionada(null);
    setCargandoFicha(true);
    setErrorFicha("");
    setVolteado(false);
    setModalAbierto(true);
    try {
      const ficha = await obtenerFichaTecnicaPublica(producto.codigo);
      if (solicitudActual === solicitudFicha.current) setFichaSeleccionada(ficha);
    } catch (error) {
      if (solicitudActual === solicitudFicha.current) setErrorFicha(error.message || "No se pudo cargar la ficha del producto.");
    } finally {
      if (solicitudActual === solicitudFicha.current) setCargandoFicha(false);
    }
  };

  const cerrarModal = () => {
    solicitudFicha.current += 1;
    setModalAbierto(false);
    setProductoSeleccionado(null);
    setFichaSeleccionada(null);
    setErrorFicha("");
    setVolteado(false);
  };

  const manejarVoltear = () => {
    setVolteado((v) => !v);
  };

  const p = fichaSeleccionada;

  if (modalAbierto && productoSeleccionado) {
    return (
      <div className="min-h-screen flex flex-col bg-cacao-50 text-cacao-900 font-sans">
        <Navbar />

        {/* Modal Overlay */}
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={cerrarModal}
          role="dialog"
          aria-modal="true"
          aria-label="Ficha del producto"
        >
          <div
            className="w-full max-w-md max-h-[calc(100dvh_-_1rem)] my-auto p-0 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra superior del modal */}
            <div className="flex justify-between items-center p-4 bg-[#4a2a18] border-b border-cacao-200/50">
              <button
                onClick={manejarVoltear}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-cacao-800 text-sm font-medium shadow-sm hover:bg-cacao-200 transition-colors"
              >
                Código
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
            <div className="relative perspective-1000 h-[min(420px,calc(100dvh_-_180px))] min-h-[320px]">
              {cargandoFicha ? (
                <div className="h-full flex items-center justify-center bg-cacao-50 text-cacao-700" role="status">
                  Cargando ficha del producto…
                </div>
              ) : errorFicha ? (
                <div className="h-full flex items-center justify-center p-6 bg-cacao-50 text-peligro-600" role="alert">
                  {errorFicha}
                </div>
              ) : p && (
                <div className={`flip-inner w-full h-full transition-transform duration-500 ${volteado ? "rotate-y-180" : ""}`}>
                {/* FRENTE */}
                <div
                  className="flip-face flip-front absolute inset-0 overflow-y-auto bg-cacao-50 p-4 sm:p-8 backface-hidden flex flex-col items-center text-center"
                >
                  <h2 className="font-display text-xl font-bold text-cacao-900 mb-6">
                    {p.producto.nombre}
                  </h2>
                  <p className="-mt-4 mb-3 text-xs text-cacao-600">
                    {p.producto.descripcion || 'Sin descripción registrada.'}
                  </p>
                  <ul className="space-y-3 sm:space-y-5 text-cacao-700 text-xs sm:text-sm w-full max-w-md mx-auto">
                    <li className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between gap-1 px-2 text-left">
                      <span className="text-cacao-600">Origen:</span>
                      <span className="font-medium">{p.origenes.join(', ') || 'Sin trazabilidad de origen'}</span>
                    </li>
                    <li className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between gap-1 px-2 text-left">
                      <span className="text-cacao-600">Presentación:</span>
                      <span className="font-medium">
                        {formatoCOP(p.producto.precioReferencia)} / {p.producto.unidadComercial || 'unidad'}
                      </span>
                    </li>
                    <li className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between gap-1 px-2 text-left">
                      <span className="text-cacao-600">Estado:</span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.disponible ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                        <span className="font-medium text-mazorca-700">{p.estadoComercial}</span>
                      </span>
                    </li>
                    <li className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between gap-1 px-2 text-left">
                      <span className="text-cacao-600">Stock liberado:</span>
                      <span className="font-medium">{p.stockDisponibleKg.toLocaleString('es-CO')} kg</span>
                    </li>
                    <li className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between gap-1 px-2 text-left">
                      <span className="text-cacao-600">Lotes:</span>
                      <span className="font-medium">{p.lotes.map((lote) => lote.codigo).join(', ') || 'Sin lotes vinculados'}</span>
                    </li>
                  </ul>
                  <button
                    className="mt-auto pt-4 w-full rounded-lg bg-cacao-800 px-4 py-2.5 sm:py-3 font-semibold text-cacao-50 hover:bg-cacao-900 transition-colors"
                    onClick={() => navigate(`/ficha-completa/${encodeURIComponent(p.producto.codigo)}`)}
                  >
                    Ver ficha completa
                  </button>
                </div>

                {/* Código registrado en la base de datos */}
                <div
                  className="flip-face flip-back absolute inset-0 bg-cacao-50 p-6 backface-hidden flex flex-col items-center justify-center rotate-y-180"
                >
                  <p className="text-cacao-700 text-sm font-medium mb-3">
                    Código del producto registrado
                  </p>
                  <p className="font-mono text-2xl font-bold text-cacao-900">{p.producto.codigo}</p>
                </div>
              </div>
              )}
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
              <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold text-cacao-800">
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
        {cargando ? (
          <p className="text-center text-cacao-600" role="status">Cargando catálogo…</p>
        ) : errorCatalogo && productos.length === 0 ? (
          <p className="text-center text-peligro-600" role="alert">{errorCatalogo}</p>
        ) : productosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {productosFiltrados.map((producto) => (
              <article
                className="cacaos-card"
                key={producto.id}
                onClick={() => abrirModal(producto)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && abrirModal(producto)}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={producto.imagenUrl || imagenFondo}
                  alt={producto.name}
                  className="cacaos-product-image"
                  onError={(event) => { event.currentTarget.src = imagenFondo; }}
                />
                <span
                  className={`cacaos-availability ${producto.disponible ? "is-available" : "is-unavailable"}`}
                  aria-label={`Inventario: ${producto.disponible ? "Disponible" : "No disponible"}`}
                >
                  {producto.disponible ? "Disponible" : "No disponible"}
                </span>
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
