/**
 * Datos de ejemplo para la sección "Productos más vendidos".
 * Más adelante estos datos podrían venir del backend (servicios en src/services).
 */
export const products = [
  {
    id: 1,
    name: 'Cacao en Polvo 100%',
    price: 15000,
    image: 'https://placehold.co/400x300/ff9900/ffffff?text=Prod+1',
    alt: 'Cacao en polvo 100%',
  },
  {
    id: 2,
    name: 'Granos de Cacao Tostado',
    price: 22500,
    image: 'https://placehold.co/400x300/ff9900/ffffff?text=Prod+2',
    alt: 'Granos de cacao tostado',
  },
  {
    id: 3,
    name: 'Nibs de Cacao Orgánico',
    price: 18000,
    image: 'https://placehold.co/400x300/ff9900/ffffff?text=Prod+3',
    alt: 'Nibs de cacao orgánico',
  },
]

export const formatPrice = (value) =>
  `$${value.toLocaleString('es-CO')}`