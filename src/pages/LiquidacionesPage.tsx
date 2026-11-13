import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiCrear, apiEliminar, apiEnviar, apiListar, dinero, fecha, hoy } from '../api/client'
import type {
  ConceptoSueldo,
  EstadoLiquidacion,
  FormaPagoSueldo,
  Liquidacion,
  LiquidacionResumen,
  ModalidadPago,
  ReciboSueldo,
  TipoLineaSueldo,
} from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, numeroOpcional, valorInput } from '../components/ui'

const MODALIDADES: Record<ModalidadPago, string> = {
  SEMANAL: 'Semanal',
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
}

const ESTADOS: Record<EstadoLiquidacion, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADA: 'Confirmada',
  ANULADA: 'Anulada',
}

export const FORMAS: Record<FormaPagoSueldo, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
}

const MANUALES: { tipo: TipoLineaSueldo; etiqueta: string }[] = [
  { tipo: 'COMISION', etiqueta: 'Comisión (suma, aporta IPS)' },
  { tipo: 'OTRO_INGRESO', etiqueta: 'Otro ingreso (suma)' },
  { tipo: 'OTRO_DESCUENTO', etiqueta: 'Otro descuento (resta)' },
]

function claseEstado(estado: EstadoLiquidacion) {
  return estado === 'CONFIRMADA' ? 'estado' : estado === 'ANULADA' ? 'estado anulado' : 'estado alerta'
}

function iso(dia: Date) {
  const parte = (valor: number) => String(valor).padStart(2, '0')
  return `${dia.getFullYear()}-${parte(dia.getMonth() + 1)}-${parte(dia.getDate())}`
}

function periodoSugerido(modalidad: ModalidadPago): { desde: string; hasta: string } {
  const ahora = new Date()
  if (modalidad === 'SEMANAL') {
    const lunes = new Date(ahora)
    lunes.setDate(ahora.getDate() - ((ahora.getDay() + 6) % 7))
    const sabado = new Date(lunes)
    sabado.setDate(lunes.getDate() + 5)
    return { desde: iso(lunes), hasta: iso(sabado) }
  }
  const primero = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const ultimo = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
  if (modalidad === 'MENSUAL') {
    return { desde: iso(primero), hasta: iso(ultimo) }
  }
  return ahora.getDate() <= 15
    ? { desde: iso(primero), hasta: iso(new Date(ahora.getFullYear(), ahora.getMonth(), 15)) }
    : { desde: iso(new Date(ahora.getFullYear(), ahora.getMonth(), 16)), hasta: iso(ultimo) }
}

function sumaDe(recibo: ReciboSueldo, ...tipos: TipoLineaSueldo[]) {
  return recibo.lineas.filter((linea) => tipos.includes(linea.tipo)).reduce((total, linea) => total + linea.monto, 0)
}

function importe(valor: number) {
  return valor === 0 ? '—' : dinero(valor)
}

function descuento(valor: number) {
  return valor === 0 ? '—' : <span className="resta">{dinero(valor)}</span>
}

