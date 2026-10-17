import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiCrear, apiListar, cargarSesion, dinero, fechaHora, texto } from '../api/client'
import { confirmar } from '../components/Confirmacion'
import type { CajaSesion, OpcionCatalogo, TipoMovimientoCaja } from '../api/types'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, mascaraMonto, numeroOpcional, textoOpcional } from '../components/ui'

export function CajaPage() {
  const [actual, setActual] = useState<CajaSesion | null>(null)
  const [sesiones, setSesiones] = useState<CajaSesion[]>([])
  const [medios, setMedios] = useState<OpcionCatalogo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [movimiento, setMovimiento] = useState<TipoMovimientoCaja | null>(null)
  const [cerrando, setCerrando] = useState<CajaSesion | null>(null)
  const [viendo, setViendo] = useState<CajaSesion | null>(null)
  const esAdmin = cargarSesion()?.roles.includes('ADMIN') ?? false

  async function cargar() {
    try {
      const [abierta, historial, listaMedios] = await Promise.all([
        apiListar<CajaSesion | undefined>('/caja/actual'),
        apiListar<CajaSesion[]>('/caja/sesiones'),
        apiListar<OpcionCatalogo[]>('/caja/medios'),
      ])
      setActual(abierta ?? null)
      setSesiones(historial)
      setMedios(listaMedios)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer la caja')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function ver(sesion: CajaSesion) {
    try {
      setViendo(await apiListar<CajaSesion>(`/caja/sesiones/${sesion.id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la caja')
    }
  }

  const paginacion = usePaginacion(sesiones)

  return (
    <section>
      <Barra kicker="Tesorería" titulo="Caja" detalle="Apertura, cobros de facturas contado, ingresos y egresos, y cierre con arqueo del efectivo.">
        {actual ? (
          <>
            <button type="button" className="btn" onClick={() => setMovimiento('INGRESO')}>
              Ingreso
            </button>
            <button type="button" className="btn" onClick={() => setMovimiento('EGRESO')}>
              Egreso
            </button>
            <button type="button" className="btn primary" onClick={() => setCerrando(actual)}>
              Cerrar caja
            </button>
          </>
        ) : null}
      </Barra>
      <Aviso mensaje={error} />
      {listo && !actual ? <AbrirCaja onAbierta={() => void cargar()} /> : null}
      {actual ? <ResumenCaja sesion={actual} /> : null}

      <div className="seccion">
        <div className="seccion-cabecera">
          <div>
            <h3>Cajas anteriores</h3>
            <p>Historial de aperturas y cierres con la diferencia del arqueo.</p>
          </div>
        </div>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Usuario</th>
                <th className="numero">Monto inicial</th>
                <th className="numero">Efectivo esperado</th>
                <th className="numero">Efectivo contado</th>
                <th className="numero">Diferencia</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginacion.filas.map((sesion) => (
                <tr key={sesion.id}>
                  <td>{fechaHora(sesion.abiertaEn)}</td>
                  <td>{fechaHora(sesion.cerradaEn)}</td>
                  <td>{sesion.usuario}</td>
                  <td className="numero">{dinero(sesion.montoApertura)}</td>
                  <td className="numero">{dinero(sesion.efectivoEsperado)}</td>
                  <td className="numero">{sesion.montoCierre == null ? '—' : dinero(sesion.montoCierre)}</td>
                  <td className={claseDiferencia(sesion.diferencia)}>{sesion.diferencia == null ? '—' : dinero(sesion.diferencia)}</td>
                  <td>
                    <span className={sesion.estado === 'ABIERTA' ? 'estado alerta' : 'estado'}>{sesion.estado}</span>
                  </td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => void ver(sesion)}>
                      Ver
                    </button>
                    {esAdmin && sesion.estado === 'ABIERTA' && sesion.id !== actual?.id ? (
                      <button type="button" className="btn ghost" onClick={() => setCerrando(sesion)}>
                        Cerrar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ControlPaginacion paginacion={paginacion} />
        {listo && sesiones.length === 0 ? <p className="vacio">Todavía no se abrió ninguna caja.</p> : null}
      </div>

      {movimiento && actual ? (
        <NuevoMovimiento
          tipo={movimiento}
          medios={medios}
          onCerrar={() => setMovimiento(null)}
          onGuardado={() => {
            setMovimiento(null)
            void cargar()
          }}
        />
      ) : null}
      {cerrando ? (
        <CerrarCaja
          sesion={cerrando}
          ajena={cerrando.id !== actual?.id}
          onCerrar={() => setCerrando(null)}
          onCerrada={(cerrada) => {
            setCerrando(null)
            setViendo(cerrada)
            void cargar()
          }}
        />
      ) : null}
      {viendo ? (
        <Dialogo clase="ancho" titulo={`Caja de ${viendo.usuario} · ${fechaHora(viendo.abiertaEn)}`} onCerrar={() => setViendo(null)}>
          <ResumenCaja sesion={viendo} />
          <div className="dialogo-acciones">
            <button type="button" className="btn primary" onClick={() => setViendo(null)}>
              Cerrar
            </button>
          </div>
        </Dialogo>
      ) : null}
    </section>
  )
}

function claseDiferencia(diferencia: number | null): string {
  if (diferencia == null || diferencia === 0) {
    return 'numero'
  }
  return diferencia < 0 ? 'numero falta' : 'numero sobra'
}

function ResumenCaja({ sesion }: { sesion: CajaSesion }) {
  return (
    <div className="ficha bloque">
      <div className="seccion-cabecera">
        <div>
          <h3>{sesion.estado === 'ABIERTA' ? 'Caja abierta' : 'Caja cerrada'}</h3>
          <p>
            {sesion.usuario} · {sesion.sucursal} · abierta el {fechaHora(sesion.abiertaEn)}
            {sesion.cerradaEn ? `, cerrada el ${fechaHora(sesion.cerradaEn)}` : ''}
          </p>
        </div>
      </div>
      <div className="totales cuatro">
        <div>
          <span>Monto inicial</span>
          <strong>{dinero(sesion.montoApertura)}</strong>
        </div>
        <div>
          <span>Ingresos</span>
          <strong>{dinero(sesion.totalIngresos)}</strong>
        </div>
        <div>
          <span>Egresos</span>
          <strong>{dinero(sesion.totalEgresos)}</strong>
        </div>
        <div className="total">
          <span>Efectivo esperado</span>
          <strong>{dinero(sesion.efectivoEsperado)}</strong>
        </div>
      </div>
      {sesion.montoCierre != null ? (
        <p className="ayuda">
          Efectivo contado al cierre: Gs. {dinero(sesion.montoCierre)}. Diferencia:{' '}
          <strong className={claseDiferencia(sesion.diferencia)}>Gs. {dinero(sesion.diferencia)}</strong>
          {sesion.diferencia && sesion.diferencia < 0 ? ' (faltante)' : sesion.diferencia ? ' (sobrante)' : ''}
        </p>
      ) : null}
      <div className="tabla-contenedor bloque">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Medio de pago</th>
              <th className="numero">Ingresos</th>
              <th className="numero">Egresos</th>
              <th className="numero">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {sesion.totales.map((total) => (
              <tr key={total.codigo}>
                <td>{total.medio}</td>
                <td className="numero">{dinero(total.ingresos)}</td>
                <td className="numero">{dinero(total.egresos)}</td>
                <td className="numero">{dinero(total.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tabla-contenedor bloque">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Concepto</th>
              <th>Medio</th>
              <th className="numero">Ingreso</th>
              <th className="numero">Egreso</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {sesion.movimientos.map((movimiento) => (
              <tr key={movimiento.id}>
                <td>{fechaHora(movimiento.fecha)}</td>
                <td>{movimiento.concepto}</td>
                <td>{movimiento.medio}</td>
                <td className="numero">{movimiento.tipo === 'INGRESO' ? dinero(movimiento.monto) : ''}</td>
                <td className="numero">{movimiento.tipo === 'EGRESO' ? dinero(movimiento.monto) : ''}</td>
                <td>{texto(movimiento.usuario)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sesion.movimientos.length === 0 ? <p className="vacio">Sin movimientos todavía.</p> : null}
      {sesion.observacion ? <p className="ayuda">{sesion.observacion}</p> : null}
    </div>
  )
}

function AbrirCaja({ onAbierta }: { onAbierta: () => void }) {
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function abrir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const montoApertura = numeroOpcional(monto)
    if (montoApertura == null || montoApertura < 0) {
      setError('Indicá el efectivo con que abre la caja (puede ser 0)')
      return
    }
    const observacion = (event.currentTarget.elements.namedItem('observacion') as HTMLInputElement).value.trim()
    setGuardando(true)
    try {
      await apiCrear('/caja/abrir', { montoApertura, observacion: textoOpcional(observacion) })
      onAbierta()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la caja')
      setGuardando(false)
    }
  }

  return (
    <form className="ficha bloque" onSubmit={(event) => void abrir(event)}>
      <div className="seccion-cabecera">
        <div>
          <h3>Abrir caja</h3>
          <p>No tenés una caja abierta. Para facturar al contado hay que abrirla con el efectivo inicial (fondo de cambio).</p>
        </div>
      </div>
      <Aviso mensaje={error} />
      <div className="grilla tres">
        <Campo etiqueta="Efectivo inicial">
          <input
            className="monto"
            inputMode="numeric"
            value={monto}
            onChange={(event) => setMonto(mascaraMonto(event.target.value, 0))}
            placeholder="0"
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Observación">
          <input name="observacion" maxLength={200} />
        </Campo>
        <div className="dialogo-acciones">
          <button className="btn primary" type="submit" disabled={guardando}>
            Abrir caja
          </button>
        </div>
      </div>
    </form>
  )
}

function NuevoMovimiento({
  tipo,
  medios,
  onCerrar,
  onGuardado,
}: {
  tipo: TipoMovimientoCaja
  medios: OpcionCatalogo[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const valor = numeroOpcional(monto)
    if (!valor || valor <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    const form = event.currentTarget
    setGuardando(true)
    try {
      await apiCrear('/caja/movimientos', {
        tipo,
        medioPagoId: Number((form.elements.namedItem('medioPagoId') as HTMLSelectElement).value),
        monto: valor,
        concepto: (form.elements.namedItem('concepto') as HTMLInputElement).value.trim(),
      })
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo registrar el movimiento')
      setGuardando(false)
    }
  }

  const efectivo = medios.find((medio) => medio.codigo === 'EFECTIVO')

  return (
    <Dialogo titulo={tipo === 'INGRESO' ? 'Ingreso de caja' : 'Egreso de caja'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla">
          <Campo etiqueta="Medio de pago">
            <select name="medioPagoId" defaultValue={efectivo?.id ?? medios[0]?.id}>
              {medios.map((medio) => (
                <option key={medio.id} value={medio.id}>
                  {medio.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Monto">
            <input
              className="monto"
              inputMode="numeric"
              value={monto}
              onChange={(event) => setMonto(mascaraMonto(event.target.value, 0))}
              required
              autoFocus
            />
          </Campo>
          <div className="span">
            <Campo etiqueta="Concepto">
              <input
                name="concepto"
                required
                maxLength={150}
                placeholder={tipo === 'INGRESO' ? 'Ej.: refuerzo de cambio' : 'Ej.: pago de flete, retiro para depósito bancario'}
              />
            </Campo>
          </div>
          <div className="dialogo-acciones">
            <button className="btn" type="button" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn primary" type="submit" disabled={guardando}>
              Registrar {tipo === 'INGRESO' ? 'ingreso' : 'egreso'}
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

function CerrarCaja({
  sesion,
  ajena,
  onCerrar,
  onCerrada,
}: {
  sesion: CajaSesion
  ajena: boolean
  onCerrar: () => void
  onCerrada: (sesion: CajaSesion) => void
}) {
  const [contado, setContado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const montoCierre = numeroOpcional(contado)
  const diferencia = montoCierre == null ? null : montoCierre - sesion.efectivoEsperado

  async function cerrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (montoCierre == null || montoCierre < 0) {
      setError('Indicá el efectivo contado en la caja')
      const campo = form.elements.namedItem('contado')
      if (campo instanceof HTMLInputElement) {
        campo.focus()
      }
      return
    }
    if (
      diferencia !== 0
      && !(await confirmar({
        titulo: 'Diferencia en el arqueo',
        mensaje: `El arqueo da una diferencia de Gs. ${dinero(diferencia)}. ¿Cerrar la caja igual?`,
        aceptar: 'Cerrar caja igual',
        peligro: true,
      }))
    ) {
      return
    }
    const observacion = (form.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()
    setGuardando(true)
    try {
      const ruta = ajena ? `/caja/sesiones/${sesion.id}/cerrar` : '/caja/cerrar'
      onCerrada(await apiCrear<CajaSesion>(ruta, { montoCierre, observacion: textoOpcional(observacion) }))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cerrar la caja')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={ajena ? `Cerrar la caja de ${sesion.usuario}` : 'Cerrar caja'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void cerrar(event)}>
        <Aviso mensaje={error} />
        {ajena ? <p className="ayuda">La caja queda cerrada a tu nombre y así figura en la observación.</p> : null}
        <p className="ayuda">Contá el efectivo que hay en la caja. Transferencias, cheques y tarjetas no se cuentan acá.</p>
        <div className="totales cuatro">
          <div>
            <span>Monto inicial</span>
            <strong>{dinero(sesion.montoApertura)}</strong>
          </div>
          <div className="total">
            <span>Efectivo esperado</span>
            <strong>{dinero(sesion.efectivoEsperado)}</strong>
          </div>
          <div>
            <span>Efectivo contado</span>
            <strong>{montoCierre == null ? '—' : dinero(montoCierre)}</strong>
          </div>
          <div>
            <span>Diferencia</span>
            <strong className={claseDiferencia(diferencia)}>{diferencia == null ? '—' : dinero(diferencia)}</strong>
          </div>
        </div>
        <div className="grilla">
          <Campo etiqueta="Efectivo contado">
            <input
              name="contado"
              className="monto"
              inputMode="numeric"
              value={contado}
              onChange={(event) => {
                setContado(mascaraMonto(event.target.value, 0))
                setError(null)
              }}
              aria-invalid={error !== null && montoCierre == null}
              autoFocus
            />
          </Campo>
          <div className="span">
            <Campo etiqueta="Observación">
              <textarea name="observacion" rows={2} maxLength={200} />
            </Campo>
          </div>
          <div className="dialogo-acciones">
            <button className="btn" type="button" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn primary" type="submit" disabled={guardando}>
              Cerrar caja
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}
