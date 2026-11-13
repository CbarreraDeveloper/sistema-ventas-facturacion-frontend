import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiActualizar, apiCrear, apiEliminar, apiEnviar, apiListar, dinero, fecha, hoy } from '../api/client'
import type { CausaEgreso, Empleado, FormaPagoSueldo, LiquidacionFinal } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { Aviso, Barra, Campo, Dialogo, Monto } from '../components/ui'
import { FORMAS } from './LiquidacionesPage'

const CAUSAS: Record<CausaEgreso, { etiqueta: string; ayuda: string }> = {
  DESPIDO_INJUSTIFICADO: {
    etiqueta: 'Despido sin causa',
    ayuda: 'Corresponden preaviso (si no se otorgó), indemnización, vacaciones y aguinaldo proporcional.',
  },
  DESPIDO_JUSTIFICADO: {
    etiqueta: 'Despido con causa',
    ayuda: 'Por una causa del art. 81. Sin preaviso ni indemnización; se pagan vacaciones y aguinaldo proporcional.',
  },
  RENUNCIA: { etiqueta: 'Renuncia', ayuda: 'Sin preaviso ni indemnización; se pagan vacaciones y aguinaldo proporcional.' },
  MUTUO_ACUERDO: {
    etiqueta: 'Mutuo acuerdo',
    ayuda: 'Se pagan vacaciones y aguinaldo proporcional; lo que se acuerde de más se carga como otro ingreso.',
  },
}

type Edicion = { liquidacion: LiquidacionFinal | null }

export function LiquidacionesFinalesPage() {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionFinal[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<Edicion | null>(null)
  const [abierta, setAbierta] = useState<number | null>(null)

  async function cargar() {
    try {
      const [lista, personal] = await Promise.all([
        apiListar<LiquidacionFinal[]>('/rrhh/liquidaciones-finales'),
        apiListar<Empleado[]>('/rrhh/empleados'),
      ])
      setLiquidaciones(lista)
      setEmpleados(personal)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las liquidaciones finales')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  function reemplazar(actualizada: LiquidacionFinal) {
    setLiquidaciones((lista) =>
      lista.some((item) => item.id === actualizada.id)
        ? lista.map((item) => (item.id === actualizada.id ? actualizada : item))
        : [actualizada, ...lista],
    )
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const visibles = liquidaciones.filter((item) => !consulta || item.empleado.toLocaleUpperCase('es-PY').includes(consulta))
  const pendientes = liquidaciones.filter((item) => !item.fechaPago)
  const seleccionada = liquidaciones.find((item) => item.id === abierta) ?? null

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Liquidación final"
        detalle="Lo que corresponde pagar cuando termina la relación laboral: vacaciones, aguinaldo proporcional y, en el despido sin causa, preaviso e indemnización."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Empleado" />
        </label>
        <button type="button" className="btn primary" onClick={() => setEditando({ liquidacion: null })}>
          Nueva liquidación final
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Liquidaciones</span>
          <strong>{liquidaciones.length}</strong>
        </div>
        <div>
          <span>Pendientes de pago</span>
          <strong>{pendientes.length}</strong>
        </div>
        <div>
          <span>Pagado</span>
          <strong>{dinero(liquidaciones.filter((item) => item.fechaPago).reduce((suma, item) => suma + item.neto, 0))}</strong>
        </div>
        <div className="total">
          <span>A pagar</span>
          <strong>{dinero(pendientes.reduce((suma, item) => suma + Math.max(0, item.neto), 0))}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Egreso</th>
              <th>Causa</th>
              <th>Antigüedad</th>
              <th className="numero">Haberes</th>
              <th className="numero">Descuentos</th>
              <th className="numero">Neto</th>
              <th>Pago</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.empleado}
                  <small className="sub">{item.cargo}</small>
                </td>
                <td>{fecha(item.fechaEgreso)}</td>
                <td>{CAUSAS[item.causa].etiqueta}</td>
                <td>{item.antiguedad}</td>
                <td className="numero">{dinero(item.haberes)}</td>
                <td className="numero">{dinero(item.descuentos)}</td>
                <td className="numero">
                  <strong className={item.neto < 0 ? 'falta' : undefined}>{dinero(item.neto)}</strong>
                </td>
                <td>
                  {item.fechaPago ? (
                    <>
                      <span className="estado">Pagada</span>
                      <small className="sub">
                        {fecha(item.fechaPago)} · {FORMAS[item.formaPago ?? 'EFECTIVO']}
                      </small>
                    </>
                  ) : (
                    <span className="estado alerta">{item.avisos.length > 0 ? 'Revisar' : 'Pendiente'}</span>
                  )}
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setAbierta(item.id)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listo && liquidaciones.length === 0 ? <p className="vacio">Todavía no hay liquidaciones finales.</p> : null}
      <p className="ayuda">
        Antes de la liquidación final, generá y confirmá la liquidación de sueldo que cubre la fecha de egreso: paga los días
        trabajados (corta sola en el egreso), y con eso el aguinaldo proporcional queda completo. El salario diario es el
        promedio de lo cobrado en los últimos seis meses. El pago no mueve la caja.
      </p>

      {editando ? (
        <FichaLiquidacionFinal
          liquidacion={editando.liquidacion}
          empleados={empleados}
          tomados={new Set(liquidaciones.map((item) => item.empleadoId))}
          onCerrar={() => setEditando(null)}
          onGuardada={(guardada) => {
            setEditando(null)
            reemplazar(guardada)
            setAbierta(guardada.id)
          }}
        />
      ) : null}
      {seleccionada && !editando ? (
        <DetalleLiquidacionFinal
          liquidacion={seleccionada}
          onCambio={reemplazar}
          onEditar={() => setEditando({ liquidacion: seleccionada })}
          onEliminada={() => {
            setAbierta(null)
            void cargar()
          }}
          onCerrar={() => setAbierta(null)}
        />
      ) : null}
    </section>
  )
}

