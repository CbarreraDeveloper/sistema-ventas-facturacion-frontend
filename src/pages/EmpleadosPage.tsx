import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { apiActualizar, apiCrear, apiEliminar, apiListar, dinero, fecha, hoy, texto } from '../api/client'
import type { Cargo, Empleado, EmpleadoSueldo, EstadoCivil, ModalidadPago, OpcionesEmpleado } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, numeroOpcional, textoOpcional, valorInput } from '../components/ui'

const VACIO: OpcionesEmpleado = { cargos: [], usuarios: [] }

const MODALIDADES: Record<ModalidadPago, string> = {
  SEMANAL: 'Semanal',
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
}

const DIAS_DEL_PERIODO: Record<ModalidadPago, number> = {
  SEMANAL: 7,
  QUINCENAL: 15,
  MENSUAL: 30,
}

const PERIODOS_POR_MES: Record<ModalidadPago, number> = {
  SEMANAL: 52 / 12,
  QUINCENAL: 2,
  MENSUAL: 1,
}

const ESTADOS_CIVILES: Record<EstadoCivil, string> = {
  SOLTERO: 'Soltero/a',
  CASADO: 'Casado/a',
  UNION_DE_HECHO: 'Unión de hecho',
  DIVORCIADO: 'Divorciado/a',
  VIUDO: 'Viudo/a',
}

