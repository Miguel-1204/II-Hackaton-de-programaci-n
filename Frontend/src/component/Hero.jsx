import { useEffect, useState } from 'react'

// Fotografías reales de cacao alojadas en Unsplash; se indican como ilustrativas,
// pues no son fotografías documentales de las fincas del Huila.
const slides = [
  {
    image: 'https://images.unsplash.com/photo-1757466687609-0bdaca5578fc?auto=format&fit=crop&w=2200&q=85',
    alt: 'Mazorca de cacao amarilla y verde creciendo en el tronco del árbol',
    credit: 'Sebastian Schuster / Unsplash',
  },
  {
    image: 'https://images.unsplash.com/photo-1781453641585-a7c854ce66e9?auto=format&fit=crop&w=2200&q=85',
    alt: 'Mazorca de cacao en un bosque tropical',
    credit: 'Kawê Rodrigues / Unsplash',
  },
  {
    image: 'https://images.unsplash.com/photo-1781453640312-d183c4b2fb60?auto=format&fit=crop&w=2200&q=85',
    alt: 'Mazorca madura de cacao creciendo en un árbol',
    credit: 'Kawê Rodrigues / Unsplash',
  },
]

export default function Hero() {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % slides.length)
    }, 6500)
    return () => window.clearInterval(interval)
  }, [])

  const mover = (paso) => setIndice((actual) => (actual + paso + slides.length) % slides.length)
  const slide = slides[indice]

  return (
    <section className="relative w-full h-[50vh] min-h-[360px] md:h-[60vh] bg-cacao-900 overflow-hidden flex items-center justify-center group" aria-label="Carrusel de cacao">
      {slides.map((item, index) => (
        <img
          key={item.image}
          src={item.image}
          alt={item.alt}
          aria-hidden={index !== indice}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === indice ? 'opacity-100' : 'opacity-0'}`}
          fetchPriority={index === 0 ? 'high' : 'auto'}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-cacao-950/75 via-cacao-950/35 to-transparent" />

      <div className="relative z-10 w-full max-w-7xl px-8 sm:px-14 text-white">
        <p className="text-mazorca-300 uppercase tracking-[0.25em] text-xs sm:text-sm font-semibold mb-4">Cacao del Huila</p>
        <h1 className="max-w-2xl text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight">Del origen a cada producto</h1>
        <p className="max-w-xl mt-5 text-base sm:text-lg text-white/90">Conoce el cacao y los productos que hacen parte de nuestra historia.</p>
        <p className="mt-4 text-[11px] text-white/70">Fotografía ilustrativa: {slide.credit}</p>
      </div>

      <button type="button" onClick={() => mover(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white text-cacao-900 p-3 rounded-full shadow-lg transition z-20" aria-label="Imagen anterior">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <button type="button" onClick={() => mover(1)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white text-cacao-900 p-3 rounded-full shadow-lg transition z-20" aria-label="Imagen siguiente">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2" aria-label="Seleccionar imagen del carrusel">
        {slides.map((item, index) => <button key={item.image} type="button" onClick={() => setIndice(index)} aria-label={`Mostrar imagen ${index + 1}`} aria-current={index === indice} className={`h-2.5 rounded-full transition-all ${index === indice ? 'w-8 bg-white' : 'w-2.5 bg-white/60 hover:bg-white'}`} />)}
      </div>
    </section>
  )
}
