import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiDescargar, apiListar, dinero, fecha, hoy } from '../api/client'
import type { Cargo, CategoriaMtess, DatosMtess, PlanillaMtess } from '../api/types'
import { Aviso, Barra, Campo } from '../components/ui'

const CATEGORIAS: Record<CategoriaMtess, string> = {
  JEFE: 'Supervisor o jefe',
  EMPLEADO: 'Empleado',
  OBRERO: 'Obrero',
}

const PLANILLAS = [
  { clave: 'EMPLEADOS', etiqueta: 'Empleados y obreros', archivo: 'empleados-y-obreros' },
  { clave: 'SUELDOS', etiqueta: 'Sueldos y jornales', archivo: 'sueldos-y-jornales' },
  { clave: 'RESUMEN', etiqueta: 'Resumen general', archivo: 'resumen-general' },
] as const

const cantidad = (valor: number) => valor.toLocaleString('es-PY')

export function PlanillaMtessPage() {
  const anioActual = Number(hoy().slice(0, 4))
  const [anio, setAnio] = useState(anioActual - 1)
  const [planilla, setPlanilla] = useState<PlanillaMtess | null>(null)
  const [datos, setDatos] = useState<DatosMtess | null>(null)
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [descargando, setDescargando] = useState<string | null>(null)

  async function cargarPlanilla(elegido = anio) {
    try {
      setPlanilla(await apiListar<PlanillaMtess>(`/rrhh/mtess?anio=${elegido}`))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo armar la planilla')
    }
  }

  useEffect(() => {
    void cargarPlanilla(anio)
  }, [anio])

  useEffect(() => {
    void (async () => {
      try {
        const [leidos, lista] = await Promise.all([
          apiListar<DatosMtess>('/rrhh/mtess/datos'),
          apiListar<Cargo[]>('/rrhh/cargos'),
        ])
        setDatos(leidos)
        setCargos(lista)
      } catch (causa) {
        setError(causa instanceof Error ? causa.message : 'No se pudieron leer los datos del MTESS')
      }
    })()
  }, [])

  async function guardarDatos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setGuardando(true)
    try {
      setDatos(
        await apiActualizar<DatosMtess>('/rrhh/mtess/datos', {
          numeroPatronal: String(form.get('numeroPatronal') ?? '').trim() || null,
          horarioTrabajo: String(form.get('horarioTrabajo') ?? '').trim() || null,
        }),
      )
      setOk('Datos guardados')
      await cargarPlanilla()
    } catch (causa) {
      setOk(null)
      setError(causa instanceof Error ? causa.message : 'No se pudieron guardar los datos')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarCategoria(cargo: Cargo, categoriaMtess: CategoriaMtess) {
    try {
      const actualizado = await apiActualizar<Cargo>(`/rrhh/cargos/${cargo.id}`, { nombre: cargo.nombre, categoriaMtess })
      setCargos((lista) => lista.map((item) => (item.id === actualizado.id ? actualizado : item)))
      await cargarPlanilla()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cambiar la categoría')
    }
  }

  async function descargar(clave: string, archivo: string) {
    setDescargando(clave)
    try {
      await apiDescargar(`/rrhh/mtess/excel?anio=${anio}&planilla=${clave}`, `${archivo}-${anio}.xlsx`)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el Excel')
    } finally {
      setDescargando(null)
    }
  }

  const empleados = planilla?.empleados ?? []
  const enUso = cargos.filter((cargo) => cargo.empleados > 0 || cargo.activo)

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Planillas del MTESS"
        detalle="Empleados y obreros, sueldos y jornales y resumen general del año, en el formato de carga del sistema REOP."
      >
        <label className="campo">
          <span>Año</span>
          <select value={anio} onChange={(event) => setAnio(Number(event.target.value))}>
            {[0, 1, 2, 3, 4].map((atras) => (
              <option key={atras} value={anioActual - atras}>
                {anioActual - atras}
              </option>
            ))}
          </select>
        </label>
      </Barra>
      <Aviso mensaje={error} />
      {planilla && planilla.avisos.length > 0 ? (
        <div className="aviso advertencia">
          <ul>
            {planilla.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="acciones">
        {PLANILLAS.map((item) => (
          <button
            key={item.clave}
            type="button"
            className="btn primary"
            disabled={descargando !== null || !planilla?.numeroPatronal}
            onClick={() => void descargar(item.clave, item.archivo)}
          >
            {descargando === item.clave ? 'Generando…' : `Excel ${item.etiqueta.toLowerCase()}`}
          </button>
        ))}
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Categoría</th>
              <th>Entrada / salida</th>
              <th className="numero">Jornal</th>
              <th className="numero">Horas</th>
              <th className="numero">Sueldos</th>
              <th className="numero">Horas extra</th>
              <th className="numero">Aguinaldo</th>
              <th className="numero">Beneficios</th>
              <th className="numero">Vacaciones</th>
              <th className="numero">Total</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((fila) => (
              <tr key={fila.empleadoId}>
                <td>
                  {fila.empleado}
                  <small className="sub">
                    CI {fila.documento} · {fila.cargo}
                  </small>
                </td>
                <td>
                  {CATEGORIAS[fila.categoria]}
                  {fila.menor ? <small className="sub">Menor de edad</small> : null}
                </td>
                <td>
                  {fecha(fila.fechaEntrada)}
                  {fila.fechaSalida ? <small className="sub">salió el {fecha(fila.fechaSalida)}</small> : null}
                </td>
                <td className="numero">{dinero(fila.importeUnitario)}</td>
                <td className="numero">{cantidad(fila.horas)}</td>
                <td className="numero">{dinero(fila.salarios)}</td>
                <td className="numero">
                  {fila.horasExtra > 0 ? dinero(fila.extras) : '—'}
                  {fila.horasExtra > 0 ? <small className="sub">{cantidad(fila.horasExtra)} h</small> : null}
                </td>
                <td className="numero">{dinero(fila.aguinaldo)}</td>
                <td className="numero">{dinero(fila.beneficios)}</td>
                <td className="numero">{dinero(fila.vacaciones)}</td>
                <td className="numero">
                  <strong>{dinero(fila.totalGeneral)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {planilla && empleados.length === 0 ? <p className="vacio">No hubo empleados en {anio}.</p> : null}

      {planilla ? (
        <>
          <h3>Resumen general</h3>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th rowSpan={2}>Concepto</th>
                  <th colSpan={2}>Supervisores o jefes</th>
                  <th colSpan={2}>Empleados</th>
                  <th colSpan={2}>Obreros</th>
                  <th colSpan={2}>Menores</th>
                </tr>
                <tr>
                  {[0, 1, 2, 3].flatMap((grupo) => [
                    <th key={`${grupo}v`} className="numero">
                      Varones
                    </th>,
                    <th key={`${grupo}m`} className="numero">
                      Mujeres
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {planilla.resumen.map((fila) => {
                  const valor = fila.orden === 3 ? dinero : cantidad
                  return (
                    <tr key={fila.orden}>
                      <td>{fila.concepto}</td>
                      <td className="numero">{valor(fila.supJefesVarones)}</td>
                      <td className="numero">{valor(fila.supJefesMujeres)}</td>
                      <td className="numero">{valor(fila.empleadosVarones)}</td>
                      <td className="numero">{valor(fila.empleadosMujeres)}</td>
                      <td className="numero">{valor(fila.obrerosVarones)}</td>
                      <td className="numero">{valor(fila.obrerosMujeres)}</td>
                      <td className="numero">{valor(fila.menoresVarones)}</td>
                      <td className="numero">{valor(fila.menoresMujeres)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="paneles">
        <form className="panel-inicio" onSubmit={(event) => void guardarDatos(event)} key={datos ? 'con-datos' : 'sin-datos'}>
          <h3>Datos de la empresa para el MTESS</h3>
          {ok ? <p className="ayuda">{ok}</p> : null}
          <Campo etiqueta="Número patronal del MTESS (no el del IPS)">
            <input
              name="numeroPatronal"
              inputMode="numeric"
              pattern="\d*"
              maxLength={20}
              defaultValue={datos?.numeroPatronal ?? ''}
            />
          </Campo>
          <Campo etiqueta="Horario de trabajo">
            <input name="horarioTrabajo" maxLength={20} placeholder="07:00 A 17:00" defaultValue={datos?.horarioTrabajo ?? ''} />
          </Campo>
          <button type="submit" className="btn primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>

        <div className="panel-inicio panel-lista">
          <h3>Categoría de cada cargo</h3>
          <table className="tabla">
            <tbody>
              {enUso.map((cargo) => (
                <tr key={cargo.id}>
                  <td>
                    {cargo.nombre}
                    <small className="sub">
                      {cargo.empleados} {cargo.empleados === 1 ? 'empleado' : 'empleados'}
                    </small>
                  </td>
                  <td>
                    <select
                      value={cargo.categoriaMtess}
                      onChange={(event) => void cambiarCategoria(cargo, event.target.value as CategoriaMtess)}
                    >
                      {Object.entries(CATEGORIAS).map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="ayuda">
        Los sueldos salen de las liquidaciones confirmadas (cada una cuenta en el mes en que termina): sueldo y comisiones menos
        ausencias. Las horas salen de la semana laboral de RR.HH. › Configuración (horas por jornada, media jornada a la mitad), menos ausencias, permisos, reposos y vacaciones. Aguinaldo,
        preaviso, indemnización y vacaciones salen de lo pagado en el año. Los menores de 18 se cuentan solo en las columnas de
        menores. Los Excel tienen los encabezados exactos del REOP, sin separadores de miles: verificá la estructura vigente en
        el sitio del MTESS antes de subirlos.
      </p>
    </section>
  )
}
