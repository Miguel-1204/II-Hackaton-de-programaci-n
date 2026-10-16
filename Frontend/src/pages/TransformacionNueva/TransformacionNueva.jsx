import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import {
  crearTransformacion,
  obtenerLotesDisponibles,
  sugerirCodigoTransformacion,
} from '../../services/transformacionesService'
import { UMBRAL_MERMA, UNIDADES, aKg, calcularMerma } from '../../utils/merma'
import './TransformacionNueva.css'

const ETAPAS = ['Limpieza', 'Fermentación', 'Secado y selección', 'Tostado']

const TIPOS_INCIDENCIA = [
  { valor: 'CALIDAD', texto: 'Calidad' },
  { valor: 'HUMEDAD', texto: 'Humedad' },
  { valor: 'CONTAMINACION', texto: 'Contaminación' },
  { valor: 'EQUIPO', texto: 'Falla de equipo' },
  { valor: 'OTRA', texto: 'Otra' },
]

const SEVERIDADES = [
  { valor: 'BAJA', texto: 'Baja' },
  { valor: 'MEDIA', texto: 'Media' },
  { valor: 'ALTA', texto: 'Alta' },
]

let contador = 0
const filaMovimiento = () => ({ key: ++contador, lote_id: '', cantidad: '', unidad: 'kg' })
const filaIncidencia = () => ({
  key: ++contador,
  lote_id: '',
  tipo: 'CALIDAD',
  severidad: 'MEDIA',
  descripcion: '',
})

const nuevaClave = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

const fmt = (n) => Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })
const esBloqueado = (l) => (l.estado ?? '').toLowerCase() === 'bloqueado'