export function LiquidacionesPage() {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionResumen[]>([])
  const [abierta, setAbierta] = useState<Liquidacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [nueva, setNueva] = useState(false)

  async function cargar() {
    try {
      setLiquidaciones(await apiListar<LiquidacionResumen[]>('/rrhh/liquidaciones'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las liquidaciones')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function abrir(id: number) {
    try {
      setAbierta(await apiListar<Liquidacion>(`/rrhh/liquidaciones/${id}`))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la liquidación')
    }
  }

  const paginacion = usePaginacion(liquidaciones)
  const vigentes = liquidaciones.filter((item) => item.estado !== 'ANULADA')
  const confirmadas = vigentes.filter((item) => item.estado === 'CONFIRMADA')

  if (abierta) {
    return (
      <Planilla
        liquidacion={abierta}
        onCambio={setAbierta}
        onVolver={() => {
          setAbierta(null)
          void cargar()
        }}
      />
    )
  }

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Sueldos y liquidación"
        detalle="Planilla de sueldos por período: junta asistencia, horas extra, viáticos, adelantos, préstamos e IPS. No mueve la caja."
      >
        <button type="button" className="btn primary" onClick={() => setNueva(true)}>
          Nueva liquidación
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Período</th>
              <th>Modalidad</th>
              <th className="numero">Empleados</th>
              <th className="numero">Pagados</th>
              <th className="numero">Neto total</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((liquidacion) => (
              <tr key={liquidacion.id}>
                <td>
                  {fecha(liquidacion.desde)} al {fecha(liquidacion.hasta)}
                  {liquidacion.registradoPor ? <small className="sub">Por {liquidacion.registradoPor}</small> : null}
                </td>
                <td>{MODALIDADES[liquidacion.modalidad]}</td>
                <td className="numero">{liquidacion.empleados}</td>
                <td className="numero">
                  {liquidacion.estado === 'CONFIRMADA' ? `${liquidacion.pagados} de ${liquidacion.empleados}` : '—'}
                </td>
                <td className="numero">
                  <strong>{dinero(liquidacion.totalNeto)}</strong>
                </td>
                <td>
                  <span className={claseEstado(liquidacion.estado)}>{ESTADOS[liquidacion.estado]}</span>
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void abrir(liquidacion.id)}>
                    Abrir planilla
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {vigentes.length > 0 ? (
            <tfoot>
              <tr className="fila-total">
                <td colSpan={2}>
                  Totales
                  <small className="sub">
                    {vigentes.length === 1 ? '1 liquidación' : `${vigentes.length} liquidaciones`} sin contar anuladas
                  </small>
                </td>
                <td className="numero">{vigentes.reduce((suma, item) => suma + item.empleados, 0)}</td>
                <td className="numero">
                  {confirmadas.reduce((suma, item) => suma + item.pagados, 0)} de{' '}
                  {confirmadas.reduce((suma, item) => suma + item.empleados, 0)}
                </td>
                <td className="numero">{dinero(vigentes.reduce((suma, item) => suma + item.totalNeto, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && liquidaciones.length === 0 ? (
        <p className="vacio">Todavía no hay liquidaciones. Generá la primera con “Nueva liquidación”.</p>
      ) : null}

      {nueva ? (
        <NuevaLiquidacion
          onCerrar={() => setNueva(false)}
          onCreada={(liquidacion) => {
            setNueva(false)
            setAbierta(liquidacion)
          }}
        />
      ) : null}
    </section>
  )
}

function NuevaLiquidacion({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: (liquidacion: Liquidacion) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [modalidad, setModalidad] = useState<ModalidadPago>('SEMANAL')
  const [periodo, setPeriodo] = useState(periodoSugerido('SEMANAL'))

  async function generar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)
    try {
      onCreada(await apiCrear<Liquidacion>('/rrhh/liquidaciones', { modalidad, ...periodo }))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar la liquidación')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo="Nueva liquidación" onCerrar={onCerrar}>
      <form onSubmit={(event) => void generar(event)}>
        <Aviso mensaje={error} />
        <Campo etiqueta="Empleados con pago">
          <select
            value={modalidad}
            onChange={(event) => {
              const valor = event.target.value as ModalidadPago
              setModalidad(valor)
              setPeriodo(periodoSugerido(valor))
            }}
          >
            {(Object.keys(MODALIDADES) as ModalidadPago[]).map((valor) => (
              <option key={valor} value={valor}>
                {MODALIDADES[valor]}
              </option>
            ))}
          </select>
        </Campo>
        <div className="grilla">
          <Campo etiqueta="Desde">
            <input
              type="date"
              required
              value={periodo.desde}
              onChange={(event) => setPeriodo({ ...periodo, desde: event.target.value })}
            />
          </Campo>
          <Campo etiqueta="Hasta">
            <input
              type="date"
              required
              min={periodo.desde}
              value={periodo.hasta}
              onChange={(event) => setPeriodo({ ...periodo, hasta: event.target.value })}
            />
          </Campo>
        </div>
        <p className="ayuda">
          Se arma un recibo por cada empleado activo con pago {MODALIDADES[modalidad].toLowerCase()}. Queda en borrador
          para que revises, agregues comisiones u otros conceptos y recién después confirmes.
        </p>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Generar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function Planilla({
  liquidacion,
  onCambio,
  onVolver,
}: {
  liquidacion: Liquidacion
  onCambio: (liquidacion: Liquidacion) => void
  onVolver: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [empleadoId, setEmpleadoId] = useState<number | null>(null)
  const borrador = liquidacion.estado === 'BORRADOR'
  const confirmada = liquidacion.estado === 'CONFIRMADA'
  const recibo = liquidacion.recibos.find((item) => item.empleadoId === empleadoId) ?? null
  const pagados = liquidacion.recibos.filter((item) => item.fechaPago)
  const pendiente = liquidacion.recibos.filter((item) => !item.fechaPago).reduce((total, item) => total + item.neto, 0)
  const [pagandoTodos, setPagandoTodos] = useState(false)
  const total = (...tipos: TipoLineaSueldo[]) => liquidacion.recibos.reduce((suma, item) => suma + sumaDe(item, ...tipos), 0)

  async function accion(
    camino: string,
    pregunta: { titulo: string; mensaje: string; aceptar: string; peligro?: boolean } | null,
  ) {
    if (pregunta && !(await confirmar(pregunta))) {
      return
    }
    setOcupado(true)
    try {
      onCambio(await apiEnviar<Liquidacion>(`/rrhh/liquidaciones/${liquidacion.id}/${camino}`, { method: 'POST' }))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo completar la acción')
    } finally {
      setOcupado(false)
    }
  }

  async function abrirPdf(camino: string, fallo: string) {
    try {
      await apiAbrir(`/rrhh/liquidaciones/${liquidacion.id}/${camino}`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : fallo)
    }
  }

  async function eliminar() {
    if (
      !(await confirmar({
        titulo: 'Eliminar borrador',
        mensaje: `¿Eliminar el borrador del ${fecha(liquidacion.desde)} al ${fecha(liquidacion.hasta)}?`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return
    }
    setOcupado(true)
    try {
      await apiEliminar(`/rrhh/liquidaciones/${liquidacion.id}`)
      onVolver()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo eliminar la liquidación')
      setOcupado(false)
    }
  }

  return (
    <section>
      <Barra
        kicker="Sueldos y liquidación"
        titulo={`${MODALIDADES[liquidacion.modalidad]} del ${fecha(liquidacion.desde)} al ${fecha(liquidacion.hasta)}`}
        detalle={
          borrador
            ? 'Borrador: revisá cada recibo, agregá comisiones u otros conceptos y confirmá. Si cambiaste asistencia, viáticos o adelantos, recalculá.'
            : confirmada
              ? 'Confirmada: los adelantos y viáticos quedaron descontados y la asistencia del período no se puede modificar.'
              : 'Anulada: los descuentos volvieron a quedar pendientes.'
        }
      >
        <button type="button" className="btn" onClick={onVolver}>
          Volver
        </button>
        <button type="button" className="btn" onClick={() => void abrirPdf('planilla/pdf', 'No se pudo generar la planilla')}>
          Imprimir planilla
        </button>
        <button
          type="button"
          className="btn"
          title="Una hoja A4 por funcionario, con original y duplicado"
          onClick={() => void abrirPdf('recibos/pdf', 'No se pudieron generar los recibos')}
        >
          Imprimir todos los recibos
        </button>
        {borrador ? (
          <>
            <button type="button" className="btn peligro" disabled={ocupado} onClick={() => void eliminar()}>
              Eliminar
            </button>
            <button
              type="button"
              className="btn"
              disabled={ocupado}
              onClick={() =>
                void accion('recalcular', {
                  titulo: 'Recalcular',
                  mensaje:
                    'Se vuelven a leer asistencia, viáticos y adelantos. Las comisiones y conceptos cargados a mano se conservan; los descuentos que habías quitado vuelven a aparecer.',
                  aceptar: 'Recalcular',
                })
              }
            >
              Recalcular
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={ocupado}
              onClick={() =>
                void accion('confirmar', {
                  titulo: 'Confirmar liquidación',
                  mensaje: `Se confirman ${liquidacion.recibos.length} recibos por ${dinero(liquidacion.totalNeto)} Gs. Los adelantos, préstamos y viáticos incluidos quedan descontados.`,
                  aceptar: 'Confirmar',
                })
              }
            >
              Confirmar
            </button>
          </>
        ) : null}
        {confirmada && pagados.length < liquidacion.recibos.length ? (
          <button type="button" className="btn primary" disabled={ocupado} onClick={() => setPagandoTodos(true)}>
            Pagar todos ({liquidacion.recibos.length - pagados.length})
          </button>
        ) : null}
        {confirmada ? (
          <button
            type="button"
            className="btn peligro"
            disabled={ocupado}
            onClick={() =>
              void accion('anular', {
                titulo: 'Anular liquidación',
                mensaje: 'Los adelantos, préstamos y viáticos vuelven a quedar pendientes y se libera la asistencia del período.',
                aceptar: 'Anular',
                peligro: true,
              })
            }
          >
            Anular
          </button>
        ) : null}
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Empleados</span>
          <strong>{liquidacion.recibos.length}</strong>
        </div>
        <div>
          <span>Haberes</span>
          <strong>{dinero(liquidacion.totalHaberes)}</strong>
        </div>
        <div>
          <span>{confirmada ? `Pendiente de pago (${liquidacion.recibos.length - pagados.length})` : 'Descuentos'}</span>
          <strong>{dinero(confirmada ? pendiente : liquidacion.totalDescuentos)}</strong>
        </div>
        <div className="total">
          <span>Neto a pagar</span>
          <strong>{dinero(liquidacion.totalNeto)}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha planilla">
          <thead>
            <tr>
              <th>Empleado</th>
              <th className="numero">Sueldo</th>
              <th className="numero">Ausencias</th>
              <th className="numero">Horas extra</th>
              <th className="numero">Viáticos</th>
              <th className="numero">Comisión y otros</th>
              <th className="numero">Adelantos y préstamos</th>
              <th className="numero">IPS</th>
              <th className="numero">Otros desc.</th>
              <th className="numero">Neto</th>
              <th>Pago</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {liquidacion.recibos.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.empleado}
                  <small className="sub">{item.cargo}</small>
                </td>
                <td className="numero">{dinero(sumaDe(item, 'SUELDO'))}</td>
                <td className="numero">{descuento(sumaDe(item, 'AUSENCIA'))}</td>
                <td className="numero">{importe(sumaDe(item, 'HORAS_EXTRA'))}</td>
                <td className="numero">{importe(sumaDe(item, 'VIATICO'))}</td>
                <td className="numero">{importe(sumaDe(item, 'COMISION', 'OTRO_INGRESO'))}</td>
                <td className="numero">{descuento(sumaDe(item, 'ADELANTO', 'PRESTAMO'))}</td>
                <td className="numero">{descuento(sumaDe(item, 'IPS'))}</td>
                <td className="numero">{descuento(sumaDe(item, 'OTRO_DESCUENTO'))}</td>
                <td className="numero">
                  <strong className={item.neto < 0 ? 'resta' : undefined}>{dinero(item.neto)}</strong>
                </td>
                <td>
                  {item.fechaPago ? (
                    <span className="estado">
                      {fecha(item.fechaPago)} · {FORMAS[item.formaPago ?? 'EFECTIVO']}
                    </span>
                  ) : confirmada ? (
                    <span className="estado alerta">Pendiente</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setEmpleadoId(item.empleadoId)}>
                    Recibo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fila-total">
              <td>Totales ({liquidacion.recibos.length})</td>
              <td className="numero">{dinero(total('SUELDO'))}</td>
              <td className="numero">{descuento(total('AUSENCIA'))}</td>
              <td className="numero">{importe(total('HORAS_EXTRA'))}</td>
              <td className="numero">{importe(total('VIATICO'))}</td>
              <td className="numero">{importe(total('COMISION', 'OTRO_INGRESO'))}</td>
              <td className="numero">{descuento(total('ADELANTO', 'PRESTAMO'))}</td>
              <td className="numero">{descuento(total('IPS'))}</td>
              <td className="numero">{descuento(total('OTRO_DESCUENTO'))}</td>
              <td className="numero">{dinero(liquidacion.totalNeto)}</td>
              <td>{confirmada ? `${pagados.length} de ${liquidacion.recibos.length} pagados` : null}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {pagandoTodos ? (
        <PagarTodos
          liquidacion={liquidacion}
          onCerrar={() => setPagandoTodos(false)}
          onPagado={(actualizada) => {
            setPagandoTodos(false)
            onCambio(actualizada)
          }}
        />
      ) : null}
      {recibo ? (
        <DetalleRecibo
          liquidacion={liquidacion}
          recibo={recibo}
          onCambio={onCambio}
          onCerrar={() => setEmpleadoId(null)}
        />
      ) : null}
    </section>
  )
}

function PagarTodos({
  liquidacion,
  onCerrar,
  onPagado,
}: {
  liquidacion: Liquidacion
  onCerrar: () => void
  onPagado: (liquidacion: Liquidacion) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [forma, setForma] = useState<FormaPagoSueldo>('EFECTIVO')
  const [diaPago, setDiaPago] = useState(hoy())
  const pendientes = liquidacion.recibos.filter((item) => !item.fechaPago)
  const monto = pendientes.reduce((suma, item) => suma + item.neto, 0)

  async function pagar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)
    try {
      onPagado(
        await apiEnviar<Liquidacion>(`/rrhh/liquidaciones/${liquidacion.id}/pago`, {
          method: 'POST',
          body: JSON.stringify({ fecha: diaPago, forma }),
        }),
      )
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron registrar los pagos')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo="Pagar todos los recibos" onCerrar={onCerrar}>
      <form onSubmit={(event) => void pagar(event)}>
        <Aviso mensaje={error} />
        <p className="ayuda">
          Se registra el pago de {pendientes.length === 1 ? '1 recibo pendiente' : `${pendientes.length} recibos pendientes`} por{' '}
          <strong>{dinero(monto)} Gs.</strong> con la misma fecha y forma de pago. Los que ya estaban pagados no cambian; si
          alguno se pagó distinto, registralo antes desde su recibo.
        </p>
        <div className="grilla">
          <Campo etiqueta="Fecha de pago">
            <input type="date" required min={liquidacion.desde} max={hoy()} value={diaPago} onChange={(event) => setDiaPago(event.target.value)} />
          </Campo>
          <Campo etiqueta="Forma de pago">
            <select value={forma} onChange={(event) => setForma(event.target.value as FormaPagoSueldo)}>
              {(Object.keys(FORMAS) as FormaPagoSueldo[]).map((valor) => (
                <option key={valor} value={valor}>
                  {FORMAS[valor]}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Pagar {pendientes.length}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function DetalleRecibo({
  liquidacion,
  recibo,
  onCambio,
  onCerrar,
}: {
  liquidacion: Liquidacion
  recibo: ReciboSueldo
  onCambio: (liquidacion: Liquidacion) => void
  onCerrar: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [tipo, setTipo] = useState<TipoLineaSueldo>('COMISION')
  const [conceptos, setConceptos] = useState<ConceptoSueldo[]>([])
  const [concepto, setConcepto] = useState<ConceptoSueldo | null>(null)
  const [forma, setForma] = useState<FormaPagoSueldo>('EFECTIVO')
  const [diaPago, setDiaPago] = useState(hoy())
  const [agregadas, setAgregadas] = useState(0)
  const borrador = liquidacion.estado === 'BORRADOR'
  const confirmada = liquidacion.estado === 'CONFIRMADA'

  useEffect(() => {
    if (borrador) {
      apiListar<ConceptoSueldo[]>('/rrhh/conceptos')
        .then((lista) => setConceptos(lista.filter((item) => item.activo)))
        .catch(() => setConceptos([]))
    }
  }, [borrador])

  function elegir(valor: string) {
    const elegido = conceptos.find((item) => `c${item.id}` === valor) ?? null
    setConcepto(elegido)
    setTipo(elegido ? (elegido.haber ? 'OTRO_INGRESO' : 'OTRO_DESCUENTO') : (valor as TipoLineaSueldo))
  }

  async function enviar(camino: string, opciones: RequestInit) {
    setOcupado(true)
    try {
      onCambio(await apiEnviar<Liquidacion>(`/rrhh/liquidaciones/${camino}`, opciones))
      setError(null)
      return true
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo completar la acción')
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function agregar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const monto = numeroOpcional(valorInput(form, 'monto'))
    if (monto == null || monto <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    const cuerpo = { tipo, descripcion: valorInput(form, 'descripcion').trim(), monto }
    if (await enviar(`recibos/${recibo.id}/lineas`, { method: 'POST', body: JSON.stringify(cuerpo) })) {
      setAgregadas((cantidad) => cantidad + 1)
    }
  }

  async function anularPago() {
    if (
      !(await confirmar({
        titulo: 'Anular pago',
        mensaje: `¿Dejar pendiente el pago de ${dinero(recibo.neto)} Gs. a ${recibo.empleado}?`,
        aceptar: 'Anular pago',
        peligro: true,
      }))
    ) {
      return
    }
    await enviar(`recibos/${recibo.id}/pago`, { method: 'DELETE' })
  }

  async function imprimir() {
    try {
      await apiAbrir(`/rrhh/liquidaciones/recibos/${recibo.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el recibo')
    }
  }

  return (
    <Dialogo titulo={`Recibo de ${recibo.empleado}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla tres">
        <Campo etiqueta="Cargo">
          <strong>{recibo.cargo ?? '—'}</strong>
        </Campo>
        <Campo etiqueta="Sueldo">
          <strong>{dinero(recibo.sueldoBase)} Gs.</strong>
        </Campo>
        <Campo etiqueta="Valor del día">
          <strong>{dinero(recibo.valorDia)} Gs.</strong>
        </Campo>
      </div>

      <table className="tabla lineas-recibo">
        <thead>
          <tr>
            <th>Concepto</th>
            <th className="numero">Haberes</th>
            <th className="numero">Descuentos</th>
            {borrador ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {recibo.lineas.map((linea) => (
            <tr key={linea.id}>
              <td>{linea.descripcion}</td>
              <td className="numero">{linea.haber ? dinero(linea.monto) : ''}</td>
              <td className="numero resta">{linea.haber ? '' : dinero(linea.monto)}</td>
              {borrador ? (
                <td className="acciones">
                  {linea.sePuedeQuitar ? (
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={ocupado}
                      title={linea.tipo === 'ADELANTO' || linea.tipo === 'PRESTAMO' || linea.tipo === 'VIATICO' ? 'Pasa a la próxima liquidación' : undefined}
                      onClick={() => void enviar(`lineas/${linea.id}`, { method: 'DELETE' })}
                    >
                      Quitar
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totales</td>
            <td className="numero">{dinero(recibo.haberes)}</td>
            <td className="numero">{dinero(recibo.descuentos)}</td>
            {borrador ? <td /> : null}
          </tr>
          <tr className="neto">
            <td>Neto a cobrar</td>
            <td className="numero" colSpan={2}>
              {dinero(recibo.neto)} Gs.
            </td>
            {borrador ? <td /> : null}
          </tr>
        </tfoot>
      </table>

      {borrador ? (
        <form key={`${agregadas}-${concepto?.id ?? tipo}`} className="linea-manual" onSubmit={(event) => void agregar(event)}>
          <Campo etiqueta="Agregar concepto">
            <select value={concepto ? `c${concepto.id}` : tipo} onChange={(event) => elegir(event.target.value)}>
              {MANUALES.map((opcion) => (
                <option key={opcion.tipo} value={opcion.tipo}>
                  {opcion.etiqueta}
                </option>
              ))}
              {conceptos.length > 0 ? (
                <optgroup label="Conceptos configurados">
                  {conceptos.map((item) => (
                    <option key={item.id} value={`c${item.id}`}>
                      {item.nombre} ({item.haber ? 'suma' : 'resta'})
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </Campo>
          <Campo etiqueta="Descripción">
            <input
              name="descripcion"
              required
              maxLength={150}
              defaultValue={concepto ? concepto.nombre.charAt(0) + concepto.nombre.slice(1).toLocaleLowerCase('es-PY') : ''}
              placeholder={tipo === 'COMISION' ? 'Comisión por ventas de la semana' : tipo === 'OTRO_INGRESO' ? 'Premio, bonificación…' : 'Faltante, rotura…'}
            />
          </Campo>
          <Campo etiqueta="Monto (Gs.)">
            <Monto name="monto" decimales={0} required valor={concepto?.monto ?? null} />
          </Campo>
          <button className="btn" type="submit" disabled={ocupado}>
            Agregar
          </button>
        </form>
      ) : null}

      {confirmada && !recibo.fechaPago ? (
        <form
          className="linea-manual"
          onSubmit={(event) => {
            event.preventDefault()
            void enviar(`recibos/${recibo.id}/pago`, { method: 'POST', body: JSON.stringify({ fecha: diaPago, forma }) })
          }}
        >
          <Campo etiqueta="Fecha de pago">
            <input type="date" required min={liquidacion.desde} max={hoy()} value={diaPago} onChange={(event) => setDiaPago(event.target.value)} />
          </Campo>
          <Campo etiqueta="Forma de pago">
            <select value={forma} onChange={(event) => setForma(event.target.value as FormaPagoSueldo)}>
              {(Object.keys(FORMAS) as FormaPagoSueldo[]).map((valor) => (
                <option key={valor} value={valor}>
                  {FORMAS[valor]}
                </option>
              ))}
            </select>
          </Campo>
          <button className="btn primary" type="submit" disabled={ocupado}>
            Registrar pago
          </button>
        </form>
      ) : null}
      {recibo.fechaPago ? (
        <p className="ayuda">
          Pagado el {fecha(recibo.fechaPago)} en {FORMAS[recibo.formaPago ?? 'EFECTIVO'].toLowerCase()}. El pago de sueldos no
          se registra en la caja de ventas.
        </p>
      ) : null}

      <div className="dialogo-acciones">
        {confirmada && recibo.fechaPago ? (
          <button className="btn peligro" type="button" disabled={ocupado} onClick={() => void anularPago()}>
            Anular pago
          </button>
        ) : null}
        <button className="btn" type="button" onClick={() => void imprimir()}>
          Imprimir recibo
        </button>
        <button className="btn primary" type="button" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}
