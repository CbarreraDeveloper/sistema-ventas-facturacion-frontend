import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiEliminar, apiEnviar, apiListar, fecha, hoy } from '../api/client'
import type { Asistencia, ConfiguracionRrhh, Empleado, EstadoAsistencia, Jornada } from '../api/types'
import { Aviso, Barra, Campo, Dialogo } from '../components/ui'

const ESTADOS: Record<EstadoAsistencia, { etiqueta: string; corto: string }> = {
  PRESENTE: { etiqueta: 'Presente', corto: 'P' },
  AUSENTE: { etiqueta: 'Ausente', corto: 'A' },
  MEDIO_DIA: { etiqueta: 'Medio día', corto: '½' },
  PERMISO: { etiqueta: 'Permiso', corto: 'Per' },
  REPOSO: { etiqueta: 'Reposo', corto: 'Rep' },
  VACACIONES: { etiqueta: 'Vacaciones', corto: 'Vac' },
}

const ELEGIBLES: EstadoAsistencia[] = ['PRESENTE', 'AUSENTE', 'MEDIO_DIA', 'PERMISO', 'REPOSO']

const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const SEMANA_POR_DEFECTO: Jornada[] = ['COMPLETA', 'COMPLETA', 'COMPLETA', 'COMPLETA', 'COMPLETA', 'MEDIA', 'NO_LABORAL']

type Celda = { empleado: Empleado; dia: string; registro: Asistencia | null }

