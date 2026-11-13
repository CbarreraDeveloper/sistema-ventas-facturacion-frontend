import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiCrear, apiEliminar, apiListar, fecha, hoy } from '../api/client'
import type { ConfiguracionRrhh, Empleado, Jornada, Licencia, SaldoVacaciones, TipoLicencia } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo } from '../components/ui'

export const TIPOS_LICENCIA: Record<TipoLicencia, { etiqueta: string; plural: string; clase: string }> = {
  VACACIONES: { etiqueta: 'Vacaciones', plural: 'Vacaciones', clase: 'estado vacaciones' },
  PERMISO: { etiqueta: 'Permiso', plural: 'Permisos', clase: 'estado permiso' },
  REPOSO: { etiqueta: 'Reposo', plural: 'Reposos', clase: 'estado reposo' },
}

type Filtro = 'TODOS' | TipoLicencia
type Edicion = { licencia: Licencia | null; empleadoId?: number; tipo?: TipoLicencia }

export function LicenciasPage() {
  const [licencias, setLicencias] = useState<Licencia[]>([])
  const [saldos, setSaldos] = useState<SaldoVacaciones[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<Edicion | null>(null)
  const [jornadas, setJornadas] = useState<Jornada[]>(['COMPLETA', 'COMPLETA', 'COMPLETA', 'COMPLETA', 'COMPLETA', 'MEDIA', 'NO_LABORAL'])

  async function cargar() {
    try {
      const [lista, vacaciones, personal, configuracion] = await Promise.all([
        apiListar<Licencia[]>('/rrhh/licencias'),
        apiListar<SaldoVacaciones[]>('/rrhh/licencias/vacaciones'),
        apiListar<Empleado[]>('/rrhh/empleados'),
        apiListar<ConfiguracionRrhh>('/rrhh/configuracion'),
      ])
      setJornadas(configuracion.jornadas)
      setLicencias(lista)
      setSaldos(vacaciones)
      setEmpleados(personal)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las vacaciones y permisos')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function eliminar(licencia: Licencia) {
    if (
      !(await confirmar({
        titulo: 'Eliminar licencia',
        mensaje: `¿Eliminar ${TIPOS_LICENCIA[licencia.tipo].etiqueta.toLowerCase()} de ${licencia.empleado} del ${fecha(licencia.desde)} al ${fecha(licencia.hasta)}? También se quitan esos días de la asistencia.`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return
    }
    try {
      await apiEliminar(`/rrhh/licencias/${licencia.id}`)
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo eliminar')
    }
  }

  const actual = hoy()
  const vigentesHoy = licencias.filter((licencia) => licencia.desde <= actual && licencia.hasta >= actual)
  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const coincide = (nombre: string) => !consulta || nombre.toLocaleUpperCase('es-PY').includes(consulta)
  const filtradas = licencias.filter((licencia) => (filtro === 'TODOS' || licencia.tipo === filtro) && coincide(licencia.empleado))
  const saldosVisibles = saldos.filter((saldo) => coincide(saldo.empleado))
  const paginacion = usePaginacion(filtradas)

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Vacaciones y permisos"
        detalle="Cada día laboral queda marcado en Asistencia. Las vacaciones y las licencias con goce no se descuentan del sueldo."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Empleado" />
        </label>
        <label className="campo">
          <span>Mostrar</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value as Filtro)}>
            <option value="TODOS">Todas las licencias</option>
            {(Object.keys(TIPOS_LICENCIA) as TipoLicencia[]).map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPOS_LICENCIA[tipo].plural}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn primary" onClick={() => setEditando({ licencia: null })}>
          Registrar
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>De vacaciones hoy</span>
          <strong>{vigentesHoy.filter((licencia) => licencia.tipo === 'VACACIONES').length}</strong>
        </div>
        <div>
          <span>Con permiso o reposo hoy</span>
          <strong>{vigentesHoy.filter((licencia) => licencia.tipo !== 'VACACIONES').length}</strong>
        </div>
        <div>
          <span>Vacaciones programadas</span>
          <strong>{licencias.filter((licencia) => licencia.tipo === 'VACACIONES' && licencia.desde > actual).length}</strong>
        </div>
        <div className="total">
          <span>Días de vacaciones pendientes</span>
          <strong>{saldos.reduce((suma, saldo) => suma + Math.max(0, saldo.saldo), 0)}</strong>
        </div>
      </div>

      <h3 className="bloque">Saldo de vacaciones</h3>
      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Ingreso</th>
              <th className="centro">Antigüedad</th>
              <th className="numero">Días por año</th>
              <th className="numero">Corresponden</th>
              <th className="numero">Tomadas</th>
              <th className="numero">Saldo</th>
              <th>Próximo aniversario</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {saldosVisibles.map((saldo) => (
              <tr key={saldo.empleadoId}>
                <td>
                  {saldo.empleado}
                  <small className="sub">{saldo.cargo}</small>
                </td>
                <td>{fecha(saldo.fechaIngreso)}</td>
                <td className="centro">{antiguedad(saldo.antiguedad)}</td>
                <td className="numero">{saldo.antiguedad === 0 ? '—' : saldo.diasPorAnio}</td>
                <td className="numero" title={`Años de servicio cumplidos desde el ${fecha(saldo.cuentaDesde)}`}>
                  {saldo.corresponden}
                </td>
                <td className="numero">
                  {saldo.tomadas}
                  {saldo.programadas > 0 ? <small className="sub">{saldo.programadas} programadas</small> : null}
                </td>
                <td className="numero">
                  <strong className={saldo.saldo < 0 ? 'falta' : undefined}>{saldo.saldo}</strong>
                </td>
                <td>
                  {fecha(saldo.proximoAniversario)}
                  <small className="sub">suma {saldo.diasProximoAniversario} días</small>
                </td>
                <td className="acciones">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setEditando({ licencia: null, empleadoId: saldo.empleadoId, tipo: 'VACACIONES' })}
                  >
                    Dar vacaciones
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listo && saldos.length === 0 ? <p className="vacio">No hay empleados activos.</p> : null}
      <p className="ayuda">
        Según el Código del Trabajo (art. 218): 12 días hábiles por año hasta 5 años de antigüedad, 18 días de 5 a 10 años y 30
        días después de 10 años. Se cuentan los dos últimos años de servicio cumplidos, que es lo que se puede acumular. Para
        empezar con el saldo real, registrá las vacaciones que ya tomaron en ese período.
      </p>

      <h3 className="bloque">Licencias registradas</h3>
      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Empleado</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th className="numero">Días hábiles</th>
              <th>Sueldo</th>
              <th>Motivo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((licencia) => (
              <tr key={licencia.id}>
                <td>
                  <span className={TIPOS_LICENCIA[licencia.tipo].clase}>{TIPOS_LICENCIA[licencia.tipo].etiqueta}</span>
                </td>
                <td>
                  {licencia.empleado}
                  <small className="sub">{licencia.cargo}</small>
                </td>
                <td>{fecha(licencia.desde)}</td>
                <td>{fecha(licencia.hasta)}</td>
                <td className="numero">{licencia.dias}</td>
                <td>{licencia.conGoce ? 'Con goce' : <span className="estado alerta">Se descuenta</span>}</td>
                <td>{licencia.motivo ?? '—'}</td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setEditando({ licencia })}>
                    Editar
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void eliminar(licencia)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && licencias.length === 0 ? <p className="vacio">Todavía no hay vacaciones, permisos ni reposos registrados.</p> : null}
      {listo && licencias.length > 0 && filtradas.length === 0 ? <p className="vacio">Ninguna coincide con el filtro.</p> : null}

      {editando ? (
        <FichaLicencia
          edicion={editando}
          empleados={empleados}
          saldos={saldos}
          jornadas={jornadas}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

function FichaLicencia({
  edicion,
  empleados,
  saldos,
  jornadas,
  onCerrar,
  onGuardado,
}: {
  edicion: Edicion
  empleados: Empleado[]
  saldos: SaldoVacaciones[]
  jornadas: Jornada[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const { licencia } = edicion
  const [empleadoId, setEmpleadoId] = useState(String(licencia?.empleadoId ?? edicion.empleadoId ?? ''))
  const [tipo, setTipo] = useState<TipoLicencia>(licencia?.tipo ?? edicion.tipo ?? 'VACACIONES')
  const [desde, setDesde] = useState(licencia?.desde ?? hoy())
  const [hasta, setHasta] = useState(licencia?.hasta ?? hoy())
  const [conGoce, setConGoce] = useState(licencia?.conGoce ?? true)
  const [motivo, setMotivo] = useState(licencia?.motivo ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const activos = empleados.filter(
    (empleado) => !empleado.fechaEgreso || empleado.fechaEgreso >= hoy() || empleado.id === licencia?.empleadoId,
  )
  const dias = desde && hasta && hasta >= desde ? diasHabiles(desde, hasta, jornadas) : 0
  const saldo = saldos.find((item) => String(item.empleadoId) === empleadoId)
  const disponible = saldo ? saldo.saldo + (licencia?.tipo === 'VACACIONES' ? licencia.dias : 0) : null

  function elegirTipo(nuevo: TipoLicencia) {
    setTipo(nuevo)
    if (!licencia) {
      setConGoce(true)
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!empleadoId) {
      setError('Elegí el empleado')
      return
    }
    if (hasta < desde) {
      setError('La fecha final no puede ser anterior a la inicial')
      return
    }
    if (tipo === 'VACACIONES' && disponible != null && dias > disponible) {
      const seguir = await confirmar({
        titulo: 'Vacaciones sin saldo suficiente',
        mensaje: `Le quedan ${disponible} días de vacaciones y estás cargando ${dias}. ¿Registrarlas igual como vacaciones adelantadas?`,
        aceptar: 'Registrar igual',
      })
      if (!seguir) {
        return
      }
    }
    const cuerpo = {
      empleadoId: Number(empleadoId),
      tipo,
      desde,
      hasta,
      conGoce: tipo === 'VACACIONES' ? true : conGoce,
      motivo: motivo.trim() || null,
    }
    setGuardando(true)
    try {
      if (licencia) {
        await apiActualizar<Licencia>(`/rrhh/licencias/${licencia.id}`, cuerpo)
      } else {
        await apiCrear<Licencia>('/rrhh/licencias', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={licencia ? 'Editar licencia' : 'Registrar vacaciones o permiso'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="opciones-estado" role="radiogroup" aria-label="Tipo de licencia">
          {(Object.keys(TIPOS_LICENCIA) as TipoLicencia[]).map((valor) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={tipo === valor}
              className={tipo === valor ? 'btn primary' : 'btn'}
              onClick={() => elegirTipo(valor)}
            >
              {TIPOS_LICENCIA[valor].etiqueta}
            </button>
          ))}
        </div>
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Empleado">
              <select value={empleadoId} onChange={(event) => setEmpleadoId(event.target.value)} disabled={licencia != null} required>
                <option value="">Elegí el empleado</option>
                {activos.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.apellidos}, {empleado.nombres}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Desde">
            <input
              type="date"
              required
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value)
                if (hasta < event.target.value) {
                  setHasta(event.target.value)
                }
              }}
            />
          </Campo>
          <Campo etiqueta="Hasta (inclusive)">
            <input type="date" required min={desde} value={hasta} onChange={(event) => setHasta(event.target.value)} />
          </Campo>
          {tipo !== 'VACACIONES' ? (
            <div className="span">
              <label className="check">
                <input type="checkbox" checked={conGoce} onChange={(event) => setConGoce(event.target.checked)} />
                Con goce de sueldo (no se descuenta)
              </label>
            </div>
          ) : null}
          <div className="span">
            <Campo etiqueta="Motivo">
              <input
                maxLength={200}
                value={motivo}
                placeholder={tipo === 'REPOSO' ? 'N° de certificado médico, diagnóstico…' : tipo === 'PERMISO' ? 'Trámite, duelo, examen…' : 'Período, observaciones…'}
                onChange={(event) => setMotivo(event.target.value)}
              />
            </Campo>
          </div>
        </div>
        <p className="ayuda">
          <strong>{dias}</strong> {dias === 1 ? 'día hábil' : 'días hábiles'} (según la semana laboral de RR.HH. › Configuración; los
          feriados hay que dejarlos fuera de las fechas).
          {tipo === 'VACACIONES' && disponible != null ? (
            <>
              {' '}
              Le {disponible === 1 ? 'queda' : 'quedan'} {disponible} {disponible === 1 ? 'día' : 'días'}; después de estas vacaciones:{' '}
              <strong className={disponible - dias < 0 ? 'falta' : undefined}>{disponible - dias}</strong>.
            </>
          ) : null}
          {tipo !== 'VACACIONES' && !conGoce ? ' Cada día se descuenta del sueldo en la liquidación.' : ''}
        </p>
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

function antiguedad(anios: number): string {
  if (anios === 0) {
    return 'Menos de 1 año'
  }
  return anios === 1 ? '1 año' : `${anios} años`
}

function diasHabiles(desde: string, hasta: string, jornadas: Jornada[]): number {
  const [anio, mes, dia] = desde.split('-').map(Number)
  const fin = hasta
  let cantidad = 0
  for (let cursor = new Date(anio, mes - 1, dia); ; cursor.setDate(cursor.getDate() + 1)) {
    const texto = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    if (texto > fin) {
      return cantidad
    }
    if (jornadas[(cursor.getDay() + 6) % 7] !== 'NO_LABORAL') {
      cantidad++
    }
  }
}