export default function TransformacionNueva() {
  const navigate = useNavigate()
  const { showMessage } = useToast()
  // Una clave por formulario: si el envío se repite, no se duplica la transformación
  const [claveIdempotencia] = useState(nuevaClave)

  const [form, setForm] = useState({ codigo: '', etapa: '', observaciones: '' })
  const [entradas, setEntradas] = useState(() => [filaMovimiento()])
  const [salidas, setSalidas] = useState(() => [filaMovimiento()])
  const [incidencias, setIncidencias] = useState([])

  const [lotes, setLotes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [intento, setIntento] = useState(0)

  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let activo = true
    ;(async () => {
      try {
        const [lista, codigo] = await Promise.all([
          obtenerLotesDisponibles(),
          sugerirCodigoTransformacion(),
        ])
        if (!activo) return
        setLotes(lista)
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

  const loteDe = (id) => lotes.find((l) => String(l.id) === String(id))
  const lotesEntrada = lotes.filter((l) => !esBloqueado(l) && Number(l.disponible) > 0)
  const lotesElegidos = entradas.map((e) => loteDe(e.lote_id)).filter(Boolean)

  // Merma en vivo: se recalcula con cada cambio de cantidades
  const merma = useMemo(() => calcularMerma(entradas, salidas), [entradas, salidas])

  const limpiarError = (id) =>
    setErrores((prev) => {
      if (!prev[id]) return prev
      const { [id]: _quitado, ...resto } = prev
      return resto
    })

  const cambiarForm = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'codigo' ? value.toUpperCase() : value }))
    limpiarError(name)
    setErrorGeneral('')
  }

  const cambiarFila = (setFilas, prefijo, key, campo, valor) => {
    setFilas((filas) => filas.map((f) => (f.key === key ? { ...f, [campo]: valor } : f)))
    limpiarError(`${prefijo}-${key}-${campo}`)
    setErrorGeneral('')
  }

  const elegirLoteEntrada = (key, valor) =>
    cambiarFila(setEntradas, 'ent', key, 'lote_id', valor)

  const quitarFila = (setFilas, key) => setFilas((filas) => filas.filter((f) => f.key !== key))

  const validar = () => {
    const nuevos = {}
    let general = ''
    const codigo = form.codigo.trim()

    if (!codigo) nuevos.codigo = 'Escribe el código de la transformación.'
    else if (!/^[A-Z0-9-]{3,100}$/.test(codigo))
      nuevos.codigo = 'Usa solo letras, números y guiones (mínimo 3 caracteres).'

    if (!form.etapa) nuevos.etapa = 'Selecciona la etapa.'

    const revisarFila = (prefijo, f, conSaldo) => {
      const idL = `${prefijo}-${f.key}-lote_id`
      const idC = `${prefijo}-${f.key}-cantidad`
      const lote = loteDe(f.lote_id)
      const cantidad = Number(f.cantidad)

      if (!f.lote_id) nuevos[idL] = 'Selecciona el lote.'
      if (!f.cantidad) nuevos[idC] = 'Escribe la cantidad.'
      else if (!(cantidad > 0)) nuevos[idC] = 'Debe ser mayor que cero.'
      else if (conSaldo && lote && aKg(cantidad, f.unidad) > Number(lote.disponible))
        nuevos[idC] = `Solo hay ${fmt(lote.disponible)} kg disponibles en ${lote.codigo}.`
    }

    entradas.forEach((f) => revisarFila('ent', f, true))
    salidas.forEach((f) => {
      const idC = `sal-${f.key}-cantidad`
      const cantidad = Number(f.cantidad)
      if (!f.cantidad) nuevos[idC] = 'Escribe la cantidad.'
      else if (!(cantidad > 0)) nuevos[idC] = 'Debe ser mayor que cero.'
    })

    incidencias.forEach((i) => {
      if (!i.lote_id) nuevos[`inc-${i.key}-lote_id`] = 'Selecciona el lote afectado.'
      if (!i.descripcion.trim()) nuevos[`inc-${i.key}-descripcion`] = 'Describe qué ocurrió.'
    })

    if (merma.estado === 'SALIDA_MAYOR')
      general = 'La salida no puede ser mayor que la entrada. Revisa las cantidades.'
    if (merma.supera && !form.observaciones.trim())
      nuevos.observaciones = `La merma superó el ${UMBRAL_MERMA} %: escribe la justificación.`

    setErrores(nuevos)
    setErrorGeneral(general)
    return Object.keys(nuevos).length === 0 && !general
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando || !validar()) return

    const movimiento = (f) => ({
      lote_id: Number(f.lote_id),
      cantidad: Number(f.cantidad),
      unidad: f.unidad,
    })

    setEnviando(true)
    setErrorGeneral('')
    try {
      const r = await crearTransformacion({
        codigo: form.codigo.trim(),
        etapa: form.etapa,
        observaciones: form.observaciones.trim(),
        clave_idempotencia: claveIdempotencia,
        entradas: entradas.map(movimiento),
        salidas: salidas.map(({ cantidad, unidad }) => ({ cantidad: Number(cantidad), unidad })),
        incidencias: incidencias.map((i) => ({
          lote_id: Number(i.lote_id),
          tipo: i.tipo,
          severidad: i.severidad,
          descripcion: i.descripcion.trim(),
        })),
      })
      showMessage(
        r.supera_umbral
          ? `Transformación ${r.codigo} registrada. Lote(s) creado(s): ${r.lotes_creados.map((l) => l.codigo).join(', ')}. Merma de ${fmt(r.merma_pct)} %: se abrió una alerta.`
          : `Transformación ${r.codigo} registrada. Lote(s) creado(s): ${r.lotes_creados.map((l) => l.codigo).join(', ')}. Merma de ${fmt(r.merma_pct)} %.`,
      )
      navigate('/operador', { replace: true })
    } catch (err) {
      setErrorGeneral(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const clase = (id) => `tn-campo ${errores[id] ? 'tn-campo-error' : ''}`

  const aria = (id) => ({
    'aria-invalid': !!errores[id],
    'aria-describedby': errores[id] ? `${id}-error` : undefined,
  })

  const error = (id) =>
    errores[id] && (
      <p id={`${id}-error`} className="tn-error-texto">
        {errores[id]}
      </p>
    )

  // Fila de entrada o salida (lote + cantidad + unidad)
  const filaMov = (prefijo, f, opciones, filas, setFilas, onLote, mostrarSaldo) => {
    const idL = `${prefijo}-${f.key}-lote_id`
    const idC = `${prefijo}-${f.key}-cantidad`
    return (
      <li key={f.key} className="tn-fila">
        <div className="tn-fila-movimiento">
          <div>
            <label htmlFor={idL} className="tn-etiqueta">
              Lote
            </label>
            <select
              id={idL}
              value={f.lote_id}
              onChange={(e) => onLote(f.key, e.target.value)}
              className={clase(idL)}
              {...aria(idL)}
            >
              <option value="">Selecciona un lote</option>
              {opciones
                .filter(
                  (l) =>
                    String(l.id) === String(f.lote_id) ||
                    !filas.some((o) => o.key !== f.key && String(o.lote_id) === String(l.id)),
                )
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codigo}
                    {l.origen ? `, ${l.origen}` : ''}
                    {mostrarSaldo ? ` (${fmt(l.disponible)} kg disp.)` : ''}
                  </option>
                ))}
            </select>
            {error(idL)}
          </div>

          <div>
            <label htmlFor={idC} className="tn-etiqueta">
              Cantidad
            </label>
            <input
              id={idC}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              value={f.cantidad}
              onChange={(e) => cambiarFila(setFilas, prefijo, f.key, 'cantidad', e.target.value)}
              className={clase(idC)}
              {...aria(idC)}
            />
            {error(idC)}
          </div>

          <div>
            <label htmlFor={`${prefijo}-${f.key}-unidad`} className="tn-etiqueta">
              Unidad
            </label>
            <select
              id={`${prefijo}-${f.key}-unidad`}
              value={f.unidad}
              onChange={(e) => cambiarFila(setFilas, prefijo, f.key, 'unidad', e.target.value)}
              className={clase('')}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => quitarFila(setFilas, f.key)}
            disabled={filas.length === 1}
            className="tn-boton tn-quitar"
          >
            Quitar
          </button>
        </div>
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-cacao-800">Registrar transformación</h1>
      <p className="mt-1 text-cacao-700">
        Registra una etapa del proceso: lo que entra, lo que sale y cualquier incidencia. La merma se
        calcula mientras escribes.
      </p>

      {cargando && (
        <p role="status" className="mt-8 text-cacao-700">
          Cargando información…
        </p>
      )}

      {errorCarga && (
        <div role="alert" className="tn-aviso mt-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-peligro-600">{errorCarga}</span>
          <button type="button" onClick={reintentar} className="tn-boton">
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !errorCarga && (
        <form onSubmit={enviar} noValidate className="mt-6 space-y-8">
          {errorGeneral && (
            <div role="alert" className="tn-aviso text-sm text-peligro-600">
              {errorGeneral}
            </div>
          )}

          {/* Datos generales */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="codigo" className="tn-etiqueta">
                Código de la transformación
              </label>
              <input
                id="codigo"
                name="codigo"
                type="text"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={100}
                value={form.codigo}
                onChange={cambiarForm}
                className={clase('codigo')}
                placeholder="TRF001"
                {...aria('codigo')}
              />
              {error('codigo')}
            </div>
            <div>
              <label htmlFor="etapa" className="tn-etiqueta">
                Etapa
              </label>
              <select
                id="etapa"
                name="etapa"
                value={form.etapa}
                onChange={cambiarForm}
                className={clase('etapa')}
                {...aria('etapa')}
              >
                <option value="">Selecciona la etapa</option>
                {ETAPAS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              {error('etapa')}
            </div>
          </div>

          {/* Entradas */}
          <section aria-labelledby="titulo-entradas">
            <h2 id="titulo-entradas" className="text-lg font-semibold text-cacao-800">
              Entradas
            </h2>
            <p className="text-sm text-cacao-700">Lotes que se procesan en esta etapa.</p>
            {lotesEntrada.length === 0 && (
              <p className="mt-2 text-sm text-peligro-600">
                No hay lotes con existencias disponibles. Recibe un lote primero.
              </p>
            )}
            <ul className="mt-3 space-y-3">
              {entradas.map((f) =>
                filaMov('ent', f, lotesEntrada, entradas, setEntradas, elegirLoteEntrada, true),
              )}
            </ul>
            <button
              type="button"
              onClick={() => setEntradas((fs) => [...fs, filaMovimiento()])}
              className="tn-boton mt-3"
            >
              Agregar otro lote de entrada
            </button>
          </section>

          {/* Salidas */}
          <section aria-labelledby="titulo-salidas">
            <h2 id="titulo-salidas" className="text-lg font-semibold text-cacao-800">
              Salidas
            </h2>
            <p className="text-sm text-cacao-700">
              Cada salida crea un lote nuevo, vinculado a esta transformación y al productor de las entradas.
            </p>
            <ul className="mt-3 space-y-3">
              {salidas.map((f, index) => {
                const idC = `sal-${f.key}-cantidad`
                return (
                  <li key={f.key} className="tn-fila">
                    <div className="tn-fila-movimiento">
                      <div>
                        <span className="tn-etiqueta">Nuevo lote</span>
                        <p className="text-sm text-cacao-700">
                          {form.codigo || 'TRF'}-OUT-{String(index + 1).padStart(2, '0')}
                        </p>
                      </div>
                      <div>
                        <label htmlFor={idC} className="tn-etiqueta">Cantidad</label>
                        <input
                          id={idC}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.001"
                          value={f.cantidad}
                          onChange={(e) => cambiarFila(setSalidas, 'sal', f.key, 'cantidad', e.target.value)}
                          className={clase(idC)}
                          {...aria(idC)}
                        />
                        {error(idC)}
                      </div>
                      <div>
                        <label htmlFor={`sal-${f.key}-unidad`} className="tn-etiqueta">Unidad</label>
                        <select
                          id={`sal-${f.key}-unidad`}
                          value={f.unidad}
                          onChange={(e) => cambiarFila(setSalidas, 'sal', f.key, 'unidad', e.target.value)}
                          className={clase('')}
                        >
                          {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarFila(setSalidas, f.key)}
                        disabled={salidas.length === 1}
                        className="tn-boton tn-quitar"
                      >Quitar</button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() => setSalidas((fs) => [...fs, filaMovimiento()])}
              className="tn-boton mt-3"
            >
              Agregar otro lote de salida
            </button>
          </section>

          {/* Merma en vivo */}
          <section aria-labelledby="titulo-merma" className="tn-resumen">
            <h2 id="titulo-merma" className="text-lg font-semibold text-cacao-800">
              Merma de la etapa
            </h2>
            <div aria-live="polite" className="mt-2 text-sm">
              {merma.estado === 'INCOMPLETO' && (
                <p className="text-cacao-700">
                  Escribe las cantidades de entrada y salida para calcular la merma.
                </p>
              )}
              {merma.estado === 'SALIDA_MAYOR' && (
                <p className="text-peligro-600">
                  La salida ({fmt(merma.salidaKg)} kg) es mayor que la entrada ({fmt(merma.entradaKg)} kg).
                  Revisa las cantidades.
                </p>
              )}
              {merma.estado === 'EVALUABLE' && (
                <>
                  <p className="text-cacao-800">
                    Entrada <strong>{fmt(merma.entradaKg)} kg</strong>, salida{' '}
                    <strong>{fmt(merma.salidaKg)} kg</strong>, merma{' '}
                    <strong>
                      {fmt(merma.mermaKg)} kg ({fmt(merma.porcentaje)} %)
                    </strong>
                    .
                  </p>
                  {merma.supera ? (
                    <div className="tn-aviso mt-2 text-peligro-600">
                      Alerta: la merma supera el límite de {UMBRAL_MERMA} %. Escribe la justificación y,
                      si aplica, registra una incidencia. Al guardar se abrirá una alerta automática.
                    </div>
                  ) : (
                    <p className="mt-2 text-cacao-700">Dentro del límite de {UMBRAL_MERMA} %.</p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Justificación */}
          <div>
            <label htmlFor="observaciones" className="tn-etiqueta">
              Justificación y observaciones
              {merma.supera ? ' (obligatoria)' : ' (opcional)'}
            </label>
            <textarea
              id="observaciones"
              name="observaciones"
              rows={3}
              value={form.observaciones}
              onChange={cambiarForm}
              className={clase('observaciones')}
              placeholder="Explica el motivo de la merma o cualquier detalle de la etapa"
              {...aria('observaciones')}
            />
            {error('observaciones')}
          </div>

          {/* Incidencias */}
          <section aria-labelledby="titulo-incidencias">
            <h2 id="titulo-incidencias" className="text-lg font-semibold text-cacao-800">
              Incidencias
            </h2>
            <p className="text-sm text-cacao-700">Opcional. Registra problemas ocurridos en la etapa.</p>

            {incidencias.length > 0 && (
              <ul className="mt-3 space-y-3">
                {incidencias.map((i) => {
                  const idL = `inc-${i.key}-lote_id`
                  const idD = `inc-${i.key}-descripcion`
                  return (
                    <li key={i.key} className="tn-fila">
                      <div className="tn-fila-incidencia">
                        <div>
                          <label htmlFor={idL} className="tn-etiqueta">
                            Lote afectado
                          </label>
                          <select
                            id={idL}
                            value={i.lote_id}
                            onChange={(e) => cambiarFila(setIncidencias, 'inc', i.key, 'lote_id', e.target.value)}
                            className={clase(idL)}
                            {...aria(idL)}
                          >
                            <option value="">Selecciona un lote</option>
                            {lotesElegidos.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.codigo}
                              </option>
                            ))}
                          </select>
                          {error(idL)}
                        </div>
                        <div>
                          <label htmlFor={`inc-${i.key}-tipo`} className="tn-etiqueta">
                            Tipo
                          </label>
                          <select
                            id={`inc-${i.key}-tipo`}
                            value={i.tipo}
                            onChange={(e) => cambiarFila(setIncidencias, 'inc', i.key, 'tipo', e.target.value)}
                            className={clase('')}
                          >
                            {TIPOS_INCIDENCIA.map((t) => (
                              <option key={t.valor} value={t.valor}>
                                {t.texto}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`inc-${i.key}-severidad`} className="tn-etiqueta">
                            Severidad
                          </label>
                          <select
                            id={`inc-${i.key}-severidad`}
                            value={i.severidad}
                            onChange={(e) => cambiarFila(setIncidencias, 'inc', i.key, 'severidad', e.target.value)}
                            className={clase('')}
                          >
                            {SEVERIDADES.map((s) => (
                              <option key={s.valor} value={s.valor}>
                                {s.texto}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label htmlFor={idD} className="tn-etiqueta">
                          Descripción
                        </label>
                        <textarea
                          id={idD}
                          rows={2}
                          value={i.descripcion}
                          onChange={(e) => cambiarFila(setIncidencias, 'inc', i.key, 'descripcion', e.target.value)}
                          className={clase(idD)}
                          {...aria(idD)}
                        />
                        {error(idD)}
                      </div>
                      <button type="button" onClick={() => quitarFila(setIncidencias, i.key)} className="tn-boton mt-3">
                        Quitar incidencia
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setIncidencias((fs) => [...fs, filaIncidencia()])}
              disabled={lotesElegidos.length === 0}
              className="tn-boton mt-3"
            >
              Agregar incidencia
            </button>
            {lotesElegidos.length === 0 && (
              <p className="mt-1 text-xs text-cacao-700">Primero elige al menos un lote de entrada.</p>
            )}
          </section>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={enviando} className="tn-boton tn-boton-principal">
              {enviando ? 'Guardando…' : 'Registrar transformación'}
            </button>
            <Link to="/operador" className="tn-boton">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