export function AsistenciaPage() {
  const [lunes, setLunes] = useState(() => lunesDe(hoy()))
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [registros, setRegistros] = useState<Asistencia[]>([])
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<Celda | null>(null)

  const [jornadas, setJornadas] = useState<Jornada[]>(SEMANA_POR_DEFECTO)

  const indices = jornadas.flatMap((jornada, indice) => (jornada === 'NO_LABORAL' ? [] : [indice]))
  const dias = indices.map((indice) => sumarDias(lunes, indice))
  const sabado = dias[dias.length - 1] ?? sumarDias(lunes, 6)

  const cargar = useCallback(async () => {
    try {
      const [lista, semana, configuracion] = await Promise.all([
        apiListar<Empleado[]>('/rrhh/empleados'),
        apiListar<Asistencia[]>(`/rrhh/asistencia?desde=${lunes}&hasta=${sumarDias(lunes, 6)}`),
        apiListar<ConfiguracionRrhh>('/rrhh/configuracion'),
      ])
      setEmpleados(lista)
      setRegistros(semana)
      setJornadas(configuracion.jornadas)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer la asistencia')
    } finally {
      setListo(true)
    }
  }, [lunes])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const vigentes = empleados.filter(
    (empleado) => empleado.fechaIngreso <= sabado && (!empleado.fechaEgreso || empleado.fechaEgreso >= lunes),
  )
  const visibles = filtro ? vigentes.filter((empleado) => String(empleado.id) === filtro) : vigentes
  const delEmpleado = (empleadoId: number) => registros.filter((registro) => registro.empleadoId === empleadoId)
  const registroDe = (empleadoId: number, dia: string) =>
    registros.find((registro) => registro.empleadoId === empleadoId && registro.fecha === dia) ?? null
  const deVisibles = registros.filter((registro) => visibles.some((empleado) => empleado.id === registro.empleadoId))
  const ausencias = deVisibles.filter((registro) => registro.estado !== 'PRESENTE').length
  const descontar = deVisibles.reduce((suma, registro) => suma + registro.diasADescontar, 0)
  const horasExtra = deVisibles.reduce((suma, registro) => suma + registro.horasExtra, 0)
  const actual = hoy()

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Asistencia"
        detalle="Días laborales según RR.HH. › Configuración; una falta en un día de media jornada descuenta el jornal completo. Los días sin marcar cuentan como presentes: cargá solo las ausencias, permisos y horas extra. Las vacaciones y licencias de varios días se cargan en Vacaciones y permisos."
      >
        <label className="campo">
          <span>Empleado</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value)}>
            <option value="">Todos</option>
            {vigentes.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {empleado.apellidos}, {empleado.nombres}
              </option>
            ))}
          </select>
        </label>
        <div className="semana-nav">
          <button type="button" className="btn ghost" onClick={() => setLunes(sumarDias(lunes, -7))}>
            ‹ Anterior
          </button>
          <button type="button" className="btn ghost" onClick={() => setLunes(lunesDe(hoy()))} disabled={lunes === lunesDe(actual)}>
            Esta semana
          </button>
          <button type="button" className="btn ghost" onClick={() => setLunes(sumarDias(lunes, 7))}>
            Siguiente ›
          </button>
        </div>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Semana</span>
          <strong>
            {fecha(lunes)} al {fecha(sabado)}
          </strong>
        </div>
        <div>
          <span>Ausencias y permisos</span>
          <strong>{ausencias}</strong>
        </div>
        <div>
          <span>Horas extra</span>
          <strong>{numero(horasExtra)}</strong>
        </div>
        <div className="total">
          <span>Días a descontar</span>
          <strong>{numero(descontar)}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha asistencia">
          <thead>
            <tr>
              <th>Empleado</th>
              {dias.map((dia, indice) => (
                <th key={dia} className={dia === actual ? 'centro hoy' : 'centro'}>
                  {NOMBRES_DIA[indices[indice]]} {dia.slice(8, 10)}/{dia.slice(5, 7)}
                  {jornadas[indices[indice]] === 'MEDIA' ? ' ½' : null}
                </th>
              ))}
              <th className="numero">Hs. extra</th>
              <th className="numero">Descontar</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((empleado) => {
              const propios = delEmpleado(empleado.id)
              return (
                <tr key={empleado.id}>
                  <td>
                    {empleado.apellidos}, {empleado.nombres}
                    <small className="sub">{empleado.cargo}</small>
                  </td>
                  {dias.map((dia) => {
                    const registro = registroDe(empleado.id, dia)
                    const fuera = dia < empleado.fechaIngreso || (empleado.fechaEgreso != null && dia > empleado.fechaEgreso)
                    return (
                      <td key={dia} className={dia === actual ? 'centro hoy' : 'centro'}>
                        {fuera ? (
                          <span className="dia-asistencia fuera" title="Fuera del período de trabajo">
                            —
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={claseCelda(registro)}
                            title={tituloCelda(registro)}
                            onClick={() => setEditando({ empleado, dia, registro })}
                          >
                            {registro ? ESTADOS[registro.estado].corto : '·'}
                            {registro && registro.horasExtra > 0 ? <small>+{numero(registro.horasExtra)}h</small> : null}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="numero">{numero(propios.reduce((suma, registro) => suma + registro.horasExtra, 0))}</td>
                  <td className="numero">
                    <strong>{numero(propios.reduce((suma, registro) => suma + registro.diasADescontar, 0))}</strong>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {listo && vigentes.length === 0 ? <p className="vacio">No hay empleados activos en esta semana.</p> : null}
      <p className="ayuda leyenda">
        <span className="dia-asistencia">·</span> sin marcar (presente) <span className="dia-asistencia presente">P</span> presente con
        horas extra <span className="dia-asistencia ausente">A</span> descuenta{' '}
        <span className="dia-asistencia justificada">A</span> justificado, no descuenta{' '}
        <span className="dia-asistencia vacaciones">Vac</span> vacaciones
      </p>

      {editando ? (
        <DiaAsistencia
          celda={editando}
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

function DiaAsistencia({ celda, onCerrar, onGuardado }: { celda: Celda; onCerrar: () => void; onGuardado: () => void }) {
  const { empleado, dia, registro } = celda
  const [estado, setEstado] = useState<EstadoAsistencia>(registro?.estado ?? 'AUSENTE')
  const [justificada, setJustificada] = useState(registro?.justificada ?? false)
  const [horas, setHoras] = useState(registro && registro.horasExtra > 0 ? String(registro.horasExtra) : '')
  const [observacion, setObservacion] = useState(registro?.observacion ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const trabaja = estado === 'PRESENTE' || estado === 'MEDIO_DIA'

  function elegir(nuevo: EstadoAsistencia) {
    setEstado(nuevo)
    if (!registro) {
      setJustificada(nuevo === 'PERMISO' || nuevo === 'REPOSO')
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)
    try {
      await apiEnviar<Asistencia>('/rrhh/asistencia', {
        method: 'PUT',
        body: JSON.stringify({
          empleadoId: empleado.id,
          fecha: dia,
          estado,
          justificada: estado !== 'PRESENTE' && justificada,
          horasExtra: trabaja && horas ? Number(horas.replace(',', '.')) : 0,
          observacion: observacion.trim() || null,
        }),
      })
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el día')
      setGuardando(false)
    }
  }

  async function quitar() {
    if (!registro) {
      return
    }
    setGuardando(true)
    try {
      await apiEliminar(`/rrhh/asistencia/${registro.id}`)
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo quitar la marca')
      setGuardando(false)
    }
  }

  if (registro?.licenciaId != null) {
    return (
      <Dialogo clase="angosto" titulo={`${empleado.apellidos}, ${empleado.nombres}`} onCerrar={onCerrar}>
        <p className="ayuda">{diaLargo(dia)}</p>
        <p>
          <strong>{ESTADOS[registro.estado].etiqueta}</strong>
          {registro.justificada ? ', no se descuenta del sueldo.' : ', se descuenta del sueldo.'}
          {registro.observacion ? ` ${registro.observacion}.` : ''}
        </p>
        <p className="ayuda">Este día es parte de una licencia de varios días. Para cambiarla o quitarla, usá Vacaciones y permisos.</p>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cerrar
          </button>
          <a className="btn primary" href="#/rrhh/licencias">
            Ir a Vacaciones y permisos
          </a>
        </div>
      </Dialogo>
    )
  }

  return (
    <Dialogo clase="angosto" titulo={`${empleado.apellidos}, ${empleado.nombres}`} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <p className="ayuda">{diaLargo(dia)}</p>
        <div className="opciones-estado" role="radiogroup" aria-label="Estado del día">
          {ELEGIBLES.map((valor) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={estado === valor}
              className={estado === valor ? 'btn primary' : 'btn'}
              onClick={() => elegir(valor)}
            >
              {ESTADOS[valor].etiqueta}
            </button>
          ))}
        </div>
        {estado !== 'PRESENTE' ? (
          <label className="check">
            <input type="checkbox" checked={justificada} onChange={(event) => setJustificada(event.target.checked)} />
            Justificada (no se descuenta del sueldo)
          </label>
        ) : null}
        {trabaja ? (
          <Campo etiqueta="Horas extra">
            <input
              inputMode="decimal"
              value={horas}
              placeholder="0"
              onChange={(event) => setHoras(event.target.value.replace(/[^\d.,]/g, ''))}
            />
          </Campo>
        ) : null}
        <Campo etiqueta="Observación">
          <input
            maxLength={200}
            value={observacion}
            placeholder={estado === 'REPOSO' ? 'N° de certificado médico, motivo…' : 'Motivo, aviso previo…'}
            onChange={(event) => setObservacion(event.target.value)}
          />
        </Campo>
        <p className="ayuda">{resumen(estado, justificada)}</p>
        <div className="dialogo-acciones">
          {registro ? (
            <button className="btn peligro" type="button" disabled={guardando} onClick={() => void quitar()}>
              Quitar marca
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

function resumen(estado: EstadoAsistencia, justificada: boolean): string {
  if (estado === 'PRESENTE') {
    return 'Día trabajado. Usalo para cargar horas extra.'
  }
  if (justificada) {
    return 'No se descuenta del sueldo.'
  }
  return estado === 'MEDIO_DIA' ? 'Se descuenta medio día del sueldo.' : 'Se descuenta el día completo del sueldo.'
}

function claseCelda(registro: Asistencia | null): string {
  if (!registro) {
    return 'dia-asistencia'
  }
  if (registro.estado === 'PRESENTE') {
    return 'dia-asistencia presente'
  }
  if (registro.estado === 'VACACIONES') {
    return 'dia-asistencia vacaciones'
  }
  return registro.justificada ? 'dia-asistencia justificada' : 'dia-asistencia ausente'
}

function tituloCelda(registro: Asistencia | null): string {
  if (!registro) {
    return 'Sin marcar: cuenta como presente'
  }
  const partes = [ESTADOS[registro.estado].etiqueta]
  if (registro.estado !== 'PRESENTE') {
    partes.push(registro.justificada ? 'justificada' : 'sin justificar')
  }
  if (registro.horasExtra > 0) {
    partes.push(`${numero(registro.horasExtra)} h extra`)
  }
  if (registro.observacion) {
    partes.push(registro.observacion)
  }
  return partes.join(' · ')
}

function numero(valor: number): string {
  return valor.toLocaleString('es-PY', { maximumFractionDigits: 2 })
}

function diaLargo(dia: string): string {
  const [anio, mes, numeroDia] = dia.split('-').map(Number)
  const texto = new Date(anio, mes - 1, numeroDia).toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function lunesDe(dia: string): string {
  const [anio, mes, numeroDia] = dia.split('-').map(Number)
  const semana = new Date(anio, mes - 1, numeroDia).getDay()
  return sumarDias(dia, semana === 0 ? -6 : 1 - semana)
}

function sumarDias(dia: string, dias: number): string {
  const [anio, mes, numeroDia] = dia.split('-').map(Number)
  const resultado = new Date(anio, mes - 1, numeroDia + dias)
  const dos = (valor: number) => String(valor).padStart(2, '0')
  return `${resultado.getFullYear()}-${dos(resultado.getMonth() + 1)}-${dos(resultado.getDate())}`
}
