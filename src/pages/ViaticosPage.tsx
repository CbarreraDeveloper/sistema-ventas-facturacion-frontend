import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiCrear, apiEliminar, apiListar, dinero, fecha, hoy } from '../api/client'
import type { ConceptoViatico, Empleado, FormaPagoViatico, Viatico } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, numeroOpcional, textoOpcional, valorInput } from '../components/ui'

const CONCEPTOS: Record<ConceptoViatico, string> = {
  COMBUSTIBLE: 'Combustible',
  COMIDA: 'Comida',
  PASAJE: 'Pasaje',
  HOSPEDAJE: 'Hospedaje',
  OTRO: 'Otro',
}

const FORMAS: Record<FormaPagoViatico, string> = {
  APARTE: 'Aparte',
  LIQUIDACION: 'Con el sueldo',
}

type Filtro = 'PENDIENTES' | 'PAGADOS' | 'TODOS'

export function ViaticosPage() {
  const [viaticos, setViaticos] = useState<Viatico[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [mes, setMes] = useState(hoy().slice(0, 7))
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<Viatico | null | 'nuevo'>(null)
  const [pagando, setPagando] = useState<Viatico | null>(null)

  async function cargar() {
    try {
      const [lista, personal] = await Promise.all([
        apiListar<Viatico[]>('/rrhh/viaticos'),
        apiListar<Empleado[]>('/rrhh/empleados'),
      ])
      setViaticos(lista)
      setEmpleados(personal)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los viáticos')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function anularPago(viatico: Viatico) {
    if (
      !(await confirmar({
        titulo: 'Anular pago',
        mensaje: `¿Volver a dejar pendiente el viático de ${dinero(viatico.monto)} Gs. de ${viatico.empleado}?`,
        aceptar: 'Anular pago',
        peligro: true,
      }))
    ) {
      return
    }
    try {
      await apiEliminar(`/rrhh/viaticos/${viatico.id}/pago`)
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular el pago')
    }
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtrados = viaticos.filter((viatico) => {
    if (mes && !viatico.fecha.startsWith(mes)) {
      return false
    }
    if (filtro === 'PENDIENTES' && viatico.fechaPago) {
      return false
    }
    if (filtro === 'PAGADOS' && !viatico.fechaPago) {
      return false
    }
    return !consulta || viatico.empleado.toLocaleUpperCase('es-PY').includes(consulta)
  })
  const pendientes = filtrados.filter((viatico) => !viatico.fechaPago)
  const suma = (lista: Viatico[]) => lista.reduce((total, viatico) => total + viatico.monto, 0)
  const paginacion = usePaginacion(filtrados)

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Viáticos"
        detalle="Gastos de combustible, comida, pasaje u hospedaje del personal. Se pagan aparte o se suman al sueldo."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Empleado" />
        </label>
        <label className="campo">
          <span>Mes</span>
          <input type="month" value={mes} onChange={(event) => setMes(event.target.value)} />
        </label>
        <label className="campo">
          <span>Mostrar</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value as Filtro)}>
            <option value="TODOS">Todos</option>
            <option value="PENDIENTES">Pendientes de pago</option>
            <option value="PAGADOS">Pagados</option>
          </select>
        </label>
        <button type="button" className="btn primary" onClick={() => setEditando('nuevo')}>
          Registrar viático
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Viáticos</span>
          <strong>{filtrados.length}</strong>
        </div>
        <div>
          <span>Pendiente de pago aparte</span>
          <strong>{dinero(suma(pendientes.filter((viatico) => viatico.formaPago === 'APARTE')))}</strong>
        </div>
        <div>
          <span>A sumar en el sueldo</span>
          <strong>{dinero(suma(pendientes.filter((viatico) => viatico.formaPago === 'LIQUIDACION')))}</strong>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{dinero(suma(filtrados))}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Empleado</th>
              <th>Concepto</th>
              <th>Comprobante</th>
              <th className="numero">Monto</th>
              <th>Se paga</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((viatico) => (
              <tr key={viatico.id}>
                <td>{fecha(viatico.fecha)}</td>
                <td>
                  {viatico.empleado}
                  <small className="sub">{viatico.cargo}</small>
                </td>
                <td>
                  {CONCEPTOS[viatico.concepto]}
                  {viatico.detalle ? <small className="sub">{viatico.detalle}</small> : null}
                </td>
                <td>{viatico.comprobante ?? '—'}</td>
                <td className="numero">
                  <strong>{dinero(viatico.monto)}</strong>
                </td>
                <td>{FORMAS[viatico.formaPago]}</td>
                <td>
                  {viatico.fechaPago ? (
                    <span className="estado">Pagado el {fecha(viatico.fechaPago)}</span>
                  ) : viatico.formaPago === 'LIQUIDACION' ? (
                    <span className="estado alerta">En la próxima liquidación</span>
                  ) : (
                    <span className="estado alerta">Pendiente</span>
                  )}
                </td>
                <td className="acciones">
                  {viatico.fechaPago ? (
                    viatico.formaPago === 'APARTE' ? (
                      <button type="button" className="btn ghost" onClick={() => void anularPago(viatico)}>
                        Anular pago
                      </button>
                    ) : null
                  ) : (
                    <>
                      <button type="button" className="btn ghost" onClick={() => setEditando(viatico)}>
                        Editar
                      </button>
                      {viatico.formaPago === 'APARTE' ? (
                        <button type="button" className="btn primary" onClick={() => setPagando(viatico)}>
                          Pagar
                        </button>
                      ) : null}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && viaticos.length === 0 ? <p className="vacio">Todavía no hay viáticos registrados.</p> : null}
      {listo && viaticos.length > 0 && filtrados.length === 0 ? <p className="vacio">Ningún viático coincide con el filtro.</p> : null}

      {editando ? (
        <FichaViatico
          viatico={editando === 'nuevo' ? null : editando}
          empleados={empleados}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      ) : null}
      {pagando ? (
        <PagoViatico
          viatico={pagando}
          onCerrar={() => setPagando(null)}
          onPagado={() => {
            setPagando(null)
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

function FichaViatico({
  viatico,
  empleados,
  onCerrar,
  onGuardado,
}: {
  viatico: Viatico | null
  empleados: Empleado[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [dia, setDia] = useState(viatico?.fecha ?? hoy())
  const [concepto, setConcepto] = useState<ConceptoViatico>(viatico?.concepto ?? 'COMBUSTIBLE')
  const [forma, setForma] = useState<FormaPagoViatico>(viatico?.formaPago ?? 'APARTE')

  const activos = empleados.filter(
    (empleado) => !empleado.fechaEgreso || empleado.fechaEgreso >= dia || empleado.id === viatico?.empleadoId,
  )

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const monto = numeroOpcional(valorInput(form, 'monto'))
    if (monto == null || monto <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    const cuerpo = {
      empleadoId: Number(valorInput(form, 'empleadoId')),
      fecha: dia,
      concepto,
      detalle: textoOpcional(valorInput(form, 'detalle')),
      monto,
      comprobante: textoOpcional(valorInput(form, 'comprobante')),
      formaPago: forma,
    }
    setGuardando(true)
    try {
      if (viatico) {
        await apiActualizar<Viatico>(`/rrhh/viaticos/${viatico.id}`, cuerpo)
      } else {
        await apiCrear<Viatico>('/rrhh/viaticos', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el viático')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!viatico) {
      return
    }
    if (
      !(await confirmar({
        titulo: 'Eliminar viático',
        mensaje: `¿Eliminar el viático de ${dinero(viatico.monto)} Gs. de ${viatico.empleado} del ${fecha(viatico.fecha)}?`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return
    }
    setGuardando(true)
    try {
      await apiEliminar(`/rrhh/viaticos/${viatico.id}`)
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo eliminar el viático')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={viatico ? 'Editar viático' : 'Registrar viático'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Empleado">
              <select name="empleadoId" required defaultValue={viatico?.empleadoId ?? ''}>
                <option value="">Elegí un empleado</option>
                {activos.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.apellidos}, {empleado.nombres} — {empleado.cargo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Fecha">
            <input type="date" required max={hoy()} value={dia} onChange={(event) => setDia(event.target.value)} />
          </Campo>
          <Campo etiqueta="Concepto">
            <select value={concepto} onChange={(event) => setConcepto(event.target.value as ConceptoViatico)}>
              {Object.entries(CONCEPTOS).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <div className="span">
            <Campo etiqueta={concepto === 'OTRO' ? 'Detalle del gasto' : 'Detalle (destino, motivo)'}>
              <input
                name="detalle"
                required={concepto === 'OTRO'}
                maxLength={200}
                placeholder="Entrega en Luque, visita a obra…"
                defaultValue={viatico?.detalle ?? ''}
              />
            </Campo>
          </div>
          <Campo etiqueta="Monto (Gs.)">
            <Monto name="monto" valor={viatico?.monto} decimales={0} required />
          </Campo>
          <Campo etiqueta="N° de comprobante">
            <input name="comprobante" maxLength={40} placeholder="001-001-0001234" defaultValue={viatico?.comprobante ?? ''} />
          </Campo>
          <div className="span">
            <Campo etiqueta="Se paga">
              <div className="opciones-estado" role="radiogroup" aria-label="Forma de pago">
                {(Object.keys(FORMAS) as FormaPagoViatico[]).map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={forma === valor}
                    className={forma === valor ? 'btn primary' : 'btn'}
                    onClick={() => setForma(valor)}
                  >
                    {valor === 'APARTE' ? 'Aparte, en efectivo o transferencia' : 'Junto con el sueldo'}
                  </button>
                ))}
              </div>
            </Campo>
          </div>
          <p className="ayuda span">
            {forma === 'APARTE'
              ? 'Queda pendiente hasta que registres el pago.'
              : 'Se suma automáticamente en la liquidación de sueldo del período.'}
          </p>
        </div>
        <div className="dialogo-acciones">
          {viatico ? (
            <button className="btn peligro" type="button" disabled={guardando} onClick={() => void eliminar()}>
              Eliminar
            </button>
          ) : null}
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function PagoViatico({ viatico, onCerrar, onPagado }: { viatico: Viatico; onCerrar: () => void; onPagado: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [dia, setDia] = useState(hoy())

  async function pagar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)
    try {
      await apiCrear<Viatico>(`/rrhh/viaticos/${viatico.id}/pago`, { fecha: dia })
      onPagado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo registrar el pago')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo={`Pagar a ${viatico.empleado}`} onCerrar={onCerrar}>
      <form onSubmit={(event) => void pagar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla">
          <Campo etiqueta={CONCEPTOS[viatico.concepto]}>
            <strong>{fecha(viatico.fecha)}</strong>
          </Campo>
          <Campo etiqueta="Monto a pagar">
            <strong>{dinero(viatico.monto)} Gs.</strong>
          </Campo>
        </div>
        {viatico.detalle ? <p className="ayuda">{viatico.detalle}</p> : null}
        <Campo etiqueta="Fecha de pago">
          <input type="date" required min={viatico.fecha} max={hoy()} value={dia} onChange={(event) => setDia(event.target.value)} />
        </Campo>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Registrar pago
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