function cuerpo(liquidacion: LiquidacionFinal) {
  return {
    empleadoId: liquidacion.empleadoId,
    fechaEgreso: liquidacion.fechaEgreso,
    causa: liquidacion.causa,
    motivo: liquidacion.motivo,
    preavisoOtorgado: liquidacion.preavisoOtorgado,
    salarioDiarioAcordado: liquidacion.salarioDiarioAcordado,
    diasVacacionesAcordados: liquidacion.diasVacacionesAcordados,
    otrasRemuneraciones: liquidacion.otrasRemuneraciones,
    notaOtras: liquidacion.notaOtras,
  }
}

function FichaLiquidacionFinal({
  liquidacion,
  empleados,
  tomados,
  onCerrar,
  onGuardada,
}: {
  liquidacion: LiquidacionFinal | null
  empleados: Empleado[]
  tomados: Set<number>
  onCerrar: () => void
  onGuardada: (liquidacion: LiquidacionFinal) => void
}) {
  const [empleadoId, setEmpleadoId] = useState(String(liquidacion?.empleadoId ?? ''))
  const [egreso, setEgreso] = useState(liquidacion?.fechaEgreso ?? hoy())
  const [causa, setCausa] = useState<CausaEgreso>(liquidacion?.causa ?? 'DESPIDO_INJUSTIFICADO')
  const [motivo, setMotivo] = useState(liquidacion?.motivo ?? '')
  const [preaviso, setPreaviso] = useState(liquidacion?.preavisoOtorgado ?? false)
  const [salario, setSalario] = useState<number | null>(liquidacion?.salarioDiarioAcordado ?? null)
  const [diasVacaciones, setDiasVacaciones] = useState(liquidacion?.diasVacacionesAcordados?.toString().replace('.', ',') ?? '')
  const [otras, setOtras] = useState<number | null>(liquidacion ? liquidacion.otrasRemuneraciones : null)
  const [nota, setNota] = useState(liquidacion?.notaOtras ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const elegibles = empleados.filter((empleado) => empleado.id === liquidacion?.empleadoId || !tomados.has(empleado.id))

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!empleadoId) {
      setError('Elegí el empleado')
      return
    }
    const datos = {
      empleadoId: Number(empleadoId),
      fechaEgreso: egreso,
      causa,
      motivo: motivo.trim() || null,
      preavisoOtorgado: causa === 'DESPIDO_INJUSTIFICADO' ? preaviso : false,
      salarioDiarioAcordado: salario && salario > 0 ? salario : null,
      diasVacacionesAcordados: diasVacaciones.trim() === '' ? null : Number(diasVacaciones.replace(',', '.')),
      otrasRemuneraciones: otras,
      notaOtras: nota.trim() || null,
    }
    setGuardando(true)
    try {
      onGuardada(
        liquidacion
          ? await apiActualizar<LiquidacionFinal>(`/rrhh/liquidaciones-finales/${liquidacion.id}`, datos)
          : await apiCrear<LiquidacionFinal>('/rrhh/liquidaciones-finales', datos),
      )
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={liquidacion ? `Liquidación final de ${liquidacion.empleado}` : 'Nueva liquidación final'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="opciones-estado" role="radiogroup" aria-label="Causa del egreso">
          {(Object.keys(CAUSAS) as CausaEgreso[]).map((valor) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={causa === valor}
              className={causa === valor ? 'btn primary' : 'btn'}
              onClick={() => setCausa(valor)}
            >
              {CAUSAS[valor].etiqueta}
            </button>
          ))}
        </div>
        <p className="ayuda">{CAUSAS[causa].ayuda}</p>
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Empleado">
              <select value={empleadoId} onChange={(event) => setEmpleadoId(event.target.value)} disabled={liquidacion != null} required>
                <option value="">Elegí el empleado</option>
                {elegibles.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.apellidos}, {empleado.nombres}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Fecha de egreso (último día trabajado)">
            <input type="date" required value={egreso} onChange={(event) => setEgreso(event.target.value)} />
          </Campo>
          <Campo etiqueta="Motivo">
            <input maxLength={200} value={motivo} placeholder="Detalle del egreso" onChange={(event) => setMotivo(event.target.value)} />
          </Campo>
          {causa === 'DESPIDO_INJUSTIFICADO' ? (
            <div className="span">
              <label className="check">
                <input type="checkbox" checked={preaviso} onChange={(event) => setPreaviso(event.target.checked)} />
                Se le dio el preaviso por escrito y lo cumplió trabajando (no se paga el preaviso)
              </label>
            </div>
          ) : null}
        </div>

        <h3 className="bloque">Ajustes (opcionales)</h3>
        <div className="grilla">
          <Campo etiqueta="Salario diario acordado (Gs.)">
            <Monto name="salario" valor={salario} decimales={0} onValor={setSalario} />
          </Campo>
          <Campo etiqueta="Días de vacaciones pendientes">
            <input
              inputMode="decimal"
              value={diasVacaciones}
              placeholder="Según el sistema"
              onChange={(event) => setDiasVacaciones(event.target.value.replace(/[^\d,]/g, ''))}
            />
          </Campo>
          <Campo etiqueta="Otras remuneraciones del año (Gs.)">
            <Monto name="otras" valor={otras} decimales={0} onValor={setOtras} />
          </Campo>
          <Campo etiqueta="De dónde salen">
            <input maxLength={200} value={nota} placeholder="Sueldos de enero a marzo…" onChange={(event) => setNota(event.target.value)} />
          </Campo>
        </div>
        <p className="ayuda">
          Dejá vacío el salario diario para usar el promedio de los últimos seis meses, y los días de vacaciones para usar el
          saldo de Vacaciones y permisos. Las otras remuneraciones son lo cobrado en el año antes de usar el sistema (suman
          al aguinaldo proporcional){liquidacion ? '' : '; si ya las cargaste en Aguinaldo, se toman de ahí'}.
        </p>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            {liquidacion ? 'Guardar y recalcular' : 'Calcular'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function DetalleLiquidacionFinal({
  liquidacion,
  onCambio,
  onEditar,
  onEliminada,
  onCerrar,
}: {
  liquidacion: LiquidacionFinal
  onCambio: (liquidacion: LiquidacionFinal) => void
  onEditar: () => void
  onEliminada: () => void
  onCerrar: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [tipo, setTipo] = useState<'OTRO_INGRESO' | 'OTRO_DESCUENTO'>('OTRO_INGRESO')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState<number | null>(null)
  const [montoClave, setMontoClave] = useState(0)
  const [forma, setForma] = useState<FormaPagoSueldo>('EFECTIVO')
  const [diaPago, setDiaPago] = useState(hoy())
  const pagada = liquidacion.fechaPago != null
  const base = `/rrhh/liquidaciones-finales/${liquidacion.id}`

  async function ejecutar(accion: () => Promise<void>, falla: string) {
    setOcupado(true)
    try {
      await accion()
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : falla)
    } finally {
      setOcupado(false)
    }
  }

  function agregar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ejecutar(async () => {
      onCambio(await apiCrear<LiquidacionFinal>(`${base}/lineas`, { concepto: tipo, descripcion: descripcion.trim(), monto }))
      setDescripcion('')
      setMonto(null)
      setMontoClave((clave) => clave + 1)
    }, 'No se pudo agregar el concepto')
  }

  function pagar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ejecutar(async () => {
      onCambio(await apiEnviar<LiquidacionFinal>(`${base}/pago`, { method: 'POST', body: JSON.stringify({ fecha: diaPago, forma }) }))
    }, 'No se pudo registrar el pago')
  }

  async function anularPago() {
    if (
      !(await confirmar({
        titulo: 'Anular pago',
        mensaje: `¿Anular el pago de la liquidación final de ${liquidacion.empleado}? Las cuotas de préstamos descontadas vuelven a quedar pendientes.`,
        aceptar: 'Anular pago',
        peligro: true,
      }))
    ) {
      return
    }
    await ejecutar(async () => {
      onCambio(await apiEnviar<LiquidacionFinal>(`${base}/pago`, { method: 'DELETE' }))
    }, 'No se pudo anular el pago')
  }

  async function eliminar() {
    if (
      !(await confirmar({
        titulo: 'Eliminar liquidación final',
        mensaje: `¿Eliminar la liquidación final de ${liquidacion.empleado}? También se borra su fecha de egreso y vuelve a figurar como activo.`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return
    }
    await ejecutar(async () => {
      await apiEliminar(base)
      onEliminada()
    }, 'No se pudo eliminar')
  }

  return (
    <Dialogo titulo={`Liquidación final de ${liquidacion.empleado}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      {liquidacion.avisos.length > 0 ? (
        <div className="aviso advertencia">
          <ul>
            {liquidacion.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="ayuda">
        {liquidacion.causaEtiqueta}
        {liquidacion.motivo ? ` (${liquidacion.motivo})` : ''} · ingreso {fecha(liquidacion.fechaIngreso)}, egreso{' '}
        {fecha(liquidacion.fechaEgreso)} · antigüedad {liquidacion.antiguedad} · salario diario{' '}
        <strong>{dinero(liquidacion.salarioDiario)}</strong>
        {liquidacion.salarioDiarioAcordado != null ? ` (acordado; el promedio da ${dinero(liquidacion.salarioPromedio)})` : ''}
      </p>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="numero">Días</th>
              <th className="numero">Haberes</th>
              <th className="numero">Descuentos</th>
              {!pagada ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {liquidacion.lineas.map((linea) => (
              <tr key={linea.id}>
                <td>{linea.descripcion}</td>
                <td className="numero">{linea.dias != null ? linea.dias.toLocaleString('es-PY') : ''}</td>
                <td className="numero">{linea.haber ? dinero(linea.monto) : ''}</td>
                <td className="numero">{linea.haber ? '' : dinero(linea.monto)}</td>
                {!pagada ? (
                  <td className="acciones">
                    {linea.manual ? (
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={ocupado}
                        onClick={() =>
                          void ejecutar(async () => {
                            onCambio(await apiEnviar<LiquidacionFinal>(`${base}/lineas/${linea.id}`, { method: 'DELETE' }))
                          }, 'No se pudo quitar')
                        }
                      >
                        Quitar
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {liquidacion.lineas.length === 0 ? <p className="vacio">No hay conceptos a liquidar.</p> : null}

      <div className="totales cuatro">
        <div>
          <span>Haberes</span>
          <strong>{dinero(liquidacion.haberes)}</strong>
        </div>
        <div>
          <span>Descuentos</span>
          <strong>{dinero(liquidacion.descuentos)}</strong>
        </div>
        <div>
          <span>Causa</span>
          <strong>{CAUSAS[liquidacion.causa].etiqueta}</strong>
        </div>
        <div className="total">
          <span>{liquidacion.neto < 0 ? 'Saldo a favor de la empresa' : 'Neto a cobrar'}</span>
          <strong>{dinero(Math.abs(liquidacion.neto))}</strong>
        </div>
      </div>

      {pagada ? (
        <p className="ayuda">
          Pagada el {fecha(liquidacion.fechaPago)} en {FORMAS[liquidacion.formaPago ?? 'EFECTIVO'].toLowerCase()}. Para
          modificarla, anulá el pago.
        </p>
      ) : (
        <>
          <h3 className="bloque">Agregar otro ingreso o descuento</h3>
          <form onSubmit={agregar}>
            <div className="grilla">
              <Campo etiqueta="Tipo">
                <select value={tipo} onChange={(event) => setTipo(event.target.value as typeof tipo)}>
                  <option value="OTRO_INGRESO">Otro ingreso</option>
                  <option value="OTRO_DESCUENTO">Otro descuento</option>
                </select>
              </Campo>
              <Campo etiqueta="Monto (Gs.)">
                <Monto key={montoClave} name="monto" valor={monto} decimales={0} required onValor={setMonto} />
              </Campo>
              <div className="span">
                <Campo etiqueta="Descripción">
                  <input
                    required
                    maxLength={200}
                    value={descripcion}
                    placeholder="Bonificación acordada, faltante de caja…"
                    onChange={(event) => setDescripcion(event.target.value)}
                  />
                </Campo>
              </div>
            </div>
            <div className="dialogo-acciones">
              <button className="btn" type="submit" disabled={ocupado}>
                Agregar
              </button>
            </div>
          </form>

          <h3 className="bloque">Registrar pago</h3>
          <form onSubmit={pagar}>
            <div className="grilla">
              <Campo etiqueta="Fecha de pago">
                <input
                  type="date"
                  required
                  min={liquidacion.fechaIngreso}
                  max={hoy()}
                  value={diaPago}
                  onChange={(event) => setDiaPago(event.target.value)}
                />
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
              <button className="btn primary" type="submit" disabled={ocupado}>
                Registrar pago de {dinero(Math.max(0, liquidacion.neto))} Gs.
              </button>
            </div>
          </form>
        </>
      )}

      <div className="dialogo-acciones">
        {pagada ? (
          <button className="btn" type="button" disabled={ocupado} onClick={() => void anularPago()}>
            Anular pago
          </button>
        ) : (
          <>
            <button className="btn" type="button" disabled={ocupado} onClick={() => void eliminar()}>
              Eliminar
            </button>
            <button className="btn" type="button" disabled={ocupado} onClick={onEditar}>
              Editar datos
            </button>
            <button
              className="btn"
              type="button"
              disabled={ocupado}
              onClick={() =>
                void ejecutar(async () => {
                  onCambio(await apiActualizar<LiquidacionFinal>(base, cuerpo(liquidacion)))
                }, 'No se pudo recalcular')
              }
            >
              Recalcular
            </button>
          </>
        )}
        <button
          className="btn"
          type="button"
          onClick={() =>
            void apiAbrir(`${base}/pdf`).catch((causa: unknown) =>
              setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF'),
            )
          }
        >
          Imprimir
        </button>
        <button className="btn primary" type="button" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}
