import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiCrear, apiEliminar, apiListar, dinero, fecha, hoy } from '../api/client'
import type { Adelanto, AdelantoCuota, Empleado, TipoAdelanto } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, numeroOpcional, textoOpcional, valorInput } from '../components/ui'

const TIPOS: Record<TipoAdelanto, string> = {
  ADELANTO: 'Adelanto de sueldo',
  PRESTAMO: 'Préstamo',
}

const PERIODOS_POR_MES: Record<Empleado['modalidadPago'], number> = {
  SEMANAL: 4,
  QUINCENAL: 2,
  MENSUAL: 1,
}

type Filtro = 'PENDIENTES' | 'SALDADOS' | 'TODOS'

export function AdelantosPage() {
  const [adelantos, setAdelantos] = useState<Adelanto[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('PENDIENTES')
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<Adelanto | null | 'nuevo'>(null)
  const [viendo, setViendo] = useState<Adelanto | null>(null)

  async function cargar() {
    try {
      const [lista, personal] = await Promise.all([
        apiListar<Adelanto[]>('/rrhh/adelantos'),
        apiListar<Empleado[]>('/rrhh/empleados'),
      ])
      setAdelantos(lista)
      setEmpleados(personal)
      setViendo((actual) => (actual ? lista.find((adelanto) => adelanto.id === actual.id) ?? null : null))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los adelantos y préstamos')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const mes = hoy().slice(0, 7)
  const pendientes = adelantos.filter((adelanto) => adelanto.saldo > 0)
  const descontarMes = adelantos
    .flatMap((adelanto) => adelanto.cuotas)
    .filter((cuota) => !cuota.fechaCobro && cuota.mes.startsWith(mes))
    .reduce((suma, cuota) => suma + cuota.monto, 0)
  const entregadoMes = adelantos
    .filter((adelanto) => adelanto.fecha.startsWith(mes))
    .reduce((suma, adelanto) => suma + adelanto.monto, 0)
  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtrados = adelantos.filter((adelanto) => {
    if (filtro === 'PENDIENTES' && adelanto.saldo <= 0) {
      return false
    }
    if (filtro === 'SALDADOS' && adelanto.saldo > 0) {
      return false
    }
    return !consulta || adelanto.empleado.toLocaleUpperCase('es-PY').includes(consulta)
  })
  const paginacion = usePaginacion(filtrados)

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Adelantos y préstamos"
        detalle="El adelanto se descuenta entero en el sueldo del mes; el préstamo, en cuotas mensuales."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Empleado" />
        </label>
        <label className="campo">
          <span>Mostrar</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value as Filtro)}>
            <option value="PENDIENTES">Con saldo pendiente</option>
            <option value="SALDADOS">Saldados</option>
            <option value="TODOS">Todos</option>
          </select>
        </label>
        <button type="button" className="btn primary" onClick={() => setEditando('nuevo')}>
          Registrar
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Con saldo pendiente</span>
          <strong>{pendientes.length}</strong>
        </div>
        <div>
          <span>Entregado este mes</span>
          <strong>{dinero(entregadoMes)}</strong>
        </div>
        <div>
          <span>A descontar este mes</span>
          <strong>{dinero(descontarMes)}</strong>
        </div>
        <div className="total">
          <span>Saldo total pendiente</span>
          <strong>{dinero(pendientes.reduce((suma, adelanto) => suma + adelanto.saldo, 0))}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Entregado</th>
              <th>Empleado</th>
              <th>Tipo</th>
              <th className="numero">Monto</th>
              <th className="centro">Cuotas</th>
              <th>Próximo descuento</th>
              <th className="numero">Saldo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((adelanto) => {
              const cobradas = adelanto.cuotas.filter((cuota) => cuota.fechaCobro).length
              const proxima = adelanto.cuotas.find((cuota) => !cuota.fechaCobro)
              return (
                <tr key={adelanto.id}>
                  <td>{fecha(adelanto.fecha)}</td>
                  <td>
                    {adelanto.empleado}
                    <small className="sub">{adelanto.cargo}</small>
                  </td>
                  <td>{TIPOS[adelanto.tipo]}</td>
                  <td className="numero">{dinero(adelanto.monto)}</td>
                  <td className="centro">
                    {cobradas} de {adelanto.cuotas.length}
                  </td>
                  <td>
                    {proxima ? (
                      <span className={proxima.mes.slice(0, 7) < mes ? 'estado alerta' : undefined}>
                        {mesTexto(proxima.mes)} · {dinero(proxima.monto)}
                      </span>
                    ) : (
                      <span className="estado">Saldado</span>
                    )}
                  </td>
                  <td className="numero">
                    <strong>{dinero(adelanto.saldo)}</strong>
                  </td>
                  <td className="acciones">
                    {cobradas === 0 ? (
                      <button type="button" className="btn ghost" onClick={() => setEditando(adelanto)}>
                        Editar
                      </button>
                    ) : null}
                    <button type="button" className="btn primary" onClick={() => setViendo(adelanto)}>
                      Cuotas
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && adelantos.length === 0 ? <p className="vacio">Todavía no hay adelantos ni préstamos registrados.</p> : null}
      {listo && adelantos.length > 0 && filtrados.length === 0 ? <p className="vacio">Ninguno coincide con el filtro.</p> : null}

      {editando ? (
        <FichaAdelanto
          adelanto={editando === 'nuevo' ? null : editando}
          empleados={empleados}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      ) : null}
      {viendo ? <CuotasAdelanto adelanto={viendo} onCerrar={() => setViendo(null)} onCambio={() => void cargar()} /> : null}
    </section>
  )
}

function FichaAdelanto({
  adelanto,
  empleados,
  onCerrar,
  onGuardado,
}: {
  adelanto: Adelanto | null
  empleados: Empleado[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [empleadoId, setEmpleadoId] = useState(adelanto ? String(adelanto.empleadoId) : '')
  const [tipo, setTipo] = useState<TipoAdelanto>(adelanto?.tipo ?? 'ADELANTO')
  const [dia, setDia] = useState(adelanto?.fecha ?? hoy())
  const [monto, setMonto] = useState<number | null>(adelanto?.monto ?? null)
  const [cuotas, setCuotas] = useState(adelanto ? String(adelanto.cuotas.length) : '3')
  const [primerMes, setPrimerMes] = useState(adelanto ? adelanto.cuotas[0].mes.slice(0, 7) : '')

  const activos = empleados.filter(
    (empleado) => !empleado.fechaEgreso || empleado.fechaEgreso >= dia || empleado.id === adelanto?.empleadoId,
  )
  const empleado = empleados.find((candidato) => String(candidato.id) === empleadoId)
  const cantidad = tipo === 'PRESTAMO' ? Math.max(1, Number(cuotas) || 1) : 1
  const mesInicial = primerMes || sumarMeses(dia.slice(0, 7), tipo === 'PRESTAMO' ? 1 : 0)
  const valorCuota = monto ? Math.floor(monto / cantidad) : 0
  const ultimaCuota = monto ? monto - valorCuota * (cantidad - 1) : 0

  function cambiarTipo(nuevo: TipoAdelanto) {
    setTipo(nuevo)
    setPrimerMes('')
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const importe = numeroOpcional(valorInput(form, 'monto'))
    if (importe == null || importe <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    const cuerpo = {
      empleadoId: Number(empleadoId),
      tipo,
      fecha: dia,
      monto: importe,
      cuotas: cantidad,
      primerMes: `${mesInicial}-01`,
      observacion: textoOpcional(valorInput(form, 'observacion')),
    }
    setGuardando(true)
    try {
      if (adelanto) {
        await apiActualizar<Adelanto>(`/rrhh/adelantos/${adelanto.id}`, cuerpo)
      } else {
        await apiCrear<Adelanto>('/rrhh/adelantos', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!adelanto) {
      return
    }
    if (
      !(await confirmar({
        titulo: `Eliminar ${TIPOS[adelanto.tipo].toLocaleLowerCase('es-PY')}`,
        mensaje: `¿Eliminar el registro de ${dinero(adelanto.monto)} Gs. entregado a ${adelanto.empleado} el ${fecha(adelanto.fecha)}?`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return
    }
    setGuardando(true)
    try {
      await apiEliminar(`/rrhh/adelantos/${adelanto.id}`)
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo eliminar')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={adelanto ? 'Editar adelanto o préstamo' : 'Registrar adelanto o préstamo'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Empleado">
              <select required value={empleadoId} onChange={(event) => setEmpleadoId(event.target.value)}>
                <option value="">Elegí un empleado</option>
                {activos.map((candidato) => (
                  <option key={candidato.id} value={candidato.id}>
                    {candidato.apellidos}, {candidato.nombres} — {candidato.cargo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Tipo">
            <select value={tipo} onChange={(event) => cambiarTipo(event.target.value as TipoAdelanto)}>
              {Object.entries(TIPOS).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Fecha de entrega">
            <input type="date" required max={hoy()} value={dia} onChange={(event) => setDia(event.target.value)} />
          </Campo>
          <Campo etiqueta="Monto entregado (Gs.)">
            <Monto name="monto" valor={adelanto?.monto} decimales={0} required onValor={setMonto} />
          </Campo>
          {tipo === 'PRESTAMO' ? (
            <Campo etiqueta="Cantidad de cuotas">
              <input
                type="number"
                min={1}
                max={36}
                required
                value={cuotas}
                onChange={(event) => setCuotas(event.target.value)}
              />
            </Campo>
          ) : (
            <span />
          )}
          <Campo etiqueta={tipo === 'PRESTAMO' ? 'Primera cuota en' : 'Se descuenta en'}>
            <input
              type="month"
              required
              min={dia.slice(0, 7)}
              value={mesInicial}
              onChange={(event) => setPrimerMes(event.target.value)}
            />
          </Campo>
          <Campo etiqueta={tipo === 'PRESTAMO' ? 'Cuota mensual' : 'Descuento'}>
            <strong>
              {monto
                ? valorCuota === ultimaCuota
                  ? `${dinero(valorCuota)} Gs.`
                  : `${dinero(valorCuota)} Gs. (la última, ${dinero(ultimaCuota)})`
                : '—'}
            </strong>
          </Campo>
          <div className="span">
            <Campo etiqueta="Observación">
              <input name="observacion" maxLength={300} placeholder="Motivo, autorizado por…" defaultValue={adelanto?.observacion ?? ''} />
            </Campo>
          </div>
          {empleado ? (
            <p className="ayuda span">
              Sueldo mensual de referencia: {dinero(empleado.sueldoBase * PERIODOS_POR_MES[empleado.modalidadPago])} Gs. Lo que se
              descuenta en un mes, sumando adelantos y cuotas, no puede superarlo.
            </p>
          ) : null}
        </div>
        <div className="dialogo-acciones">
          {adelanto ? (
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

function CuotasAdelanto({ adelanto, onCerrar, onCambio }: { adelanto: Adelanto; onCerrar: () => void; onCambio: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [dia, setDia] = useState(hoy())

  async function cobrar(cuota: AdelantoCuota) {
    setOcupado(true)
    try {
      await apiCrear<Adelanto>(`/rrhh/adelantos/cuotas/${cuota.id}/cobro`, { fecha: dia })
      setError(null)
      onCambio()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo registrar el cobro')
    } finally {
      setOcupado(false)
    }
  }

  async function anular(cuota: AdelantoCuota) {
    if (
      !(await confirmar({
        titulo: 'Anular cobro',
        mensaje: `¿Volver a dejar pendiente la cuota ${cuota.numero} de ${dinero(cuota.monto)} Gs.?`,
        aceptar: 'Anular cobro',
        peligro: true,
      }))
    ) {
      return
    }
    setOcupado(true)
    try {
      await apiEliminar(`/rrhh/adelantos/cuotas/${cuota.id}/cobro`)
      setError(null)
      onCambio()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular el cobro')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialogo titulo={`${TIPOS[adelanto.tipo]} — ${adelanto.empleado}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="totales">
        <div>
          <span>Entregado el {fecha(adelanto.fecha)}</span>
          <strong>{dinero(adelanto.monto)}</strong>
        </div>
        <div>
          <span>Cobrado</span>
          <strong>{dinero(adelanto.cobrado)}</strong>
        </div>
        <div className="total">
          <span>Saldo</span>
          <strong>{dinero(adelanto.saldo)}</strong>
        </div>
      </div>
      {adelanto.observacion ? <p className="ayuda">{adelanto.observacion}</p> : null}
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th className="numero">N°</th>
              <th>Mes</th>
              <th className="numero">Monto</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {adelanto.cuotas.map((cuota) => (
              <tr key={cuota.id}>
                <td className="numero">{cuota.numero}</td>
                <td>{mesTexto(cuota.mes)}</td>
                <td className="numero">{dinero(cuota.monto)}</td>
                <td>
                  {cuota.fechaCobro ? (
                    <span className="estado">
                      {cuota.origenCobro === 'LIQUIDACION'
                        ? 'Descontada'
                        : cuota.origenCobro === 'LIQUIDACION_FINAL'
                          ? 'Descontada en la liquidación final'
                          : 'Cobrada'}{' '}
                      el {fecha(cuota.fechaCobro)}
                    </span>
                  ) : (
                    <span className="estado alerta">Pendiente</span>
                  )}
                </td>
                <td className="acciones">
                  {cuota.fechaCobro ? (
                    cuota.origenCobro === 'MANUAL' ? (
                      <button type="button" className="btn ghost" disabled={ocupado} onClick={() => void anular(cuota)}>
                        Anular cobro
                      </button>
                    ) : null
                  ) : (
                    <button type="button" className="btn ghost" disabled={ocupado} onClick={() => void cobrar(cuota)}>
                      Registrar cobro
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grilla">
        <Campo etiqueta="Fecha de cobro">
          <input type="date" min={adelanto.fecha} max={hoy()} value={dia} onChange={(event) => setDia(event.target.value)} />
        </Campo>
        <p className="ayuda">
          Registrá el cobro si el empleado devolvió la cuota en efectivo. Al liquidar sueldos, las cuotas del mes se descuentan
          solas.
        </p>
      </div>
      <div className="dialogo-acciones">
        <button className="btn" type="button" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}

function mesTexto(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number)
  const texto = new Date(anio, numero - 1, 1).toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function sumarMeses(mes: string, meses: number): string {
  const [anio, numero] = mes.split('-').map(Number)
  const resultado = new Date(anio, numero - 1 + meses, 1)
  return `${resultado.getFullYear()}-${String(resultado.getMonth() + 1).padStart(2, '0')}`
}
