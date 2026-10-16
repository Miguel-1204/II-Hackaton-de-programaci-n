const ESTILOS = {
  pendiente: 'bg-mazorca-500/20 text-cacao-800',
  liberado: 'bg-green-100 text-green-900',
  bloqueado: 'bg-peligro-600/10 text-peligro-600',
}

export default function BadgeEstado({ estado }) {
  const clave = (estado ?? '').toLowerCase()
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        ESTILOS[clave] ?? 'bg-cacao-100 text-cacao-700'
      }`}
    >
      {estado ?? 'sin estado'}
    </span>
  )
}