export function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [opciones, setOpciones] = useState<OpcionesEmpleado>(VACIO)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<Empleado | null | 'nuevo'>(null)
  const [cargosAbierto, setCargosAbierto] = useState(false)

  async function cargar() {
    try {
      const [lista, catalogo] = await Promise.all([
        apiListar<Empleado[]>('/rrhh/empleados'),
        apiListar<OpcionesEmpleado>('/rrhh/empleados/opciones'),
      ])
      setEmpleados(lista)
      setOpciones(catalogo)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los empleados')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const activos = empleados.filter((empleado) => empleado.activo)
  const costoMensual = activos.reduce(
    (suma, empleado) => suma + empleado.sueldoBase * PERIODOS_POR_MES[empleado.modalidadPago],
    0,
  )
  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtrados = empleados.filter((empleado) => {
    if (soloActivos && !empleado.activo) {
      return false
    }
    if (!consulta) {
      return true
    }
    return [nombreCompleto(empleado), empleado.documento, empleado.cargo, legajo(empleado.id)].some((valor) =>
      valor.toLocaleUpperCase('es-PY').includes(consulta),
    )
  })
  const paginacion = usePaginacion(filtrados)

  return (
    <section>
      <Barra kicker="Recursos humanos" titulo="Empleados" detalle="Legajo del personal con sus datos personales y laborales.">
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre, cédula, cargo o legajo" />
        </label>
        <label className="check linea">
          <input type="checkbox" checked={soloActivos} onChange={(event) => setSoloActivos(event.target.checked)} />
          Solo activos
        </label>
        <button type="button" className="btn" onClick={() => setCargosAbierto(true)}>
          Cargos
        </button>
        <button type="button" className="btn primary" onClick={() => setEditando('nuevo')}>
          Nuevo empleado
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Empleados activos</span>
          <strong>{activos.length}</strong>
        </div>
        <div>
          <span>Con comisión</span>
          <strong>{activos.filter((empleado) => empleado.percibeComision).length}</strong>
        </div>
        <div>
          <span>Asegurados en IPS</span>
          <strong>{activos.filter((empleado) => empleado.aseguradoIps).length}</strong>
        </div>
        <div className="total">
          <span>Sueldos por mes (estimado)</span>
          <strong>{dinero(Math.round(costoMensual))}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Apellidos y nombres</th>
              <th className="numero">Cédula</th>
              <th>Cargo</th>
              <th className="fecha">Ingreso</th>
              <th>Antigüedad</th>
              <th>Pago</th>
              <th className="numero">Sueldo</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((empleado) => (
              <tr key={empleado.id} className={empleado.activo ? undefined : 'baja'}>
                <td>{legajo(empleado.id)}</td>
                <td>{nombreCompleto(empleado)}</td>
                <td className="numero">{cedula(empleado.documento)}</td>
                <td>{empleado.cargo}</td>
                <td className="fecha">{fecha(empleado.fechaIngreso)}</td>
                <td>{antiguedad(empleado.fechaIngreso, empleado.fechaEgreso)}</td>
                <td>{MODALIDADES[empleado.modalidadPago]}</td>
                <td className="numero">{dinero(empleado.sueldoBase)}</td>
                <td>
                  <EstadoEmpleado empleado={empleado} />
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setEditando(empleado)}>
                    Legajo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && empleados.length === 0 ? <p className="vacio">Todavía no hay empleados cargados.</p> : null}
      {listo && empleados.length > 0 && filtrados.length === 0 ? (
        <p className="vacio">Ningún empleado coincide con la búsqueda.</p>
      ) : null}
      {editando ? (
        <FichaEmpleado
          empleado={editando === 'nuevo' ? null : editando}
          opciones={opciones}
          onCargos={() => setCargosAbierto(true)}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      ) : null}
      {cargosAbierto ? (
        <CargosDialogo
          onCerrar={() => {
            setCargosAbierto(false)
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

function EstadoEmpleado({ empleado }: { empleado: Empleado }) {
  if (!empleado.activo) {
    return <span className="estado anulado">Baja</span>
  }
  if (empleado.fechaEgreso) {
    return <span className="estado alerta">Egresa el {fecha(empleado.fechaEgreso)}</span>
  }
  return <span className="estado">Activo</span>
}

type Pestana = 'personales' | 'laborales'

function FichaEmpleado({
  empleado,
  opciones,
  onCargos,
  onCerrar,
  onGuardado,
}: {
  empleado: Empleado | null
  opciones: OpcionesEmpleado
  onCargos: () => void
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [pestana, setPestana] = useState<Pestana>('personales')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [asegurado, setAsegurado] = useState(empleado?.aseguradoIps ?? false)
  const [conEgreso, setConEgreso] = useState(empleado?.fechaEgreso != null)
  const [sueldos, setSueldos] = useState<EmpleadoSueldo[]>([])
  const [cargo, setCargo] = useState(empleado?.cargo ?? '')
  const [modalidad, setModalidad] = useState<ModalidadPago>(empleado?.modalidadPago ?? 'SEMANAL')
  const [sueldo, setSueldo] = useState<number | null>(empleado?.sueldoBase ?? null)
  const cargos = empleado && !opciones.cargos.includes(empleado.cargo) ? [...opciones.cargos, empleado.cargo] : opciones.cargos

  useEffect(() => {
    if (!empleado) {
      return
    }
    apiListar<EmpleadoSueldo[]>(`/rrhh/empleados/${empleado.id}/sueldos`)
      .then(setSueldos)
      .catch(() => setSueldos([]))
  }, [empleado])

  function mostrarCampoInvalido(event: FormEvent<HTMLFormElement>) {
    const panel = (event.target as HTMLElement).closest<HTMLElement>('[data-pestana]')
    const destino = panel?.dataset.pestana as Pestana | undefined
    if (destino && destino !== pestana) {
      flushSync(() => setPestana(destino))
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sueldoBase = numeroOpcional(valorInput(form, 'sueldoBase'))
    if (sueldoBase == null || sueldoBase <= 0) {
      setPestana('laborales')
      setError('El sueldo debe ser mayor a cero')
      return
    }
    const usuarioId = valorInput(form, 'usuarioId')
    const cuerpo = {
      nombres: valorInput(form, 'nombres'),
      apellidos: valorInput(form, 'apellidos'),
      documento: valorInput(form, 'documento'),
      fechaNacimiento: textoOpcional(valorInput(form, 'fechaNacimiento')),
      sexo: textoOpcional(valorInput(form, 'sexo')),
      estadoCivil: textoOpcional(valorInput(form, 'estadoCivil')),
      nacionalidad: textoOpcional(valorInput(form, 'nacionalidad')),
      hijosMenores: numeroOpcional(valorInput(form, 'hijosMenores')),
      profesion: textoOpcional(valorInput(form, 'profesion')),
      telefono: textoOpcional(valorInput(form, 'telefono')),
      email: textoOpcional(valorInput(form, 'email')),
      direccion: textoOpcional(valorInput(form, 'direccion')),
      ciudad: textoOpcional(valorInput(form, 'ciudad')),
      contactoEmergencia: textoOpcional(valorInput(form, 'contactoEmergencia')),
      telefonoEmergencia: textoOpcional(valorInput(form, 'telefonoEmergencia')),
      cargo: valorInput(form, 'cargo'),
      fechaIngreso: valorInput(form, 'fechaIngreso'),
      modalidadPago: valorInput(form, 'modalidadPago'),
      sueldoBase,
      percibeComision: marcado(form, 'percibeComision'),
      usuarioId: usuarioId ? Number(usuarioId) : null,
      aseguradoIps: asegurado,
      numeroIps: asegurado ? textoOpcional(valorInput(form, 'numeroIps')) : null,
      banco: textoOpcional(valorInput(form, 'banco')),
      numeroCuenta: textoOpcional(valorInput(form, 'numeroCuenta')),
      fechaEgreso: conEgreso ? textoOpcional(valorInput(form, 'fechaEgreso')) : null,
      motivoEgreso: conEgreso ? textoOpcional(valorInput(form, 'motivoEgreso')) : null,
      observacion: textoOpcional(valorInput(form, 'observacion')),
    }
    setGuardando(true)
    try {
      if (empleado) {
        await apiActualizar<Empleado>(`/rrhh/empleados/${empleado.id}`, cuerpo)
      } else {
        await apiCrear<Empleado>('/rrhh/empleados', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el legajo')
      setGuardando(false)
      form.closest('.dialogo')?.scrollTo({ top: 0 })
    }
  }

  const titulo = empleado ? `Legajo ${legajo(empleado.id)} · ${nombreCompleto(empleado)}` : 'Nuevo empleado'

  return (
    <Dialogo clase="ancho" titulo={titulo} onCerrar={onCerrar}>
      <div className="pestanas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'personales'}
          className={pestana === 'personales' ? 'pestana activa' : 'pestana'}
          onClick={() => setPestana('personales')}
        >
          Datos personales
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'laborales'}
          className={pestana === 'laborales' ? 'pestana activa' : 'pestana'}
          onClick={() => setPestana('laborales')}
        >
          Datos laborales
        </button>
      </div>
      <form onSubmit={(event) => void guardar(event)} onInvalidCapture={mostrarCampoInvalido}>
        <Aviso mensaje={error} />

        <div className="grilla tres" role="tabpanel" data-pestana="personales" hidden={pestana !== 'personales'}>
          <Campo etiqueta="Nombres">
            <input name="nombres" required maxLength={80} defaultValue={empleado?.nombres ?? ''} />
          </Campo>
          <Campo etiqueta="Apellidos">
            <input name="apellidos" required maxLength={80} defaultValue={empleado?.apellidos ?? ''} />
          </Campo>
          <Campo etiqueta="Cédula de identidad">
            <input name="documento" required maxLength={20} placeholder="1234567" defaultValue={empleado?.documento ?? ''} />
          </Campo>
          <Campo etiqueta="Fecha de nacimiento">
            <input name="fechaNacimiento" type="date" max={hoy()} defaultValue={empleado?.fechaNacimiento ?? ''} />
          </Campo>
          <Campo etiqueta="Sexo">
            <select name="sexo" defaultValue={empleado?.sexo ?? ''}>
              <option value="">Sin indicar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </Campo>
          <Campo etiqueta="Estado civil">
            <select name="estadoCivil" defaultValue={empleado?.estadoCivil ?? ''}>
              <option value="">Sin indicar</option>
              {Object.entries(ESTADOS_CIVILES).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Nacionalidad">
            <input name="nacionalidad" maxLength={40} defaultValue={empleado?.nacionalidad ?? 'PARAGUAYA'} />
          </Campo>
          <Campo etiqueta="Hijos menores">
            <input name="hijosMenores" type="number" min={0} max={30} defaultValue={empleado?.hijosMenores ?? ''} />
          </Campo>
          <Campo etiqueta="Profesión u oficio">
            <input name="profesion" maxLength={100} defaultValue={empleado?.profesion ?? ''} />
          </Campo>
          <Campo etiqueta="Teléfono o celular">
            <input name="telefono" maxLength={40} defaultValue={empleado?.telefono ?? ''} />
          </Campo>
          <Campo etiqueta="Correo">
            <input name="email" type="email" maxLength={120} defaultValue={empleado?.email ?? ''} />
          </Campo>
          <Campo etiqueta="Ciudad">
            <input name="ciudad" maxLength={80} defaultValue={empleado?.ciudad ?? ''} />
          </Campo>
          <Campo etiqueta="Dirección">
            <input name="direccion" maxLength={200} defaultValue={empleado?.direccion ?? ''} />
          </Campo>
          <Campo etiqueta="Contacto de emergencia">
            <input name="contactoEmergencia" maxLength={120} placeholder="Nombre y parentesco" defaultValue={empleado?.contactoEmergencia ?? ''} />
          </Campo>
          <Campo etiqueta="Teléfono de emergencia">
            <input name="telefonoEmergencia" maxLength={40} defaultValue={empleado?.telefonoEmergencia ?? ''} />
          </Campo>
        </div>

        <div role="tabpanel" data-pestana="laborales" hidden={pestana !== 'laborales'}>
          <div className="grilla tres">
            <div className="campo-con-accion">
              <Campo etiqueta="Cargo">
                <select name="cargo" required value={cargo} onChange={(event) => setCargo(event.target.value)}>
                  <option value="">Elegí un cargo</option>
                  {cargos.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {opciones.cargos.includes(nombre) ? nombre : `${nombre} (desactivado)`}
                    </option>
                  ))}
                </select>
              </Campo>
              <button type="button" className="btn ghost" onClick={onCargos}>
                Cargos
              </button>
            </div>
            <Campo etiqueta="Fecha de ingreso">
              <input name="fechaIngreso" type="date" required defaultValue={empleado?.fechaIngreso ?? hoy()} />
            </Campo>
            <Campo etiqueta="Modalidad de pago">
              <select
                name="modalidadPago"
                required
                value={modalidad}
                onChange={(event) => setModalidad(event.target.value as ModalidadPago)}
              >
                {Object.entries(MODALIDADES).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Sueldo por período (Gs.)">
              <Monto name="sueldoBase" valor={empleado?.sueldoBase} decimales={0} required onValor={setSueldo} />
            </Campo>
            <Campo etiqueta={`Valor del día (sueldo ÷ ${DIAS_DEL_PERIODO[modalidad]})`}>
              <input readOnly tabIndex={-1} value={sueldo && sueldo > 0 ? dinero(Math.round(sueldo / DIAS_DEL_PERIODO[modalidad])) : ''} />
            </Campo>
            <Campo etiqueta="Usuario del sistema">
              <select name="usuarioId" defaultValue={empleado?.usuarioId ?? ''}>
                <option value="">Sin usuario</option>
                {opciones.usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre} ({usuario.codigo})
                  </option>
                ))}
              </select>
            </Campo>
            <p className="ayuda span">
              El valor del día se calcula solo: sueldo semanal ÷ 7, quincenal ÷ 15 o mensual ÷ 30. Se usa para descontar
              ausencias y pagar horas extra. Vincular el usuario permite calcular las comisiones sobre las ventas que factura.
            </p>
            <label className="check">
              <input name="percibeComision" type="checkbox" defaultChecked={empleado?.percibeComision ?? false} />
              Percibe comisión por ventas
            </label>
            <label className="check">
              <input type="checkbox" checked={asegurado} onChange={(event) => setAsegurado(event.target.checked)} />
              Asegurado en IPS
            </label>
            {asegurado ? (
              <Campo etiqueta="N° de asegurado IPS">
                <input name="numeroIps" maxLength={30} defaultValue={empleado?.numeroIps ?? ''} />
              </Campo>
            ) : (
              <span />
            )}
            <Campo etiqueta="Banco">
              <input name="banco" maxLength={80} defaultValue={empleado?.banco ?? ''} />
            </Campo>
            <Campo etiqueta="N° de cuenta">
              <input name="numeroCuenta" maxLength={40} defaultValue={empleado?.numeroCuenta ?? ''} />
            </Campo>
            <span />
            <div className="span">
              <Campo etiqueta="Observaciones">
                <textarea name="observacion" maxLength={500} rows={2} defaultValue={empleado?.observacion ?? ''} />
              </Campo>
            </div>
            <label className="check span">
              <input type="checkbox" checked={conEgreso} onChange={(event) => setConEgreso(event.target.checked)} />
              Registrar egreso (baja del empleado)
            </label>
            {conEgreso ? (
              <>
                <Campo etiqueta="Fecha de egreso">
                  <input name="fechaEgreso" type="date" required defaultValue={empleado?.fechaEgreso ?? hoy()} />
                </Campo>
                <div className="span-dos">
                  <Campo etiqueta="Motivo del egreso">
                    <input name="motivoEgreso" required maxLength={200} placeholder="Renuncia, despido, fin de contrato…" defaultValue={empleado?.motivoEgreso ?? ''} />
                  </Campo>
                </div>
              </>
            ) : null}
          </div>

          {empleado ? (
            <>
              <h3 className="bloque">Historial de sueldo</h3>
              <p className="ayuda">
                Antigüedad: {antiguedad(empleado.fechaIngreso, empleado.fechaEgreso)}. Cada cambio de sueldo o de
                modalidad queda registrado.
              </p>
              <div className="tabla-contenedor">
                <table className="tabla lineas">
                  <thead>
                    <tr>
                      <th className="fecha">Desde</th>
                      <th>Pago</th>
                      <th className="numero">Sueldo</th>
                      <th>Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sueldos.map((sueldo) => (
                      <tr key={sueldo.id}>
                        <td className="fecha">{fecha(sueldo.desde)}</td>
                        <td>{MODALIDADES[sueldo.modalidadPago]}</td>
                        <td className="numero">{dinero(sueldo.sueldoBase)}</td>
                        <td>{texto(sueldo.usuario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <div className="dialogo-acciones">
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

function legajo(id: number): string {
  return String(id).padStart(4, '0')
}

function nombreCompleto(empleado: Empleado): string {
  return `${empleado.apellidos}, ${empleado.nombres}`
}

function cedula(documento: string): string {
  return /^\d+$/.test(documento) ? Number(documento).toLocaleString('es-PY') : documento
}

function antiguedad(ingreso: string, egreso: string | null): string {
  const desde = new Date(`${ingreso}T00:00:00`)
  const hasta = egreso && egreso < hoy() ? new Date(`${egreso}T00:00:00`) : new Date()
  let meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + hasta.getMonth() - desde.getMonth()
  if (hasta.getDate() < desde.getDate()) {
    meses -= 1
  }
  if (meses < 0) {
    return '—'
  }
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  const partes = []
  if (anios > 0) {
    partes.push(anios === 1 ? '1 año' : `${anios} años`)
  }
  if (resto > 0 || anios === 0) {
    partes.push(resto === 1 ? '1 mes' : `${resto} meses`)
  }
  return partes.join(' y ')
}

export function CargosDialogo({ onCerrar }: { onCerrar: () => void }) {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [editando, setEditando] = useState<{ id: number; nombre: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function cargar() {
    try {
      setCargos(await apiListar<Cargo[]>('/rrhh/cargos'))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los cargos')
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true)
    try {
      await accion()
      setError(null)
      await cargar()
      return true
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el cargo')
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function agregar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await ejecutar(() => apiCrear<Cargo>('/rrhh/cargos', { nombre: nuevo }))) {
      setNuevo('')
    }
  }

  async function renombrar(event: FormEvent<HTMLFormElement>, cargo: Cargo) {
    event.preventDefault()
    if (!editando) {
      return
    }
    if (await ejecutar(() => apiActualizar<Cargo>(`/rrhh/cargos/${cargo.id}`, { nombre: editando.nombre, activo: cargo.activo }))) {
      setEditando(null)
    }
  }

  async function eliminar(cargo: Cargo) {
    if (
      await confirmar({
        titulo: 'Eliminar cargo',
        mensaje: `¿Eliminar el cargo ${cargo.nombre}?`,
        aceptar: 'Eliminar',
        peligro: true,
      })
    ) {
      await ejecutar(() => apiEliminar(`/rrhh/cargos/${cargo.id}`))
    }
  }

  return (
    <Dialogo titulo="Cargos" onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <form className="periodo" onSubmit={(event) => void agregar(event)}>
        <Campo etiqueta="Nuevo cargo">
          <input required maxLength={80} value={nuevo} onChange={(event) => setNuevo(event.target.value)} placeholder="Encargado de depósito" />
        </Campo>
        <button type="submit" className="btn primary" disabled={ocupado}>
          Agregar
        </button>
      </form>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cargo</th>
              <th className="numero">Empleados</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cargos.map((cargo) => (
              <tr key={cargo.id} className={cargo.activo ? undefined : 'baja'}>
                <td>
                  {editando?.id === cargo.id ? (
                    <form id={`cargo-${cargo.id}`} onSubmit={(event) => void renombrar(event, cargo)}>
                      <input
                        required
                        autoFocus
                        maxLength={80}
                        value={editando.nombre}
                        onChange={(event) => setEditando({ id: cargo.id, nombre: event.target.value })}
                      />
                    </form>
                  ) : (
                    cargo.nombre
                  )}
                </td>
                <td className="numero">{cargo.empleados}</td>
                <td>{cargo.activo ? <span className="estado">Activo</span> : <span className="estado anulado">Desactivado</span>}</td>
                <td className="acciones">
                  {editando?.id === cargo.id ? (
                    <>
                      <button type="submit" form={`cargo-${cargo.id}`} className="btn primary" disabled={ocupado}>
                        Guardar
                      </button>
                      <button type="button" className="btn ghost" onClick={() => setEditando(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn ghost" onClick={() => setEditando({ id: cargo.id, nombre: cargo.nombre })}>
                        Renombrar
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={ocupado}
                        onClick={() =>
                          void ejecutar(() =>
                            apiActualizar<Cargo>(`/rrhh/cargos/${cargo.id}`, { nombre: cargo.nombre, activo: !cargo.activo }),
                          )
                        }
                      >
                        {cargo.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      {cargo.empleados === 0 ? (
                        <button type="button" className="btn ghost peligro" disabled={ocupado} onClick={() => void eliminar(cargo)}>
                          Eliminar
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
      <p className="ayuda">
        Renombrar un cargo lo cambia en todos los legajos que lo tienen. Un cargo con empleados no se puede eliminar; desactivalo
        para que no aparezca en los legajos nuevos.
      </p>
    </Dialogo>
  )
}

function marcado(form: HTMLFormElement, nombre: string): boolean {
  const campo = form.elements.namedItem(nombre)
  return campo instanceof HTMLInputElement && campo.checked
}
