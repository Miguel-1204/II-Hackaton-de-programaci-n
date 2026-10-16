import { useState } from "react";
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
                  style={{
                    backgroundImage: `url(${imagenFondo})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
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
