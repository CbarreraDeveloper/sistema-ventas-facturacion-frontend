import { useEffect, useState } from 'react'
import { apiListar, dinero, fecha, hoy } from '../api/client'
import type {
  Adelanto,
  Asistencia,
  Comision,
  Empleado,
  EstadoAsistencia,
  LiquidacionResumen,
  ModalidadPago,
  ServicioCasual,
  Viatico,
} from '../api/types'
import { Aviso, Barra } from '../components/ui'

const PERIODOS_POR_MES: Record<ModalidadPago, number> = {
  SEMANAL: 52 / 12,
  QUINCENAL: 2,
  MENSUAL: 1,
}

const MODALIDADES: Record<ModalidadPago, string> = {
  SEMANAL: 'semanal',
  QUINCENAL: 'quincenal',
  MENSUAL: 'mensual',
}

const NOVEDADES: Partial<Record<EstadoAsistencia, string>> = {
  AUSENTE: 'Ausente',
  MEDIO_DIA: 'Medio día',
  PERMISO: 'Permiso',
  REPOSO: 'Reposo',
  VACACIONES: 'Vacaciones',
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const PROXIMOS_DIAS = 30

type Datos = {
  empleados: Empleado[]
  asistencias: Asistencia[]
  adelantos: Adelanto[]
  viaticos: Viatico[]
  comisiones: Comision[]
  liquidaciones: LiquidacionResumen[]
  casuales: ServicioCasual[]
}

type Pendiente = { clave: string; texto: string; detalle?: string; ruta: string }

type Fecha = { empleado: Empleado; dia: string; faltan: number; tipo: 'cumple' | 'aniversario'; anios: number }

function iso(valor: Date): string {
  return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`
}

function desdeIso(valor: string): Date {
  const [anio, mes, dia] = valor.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

function lunesDe(valor: string): string {
  const dia = desdeIso(valor)
  dia.setDate(dia.getDate() - ((dia.getDay() + 6) % 7))
  return iso(dia)
}

function sumarDias(valor: string, dias: number): string {
  const dia = desdeIso(valor)
  dia.setDate(dia.getDate() + dias)
  return iso(dia)
}

function nombre(empleado: Empleado): string {
  return `${empleado.apellidos}, ${empleado.nombres}`
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`
}

/** Próxima vez que se cumple el día y mes de la fecha, dentro de los próximos días. */
function proximaFecha(origen: string, hoyIso: string): { dia: string; faltan: number; anios: number } | null {
  const base = desdeIso(hoyIso)
  const [anioOrigen, mes, dia] = origen.split('-').map(Number)
  for (const anio of [base.getFullYear(), base.getFullYear() + 1]) {
    const candidata = new Date(anio, mes - 1, dia)
    const faltan = Math.round((candidata.getTime() - base.getTime()) / 86_400_000)
    if (faltan >= 0 && faltan <= PROXIMOS_DIAS) {
      return { dia: iso(candidata), faltan, anios: anio - anioOrigen }
    }
  }
  return null
}

export function RrhhInicioPage() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hoyIso = hoy()
  const lunes = lunesDe(hoyIso)
  const sabado = sumarDias(lunes, 5)

  useEffect(() => {
    Promise.all([
      apiListar<Empleado[]>('/rrhh/empleados'),
      apiListar<Asistencia[]>(`/rrhh/asistencia?desde=${lunes}&hasta=${sabado}`),
      apiListar<Adelanto[]>('/rrhh/adelantos'),
      apiListar<Viatico[]>('/rrhh/viaticos'),
      apiListar<Comision[]>('/rrhh/comisiones'),
      apiListar<LiquidacionResumen[]>('/rrhh/liquidaciones'),
      apiListar<ServicioCasual[]>('/rrhh/casuales/servicios'),
    ])
      .then(([empleados, asistencias, adelantos, viaticos, comisiones, liquidaciones, casuales]) =>
        setDatos({ empleados, asistencias, adelantos, viaticos, comisiones, liquidaciones, casuales }),
      )
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo leer el resumen de RR.HH'))
  }, [lunes, sabado])

  const activos = (datos?.empleados ?? []).filter((empleado) => empleado.activo)
  const porId = new Map((datos?.empleados ?? []).map((empleado) => [empleado.id, empleado]))
  const esDomingo = desdeIso(hoyIso).getDay() === 0
  const deHoy = (datos?.asistencias ?? []).filter((asistencia) => asistencia.fecha === hoyIso)
  const presentesHoy = deHoy.filter((asistencia) => asistencia.estado === 'PRESENTE').length
  const sinMarcarHoy = activos.filter(
    (empleado) => empleado.fechaIngreso <= hoyIso && !deHoy.some((asistencia) => asistencia.empleadoId === empleado.id),
  ).length
  const costoMensual = activos.reduce((suma, empleado) => suma + empleado.sueldoBase * PERIODOS_POR_MES[empleado.modalidadPago], 0)
  const saldoAdelantos = (datos?.adelantos ?? []).reduce((suma, adelanto) => suma + adelanto.saldo, 0)
  const conSaldo = (datos?.adelantos ?? []).filter((adelanto) => adelanto.saldo > 0).length

  const pendientes: Pendiente[] = []
  if (datos) {
    for (const liquidacion of datos.liquidaciones) {
      const periodo = `${MODALIDADES[liquidacion.modalidad]} del ${fecha(liquidacion.desde)} al ${fecha(liquidacion.hasta)}`
      if (liquidacion.estado === 'BORRADOR') {
        pendientes.push({
          clave: `borrador-${liquidacion.id}`,
          texto: `Liquidación ${periodo} en borrador`,
          detalle: `Revisala y confirmala · neto ${dinero(liquidacion.totalNeto)} Gs.`,
          ruta: '#/rrhh/liquidaciones',
        })
      } else if (liquidacion.estado === 'CONFIRMADA' && liquidacion.pagados < liquidacion.empleados) {
        pendientes.push({
          clave: `pago-${liquidacion.id}`,
          texto: `${plural(liquidacion.empleados - liquidacion.pagados, 'recibo sin pagar', 'recibos sin pagar')}`,
          detalle: `Liquidación ${periodo}`,
          ruta: '#/rrhh/liquidaciones',
        })
      }
    }
    if (!esDomingo && sinMarcarHoy > 0) {
      pendientes.push({
        clave: 'asistencia',
        texto: `Falta cargar la asistencia de hoy de ${plural(sinMarcarHoy, 'empleado', 'empleados')}`,
        ruta: '#/rrhh/asistencia',
      })
    }
    const aparte = datos.viaticos.filter((viatico) => !viatico.fechaPago && viatico.formaPago === 'APARTE')
    if (aparte.length > 0) {
      pendientes.push({
        clave: 'viaticos',
        texto: `${plural(aparte.length, 'viático por pagar', 'viáticos por pagar')} aparte`,
        detalle: `${dinero(aparte.reduce((suma, viatico) => suma + viatico.monto, 0))} Gs.`,
        ruta: '#/rrhh/viaticos',
      })
    }
    const comisiones = datos.comisiones.filter((comision) => comision.estado === 'PENDIENTE' && comision.total > 0)
    if (comisiones.length > 0) {
      pendientes.push({
        clave: 'comisiones',
        texto: `${plural(comisiones.length, 'comisión', 'comisiones')} para la próxima liquidación`,
        detalle: `${dinero(comisiones.reduce((suma, comision) => suma + comision.total, 0))} Gs.`,
        ruta: '#/rrhh/comisiones',
      })
    }
    const casuales = datos.casuales.filter((servicio) => !servicio.fechaPago)
    if (casuales.length > 0) {
      pendientes.push({
        clave: 'casuales',
        texto: `${plural(casuales.length, 'servicio de vendedor casual', 'servicios de vendedores casuales')} sin pagar`,
        detalle: `${dinero(casuales.reduce((suma, servicio) => suma + servicio.total, 0))} Gs.`,
        ruta: '#/rrhh/casuales',
      })
    }
    for (const empleado of activos.filter((item) => item.fechaEgreso)) {
      pendientes.push({
        clave: `egreso-${empleado.id}`,
        texto: `${nombre(empleado)} egresa el ${fecha(empleado.fechaEgreso)}`,
        detalle: empleado.motivoEgreso ?? undefined,
        ruta: '#/rrhh/empleados',
      })
    }
  }

  const novedades = (datos?.asistencias ?? [])
    .filter((asistencia) => NOVEDADES[asistencia.estado] || asistencia.horasExtra > 0)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const fechas: Fecha[] = activos
    .flatMap((empleado): Fecha[] => {
      const lista: Fecha[] = []
      const cumple = empleado.fechaNacimiento ? proximaFecha(empleado.fechaNacimiento, hoyIso) : null
      if (cumple) {
        lista.push({ empleado, tipo: 'cumple', ...cumple })
      }
      const aniversario = proximaFecha(empleado.fechaIngreso, hoyIso)
      if (aniversario && aniversario.anios > 0) {
        lista.push({ empleado, tipo: 'aniversario', ...aniversario })
      }
      return lista
    })
    .sort((a, b) => a.faltan - b.faltan)

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="RR.HH"
        detalle={`Resumen del personal al ${fecha(hoyIso)}: asistencia, pagos pendientes y próximas fechas.`}
      />
      <Aviso mensaje={error} />

      <div className="tablero cuatro">
        <a className="tarjeta" href="#/rrhh/empleados">
          <p className="kicker">Personal</p>
          <strong>{datos ? activos.length : '…'}</strong>
          <span>
            Empleados activos
            {datos ? <small className="sub">{plural(activos.filter((empleado) => empleado.aseguradoIps).length, 'asegurado', 'asegurados')} en IPS</small> : null}
          </span>
        </a>
        <a className="tarjeta" href="#/rrhh/asistencia">
          <p className="kicker">Asistencia de hoy</p>
          <strong>{!datos ? '…' : esDomingo ? '—' : `${presentesHoy}/${activos.length}`}</strong>
          <span>
            {esDomingo ? 'Domingo' : 'Presentes'}
            {datos && !esDomingo ? <small className="sub">{sinMarcarHoy === 0 ? 'Todo cargado' : `${sinMarcarHoy} sin marcar`}</small> : null}
          </span>
        </a>
        <a className="tarjeta" href="#/rrhh/liquidaciones">
          <p className="kicker">Sueldos</p>
          <strong>{datos ? dinero(Math.round(costoMensual)) : '…'}</strong>
          <span>
            Por mes (estimado)
            <small className="sub">Sueldos base del personal activo</small>
          </span>
        </a>
        <a className="tarjeta" href="#/rrhh/adelantos">
          <p className="kicker">Adelantos y préstamos</p>
          <strong>{datos ? dinero(saldoAdelantos) : '…'}</strong>
          <span>
            Saldo por cobrar
            {datos ? <small className="sub">{plural(conSaldo, 'adelanto o préstamo', 'adelantos o préstamos')} con saldo</small> : null}
          </span>
        </a>
      </div>

      <div className="paneles">
        <article className="panel-inicio">
          <div className="seccion-cabecera">
            <div>
              <h3>Pendientes</h3>
              <p>Lo que falta cargar, confirmar o pagar.</p>
            </div>
            {datos ? <span className="contador">{pendientes.length}</span> : null}
          </div>
          {!datos ? (
            <p className="vacio">Cargando…</p>
          ) : pendientes.length === 0 ? (
            <p className="vacio">Todo al día.</p>
          ) : (
            <ul className="pendientes panel-lista">
              {pendientes.map((pendiente) => (
                <li key={pendiente.clave}>
                  <a href={pendiente.ruta}>
                    <strong>{pendiente.texto}</strong>
                    {pendiente.detalle ? <small className="sub">{pendiente.detalle}</small> : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel-inicio">
          <div className="seccion-cabecera">
            <div>
              <h3>Últimas liquidaciones</h3>
              <p>Sueldos generados y cuántos recibos se pagaron.</p>
            </div>
          </div>
          {!datos ? (
            <p className="vacio">Cargando…</p>
          ) : datos.liquidaciones.length === 0 ? (
            <p className="vacio">Todavía no hay liquidaciones de sueldo.</p>
          ) : (
            <div className="tabla-contenedor panel-lista">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Estado</th>
                    <th className="numero">Pagados</th>
                    <th className="numero">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.liquidaciones.slice(0, 6).map((liquidacion) => (
                    <tr key={liquidacion.id} className={liquidacion.estado === 'ANULADA' ? 'baja' : undefined}>
                      <td>
                        {fecha(liquidacion.desde)} al {fecha(liquidacion.hasta)}
                        <small className="sub">Sueldo {MODALIDADES[liquidacion.modalidad]}</small>
                      </td>
                      <td>
                        <span
                          className={
                            liquidacion.estado === 'ANULADA'
                              ? 'estado anulado'
                              : liquidacion.estado === 'BORRADOR'
                                ? 'estado alerta'
                                : 'estado'
                          }
                        >
                          {liquidacion.estado === 'BORRADOR' ? 'Borrador' : liquidacion.estado === 'CONFIRMADA' ? 'Confirmada' : 'Anulada'}
                        </span>
                      </td>
                      <td className="numero">
                        {liquidacion.pagados}/{liquidacion.empleados}
                      </td>
                      <td className="numero">{dinero(liquidacion.totalNeto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel-inicio">
          <div className="seccion-cabecera">
            <div>
              <h3>Novedades de la semana</h3>
              <p>
                Ausencias, permisos, reposos y horas extra del {fecha(lunes)} al {fecha(sabado)}.
              </p>
            </div>
            {datos ? <span className="contador">{novedades.length}</span> : null}
          </div>
          {!datos ? (
            <p className="vacio">Cargando…</p>
          ) : novedades.length === 0 ? (
            <p className="vacio">Sin novedades esta semana.</p>
          ) : (
            <div className="tabla-contenedor panel-lista">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Empleado</th>
                    <th>Novedad</th>
                  </tr>
                </thead>
                <tbody>
                  {novedades.map((asistencia) => {
                    const empleado = porId.get(asistencia.empleadoId)
                    const estado = NOVEDADES[asistencia.estado]
                    const extra = asistencia.horasExtra > 0 ? `${asistencia.horasExtra.toLocaleString('es-PY')} h extra` : null
                    return (
                      <tr key={asistencia.id}>
                        <td>
                          {DIAS_SEMANA[desdeIso(asistencia.fecha).getDay()]} {fecha(asistencia.fecha).slice(0, 5)}
                        </td>
                        <td>{empleado ? nombre(empleado) : '—'}</td>
                        <td>
                          {estado ? (
                            <span className={asistencia.justificada ? 'estado' : 'estado alerta'}>
                              {estado}
                              {asistencia.justificada ? ' (justificada)' : ''}
                            </span>
                          ) : null}
                          {estado && extra ? ' · ' : null}
                          {extra}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel-inicio">
          <div className="seccion-cabecera">
            <div>
              <h3>Cumpleaños y aniversarios</h3>
              <p>Próximos {PROXIMOS_DIAS} días.</p>
            </div>
          </div>
          {!datos ? (
            <p className="vacio">Cargando…</p>
          ) : fechas.length === 0 ? (
            <p className="vacio">No hay cumpleaños ni aniversarios en los próximos {PROXIMOS_DIAS} días.</p>
          ) : (
            <ul className="pendientes panel-lista">
              {fechas.map((item) => (
                <li key={`${item.tipo}-${item.empleado.id}`}>
                  <div>
                    <strong>
                      {item.faltan === 0 ? 'Hoy' : item.faltan === 1 ? 'Mañana' : `${DIAS_SEMANA[desdeIso(item.dia).getDay()]} ${fecha(item.dia).slice(0, 5)}`}
                      {' · '}
                      {nombre(item.empleado)}
                    </strong>
                    <small className="sub">
                      {item.tipo === 'cumple'
                        ? `Cumple ${item.anios} años`
                        : `Cumple ${plural(item.anios, 'año', 'años')} en la empresa`}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  )
}
