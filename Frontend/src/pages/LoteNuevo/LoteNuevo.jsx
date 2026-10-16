import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import {
  crearLote,
  obtenerCatalogosLote,
  sugerirCodigoLote,
} from '../../services/lotesService'
import '../DashboardOperador/DashboardOperador.css'

const hoy = () => new Date().toLocaleDateString('en-CA') // AAAA-MM-DD en hora local

const FORM_INICIAL = {
  codigo: '',
  productor_id: '',
  producto_id: '',
  fecha_recepcion: hoy(),
  cantidad: '',
  tipo_material: '',
}

const TIPOS_MATERIAL = ['Cacao en baba', 'Cacao fermentado', 'Cacao seco']

function Campo({ id, label, error, ayuda, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cacao-800">
        {label}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-xs text-cacao-700">{ayuda}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-peligro-600">
          {error}
        </p>
      )}
    </div>
  )
}

export default function LoteNuevo() {
  const navigate = useNavigate()
  const { showMessage } = useToast()

  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [catalogos, setCatalogos] = useState({ productores: [], productos: [] })
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [intento, setIntento] = useState(0)

  // Carga productores, productos y el código sugerido
  useEffect(() => {
    let activo = true
    ;(async () => {
      try {
        const [cat, codigo] = await Promise.all([obtenerCatalogosLote(), sugerirCodigoLote()])
        if (!activo) return
        setCatalogos(cat)
        setForm((prev) => ({ ...prev, codigo: prev.codigo || codigo }))
      } catch (err) {
        if (activo) setErrorCarga(err.message)
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [intento])

  const reintentar = () => {
    setCargando(true)
    setErrorCarga('')
    setIntento((n) => n + 1)
  }

  const cambiar = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'codigo' ? value.toUpperCase() : value,
    }))
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: '' }))
    if (errorGeneral) setErrorGeneral('')
  }

  const validar = () => {
    const nuevos = {}
    const codigo = form.codigo.trim()
    const cantidad = Number(form.cantidad)

    if (!codigo) nuevos.codigo = 'Escribe el código del lote.'
    else if (!/^[A-Z0-9-]{3,100}$/.test(codigo))
      nuevos.codigo = 'Usa solo letras, números y guiones (mínimo 3 caracteres).'

    if (!form.productor_id) nuevos.productor_id = 'Selecciona el productor.'

    if (!form.fecha_recepcion) nuevos.fecha_recepcion = 'Indica la fecha de recepción.'
    else if (form.fecha_recepcion > hoy())
      nuevos.fecha_recepcion = 'La fecha no puede ser futura.'

    if (!form.cantidad) nuevos.cantidad = 'Escribe la cantidad recibida.'
    else if (!(cantidad > 0)) nuevos.cantidad = 'La cantidad debe ser mayor que cero.'
    else if (cantidad >= 100000000) nuevos.cantidad = 'La cantidad es demasiado grande.'

    if (form.tipo_material.length > 150)
      nuevos.tipo_material = 'Máximo 150 caracteres.'

    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando || !validar()) return

    setEnviando(true)
    setErrorGeneral('')
    try {
      const lote = await crearLote({
        codigo: form.codigo.trim(),
        productor_id: Number(form.productor_id),
        producto_id: form.producto_id ? Number(form.producto_id) : null,
        fecha_recepcion: form.fecha_recepcion,
        cantidad: Number(form.cantidad),
        unidad: 'kg',
        tipo_material: form.tipo_material.trim() || null,
      })
      showMessage(`Lote ${lote.codigo} registrado correctamente`)
      // Cuando exista /lotes, cambiar el destino a '/lotes'
      navigate('/operador', { replace: true })
    } catch (err) {
      setErrorGeneral(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const clase = (campo) =>
    `w-full rounded-lg border bg-white px-4 py-2.5 text-cacao-900 placeholder:text-cacao-500/60
     focus:outline-none focus:ring-2 focus:ring-mazorca-500 focus:border-mazorca-500
     ${errores[campo] ? 'border-peligro-600' : 'border-cacao-200'}`

  const aria = (campo) => ({
    'aria-invalid': !!errores[campo],
    'aria-describedby': errores[campo] ? `${campo}-error` : undefined,
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-cacao-800">Recibir lote</h1>
      <p className="mt-1 text-cacao-700">
        Registra la entrada de un lote de cacao. Quedará con estado «pendiente» y su
        cantidad disponible en inventario.
      </p>

      {cargando && (
        <p role="status" className="mt-8 text-cacao-700">
          Cargando información…
        </p>
      )}

      {errorCarga && (
        <div role="alert" className="op-aviso mt-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-peligro-600">{errorCarga}</span>
          <button type="button" onClick={reintentar} className="op-boton">
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !errorCarga && (
        <form onSubmit={enviar} noValidate className="mt-6 space-y-5">
          {errorGeneral && (
            <div role="alert" className="op-aviso text-sm text-peligro-600">
              {errorGeneral}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="codigo" label="Código del lote" error={errores.codigo} ayuda="Sugerido, puedes cambiarlo.">
              <input
                id="codigo"
                name="codigo"
                type="text"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={100}
                value={form.codigo}
                onChange={cambiar}
                className={clase('codigo')}
                placeholder="CAC004"
                {...aria('codigo')}
              />
            </Campo>

            <Campo id="fecha_recepcion" label="Fecha de recepción" error={errores.fecha_recepcion}>
              <input
                id="fecha_recepcion"
                name="fecha_recepcion"
                type="date"
                max={hoy()}
                value={form.fecha_recepcion}
                onChange={cambiar}
                className={clase('fecha_recepcion')}
                {...aria('fecha_recepcion')}
              />
            </Campo>
          </div>

          <Campo id="productor_id" label="Productor (origen)" error={errores.productor_id}>
            <select
              id="productor_id"
              name="productor_id"
              value={form.productor_id}
              onChange={cambiar}
              className={clase('productor_id')}
              {...aria('productor_id')}
            >
              <option value="">Selecciona un productor</option>
              {catalogos.productores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.municipio ? `, ${p.municipio}` : ''}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="producto_id" label="Producto (opcional)" error={errores.producto_id}>
            <select
              id="producto_id"
              name="producto_id"
              value={form.producto_id}
              onChange={cambiar}
              className={clase('producto_id')}
            >
              <option value="">Sin producto asociado</option>
              {catalogos.productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="cantidad" label="Cantidad recibida (kg)" error={errores.cantidad}>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.001"
                value={form.cantidad}
                onChange={cambiar}
                className={clase('cantidad')}
                placeholder="100"
                {...aria('cantidad')}
              />
            </Campo>

            <Campo id="tipo_material" label="Tipo de material (opcional)" error={errores.tipo_material}>
              <input
                id="tipo_material"
                name="tipo_material"
                type="text"
                list="tipos-material"
                maxLength={150}
                value={form.tipo_material}
                onChange={cambiar}
                className={clase('tipo_material')}
                {...aria('tipo_material')}
              />
              <datalist id="tipos-material">
                {TIPOS_MATERIAL.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Campo>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={enviando} className="op-boton op-boton-principal">
              {enviando ? 'Guardando…' : 'Registrar lote'}
            </button>
            <Link to="/operador" className="op-boton">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
