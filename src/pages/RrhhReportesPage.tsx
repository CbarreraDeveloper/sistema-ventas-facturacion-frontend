import { Fragment, useState } from 'react'
import { apiAbrir, apiDescargar, dinero, fecha, hoy, texto } from '../api/client'
import type { ModalidadPago, ReporteMovimientosRrhh, ReportePlanillaRrhh, ReporteTablaRrhh, TipoLineaSueldo } from '../api/types'
import { Aviso, Barra } from '../components/ui'
import { useReporte } from './ReportesPage'

type Clave = 'movimientos' | 'planilla' | 'costo' | 'comisiones' | 'viaticos' | 'ausencias' | 'adelantos'

const REPORTES: { clave: Clave; etiqueta: string }[] = [
  { clave: 'movimientos', etiqueta: 'Movimientos por funcionario' },
  { clave: 'planilla', etiqueta: 'Planilla general de liquidaciones' },
  { clave: 'costo', etiqueta: 'Costo del personal' },
  { clave: 'comisiones', etiqueta: 'Ranking de comisiones' },
  { clave: 'viaticos', etiqueta: 'Viáticos' },
  { clave: 'ausencias', etiqueta: 'Ausencias' },
  { clave: 'adelantos', etiqueta: 'Saldos de adelantos' },
]

const ARCHIVOS: Partial<Record<Clave, string>> = {
  movimientos: 'movimientos-sueldos.xlsx',
  planilla: 'planilla-general.xlsx',
}

const CONCEPTOS: Record<TipoLineaSueldo, string> = {
  SUELDO: 'Sueldo',
  HORAS_EXTRA: 'Horas extra',
  COMISION: 'Comisión',
  VIATICO: 'Viático',
  OTRO_INGRESO: 'Otro ingreso',
  AUSENCIA: 'Ausencias',
  ADELANTO: 'Adelanto',
  PRESTAMO: 'Préstamo',
  IPS: 'IPS',
  OTRO_DESCUENTO: 'Otro descuento',
}

const MODALIDADES: Record<ModalidadPago, string> = {
  SEMANAL: 'Semanal',
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
}

function iso(dia: Date): string {
  const parte = (valor: number) => String(valor).padStart(2, '0')
  return `${dia.getFullYear()}-${parte(dia.getMonth() + 1)}-${parte(dia.getDate())}`
}

function mes(desplazamiento: number): { desde: string; hasta: string } {
  const ahora = new Date()
  return {
    desde: iso(new Date(ahora.getFullYear(), ahora.getMonth() + desplazamiento, 1)),
    hasta: iso(new Date(ahora.getFullYear(), ahora.getMonth() + desplazamiento + 1, 0)),
  }
}

function liquidacion(modalidad: ModalidadPago, desde: string, hasta: string): string {
  return `${MODALIDADES[modalidad]} del ${fecha(desde)} al ${fecha(hasta)}`
}

function importe(valor: number) {
  return valor === 0 ? '—' : dinero(valor)
}

function descuento(valor: number) {
  return valor === 0 ? '—' : <span className="resta">{dinero(valor)}</span>
}

function Cargando({ error }: { error: string | null }) {
  return error ? <Aviso mensaje={error} /> : <p className="ayuda">Generando el reporte…</p>
}

export function RrhhReportesPage() {
  const [clave, setClave] = useState<Clave>('movimientos')
  const [periodo, setPeriodo] = useState(() => mes(0))
  const [tipo, setTipo] = useState<TipoLineaSueldo | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const consulta = `?desde=${periodo.desde}&hasta=${periodo.hasta}${clave === 'movimientos' && tipo ? `&tipo=${tipo}` : ''}`

  async function exportar(formato: 'excel' | 'pdf') {
    setTrabajando(true)
    setError(null)
    try {
      const ruta = `/rrhh/reportes/${clave}/${formato}${consulta}`
      if (formato === 'pdf') {
        await apiAbrir(ruta)
      } else {
        await apiDescargar(ruta, ARCHIVOS[clave] ?? `rrhh-${clave}.xlsx`)
      }
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo exportar el reporte')
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <section>
      <Barra
        kicker="RR.HH"
        titulo="Reportes"
        detalle="Sueldos, costo del personal, comisiones, viáticos, ausencias y adelantos del período, en pantalla, PDF o Excel."
      >
        <button type="button" className="btn" disabled={trabajando} onClick={() => void exportar('pdf')}>
          Ver PDF
        </button>
        <button type="button" className="btn primary" disabled={trabajando} onClick={() => void exportar('excel')}>
          Exportar a Excel
        </button>
      </Barra>
      <nav className="pestanas" aria-label="Reportes de RR.HH">
        {REPORTES.map((reporte) => (
          <button
            key={reporte.clave}
            type="button"
            className={reporte.clave === clave ? 'activa' : undefined}
            onClick={() => setClave(reporte.clave)}
          >
            {reporte.etiqueta}
          </button>
        ))}
      </nav>
      <div className="periodo">
        <label className="campo compacto">
          <span>Desde</span>
          <input
            type="date"
            value={periodo.desde}
            max={periodo.hasta}
            onChange={(event) => event.target.value && setPeriodo({ ...periodo, desde: event.target.value })}
          />
        </label>
        <label className="campo compacto">
          <span>Hasta</span>
          <input
            type="date"
            value={periodo.hasta}
            min={periodo.desde}
            onChange={(event) => event.target.value && setPeriodo({ ...periodo, hasta: event.target.value })}
          />
        </label>
        {clave === 'movimientos' ? (
          <label className="campo compacto">
            <span>Concepto</span>
            <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoLineaSueldo | '')}>
              <option value="">Todos</option>
              {Object.entries(CONCEPTOS).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="btn ghost" onClick={() => setPeriodo(mes(0))}>
          Este mes
        </button>
        <button type="button" className="btn ghost" onClick={() => setPeriodo(mes(-1))}>
          Mes anterior
        </button>
        <button type="button" className="btn ghost" onClick={() => setPeriodo({ desde: `${hoy().slice(0, 4)}-01-01`, hasta: hoy() })}>
          Este año
        </button>
      </div>
      <Aviso mensaje={error} />
      {clave === 'movimientos' ? (
        <Movimientos path={`/rrhh/reportes/movimientos${consulta}`} />
      ) : clave === 'planilla' ? (
        <Planilla path={`/rrhh/reportes/planilla${consulta}`} />
      ) : (
        <Tabla path={`/rrhh/reportes/${clave}${consulta}`} />
      )}
    </section>
  )
}

function celda(tipo: ReporteTablaRrhh['columnas'][number]['tipo'], valor: string | number | null) {
  if (valor == null || valor === '') {
    return ''
  }
  if (typeof valor === 'string') {
    return tipo === 'FECHA' ? fecha(valor) : valor
  }
  if (tipo === 'MONTO') {
    return dinero(valor)
  }
  if (tipo === 'PORCENTAJE') {
    return `${valor.toLocaleString('es-PY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  }
  return valor.toLocaleString('es-PY')
}

function Tabla({ path }: { path: string }) {
  const { datos, error } = useReporte<ReporteTablaRrhh>(path)
  if (!datos) {
    return <Cargando error={error} />
  }
  const numerica = datos.columnas.map((columna) => columna.tipo !== 'TEXTO')
  return (
    <>
      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              {datos.columnas.map((columna, indice) => (
                <th key={columna.titulo} className={numerica[indice] ? 'numero' : undefined}>
                  {columna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((fila, numero) => (
              <tr key={numero}>
                {datos.columnas.map((columna, indice) => (
                  <td key={columna.titulo} className={numerica[indice] ? 'numero' : undefined}>
                    {celda(columna.tipo, fila[indice])}
                  </td>
                ))}
              </tr>
            ))}
            {datos.filas.length === 0 ? (
              <tr>
                <td colSpan={datos.columnas.length}>No hay datos en el período.</td>
              </tr>
            ) : datos.totales ? (
              <tr className="fila-total">
                {datos.columnas.map((columna, indice) => (
                  <td key={columna.titulo} className={numerica[indice] ? 'numero' : undefined}>
                    {celda(columna.tipo, datos.totales?.[indice] ?? null)}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {datos.avisos.map((aviso) => (
        <p key={aviso} className="ayuda">
          {aviso}
        </p>
      ))}
    </>
  )
}

function Movimientos({ path }: { path: string }) {
  const { datos, error } = useReporte<ReporteMovimientosRrhh>(path)
  if (!datos) {
    return <Cargando error={error} />
  }
  return (
    <>
      <div className="totales cuatro">
        <div>
          <span>Funcionarios</span>
          <strong>{datos.funcionarios.length}</strong>
        </div>
        <div>
          <span>Haberes</span>
          <strong>{dinero(datos.haberes)}</strong>
        </div>
        <div>
          <span>Descuentos</span>
          <strong>{dinero(datos.descuentos)}</strong>
        </div>
        <div className="total">
          <span>Neto</span>
          <strong>{dinero(datos.neto)}</strong>
        </div>
      </div>
      <p className="ayuda">
        {datos.liquidaciones} liquidación(es) confirmada(s) en el período{datos.tipo ? `, concepto ${CONCEPTOS[datos.tipo]}` : ', todos los conceptos'}.
      </p>
      <h3 className="bloque">Por funcionario</h3>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Liquidación</th>
              <th>Concepto</th>
              <th>Descripción</th>
              <th className="numero">Haber</th>
              <th className="numero">Descuento</th>
            </tr>
          </thead>
          <tbody>
            {datos.funcionarios.map((funcionario) => (
              <Fragment key={funcionario.empleadoId}>
                <tr className="fila-grupo">
                  <td colSpan={5}>
                    <strong>{funcionario.empleado}</strong> · C.I. {texto(funcionario.documento)}
                    {funcionario.cargo ? ` · ${funcionario.cargo}` : ''}
                  </td>
                </tr>
                {funcionario.movimientos.map((movimiento, indice) => (
                  <tr key={`${movimiento.liquidacionId}-${indice}`}>
                    <td>{liquidacion(movimiento.modalidad, movimiento.desde, movimiento.hasta)}</td>
                    <td>{CONCEPTOS[movimiento.tipo]}</td>
                    <td>{movimiento.descripcion}</td>
                    <td className="numero">{movimiento.haber ? dinero(movimiento.monto) : '—'}</td>
                    <td className="numero">{movimiento.haber ? '—' : descuento(movimiento.monto)}</td>
                  </tr>
                ))}
                <tr className="fila-subtotal">
                  <td colSpan={3}>Subtotal · neto {dinero(funcionario.neto)}</td>
                  <td className="numero">{dinero(funcionario.haberes)}</td>
                  <td className="numero">{dinero(funcionario.descuentos)}</td>
                </tr>
              </Fragment>
            ))}
            {datos.funcionarios.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay movimientos en liquidaciones confirmadas del período.</td>
              </tr>
            ) : (
              <tr className="fila-total">
                <td colSpan={3}>Total general · neto {dinero(datos.neto)}</td>
                <td className="numero">{dinero(datos.haberes)}</td>
                <td className="numero">{dinero(datos.descuentos)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {datos.conceptos.length > 0 ? (
        <>
          <h3 className="bloque">Totales por concepto</h3>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th className="numero">Movimientos</th>
                  <th className="numero">Total</th>
                </tr>
              </thead>
              <tbody>
                {datos.conceptos.map((concepto) => (
                  <tr key={concepto.tipo}>
                    <td>{CONCEPTOS[concepto.tipo]}</td>
                    <td>{concepto.haber ? 'Haber' : 'Descuento'}</td>
                    <td className="numero">{concepto.cantidad}</td>
                    <td className="numero">{concepto.haber ? dinero(concepto.total) : descuento(concepto.total)}</td>
                  </tr>
                ))}
                <tr className="fila-total">
                  <td colSpan={3}>Neto (haberes - descuentos)</td>
                  <td className="numero">{dinero(datos.neto)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  )
}

function Planilla({ path }: { path: string }) {
  const { datos, error } = useReporte<ReportePlanillaRrhh>(path)
  if (!datos) {
    return <Cargando error={error} />
  }
  const total = datos.totales
  return (
    <>
      <div className="totales cuatro">
        <div>
          <span>Liquidaciones</span>
          <strong>{datos.liquidaciones.length}</strong>
        </div>
        <div>
          <span>Haberes</span>
          <strong>{dinero(total.haberes)}</strong>
        </div>
        <div>
          <span>Descuentos</span>
          <strong>{dinero(total.descuentos)}</strong>
        </div>
        <div className="total">
          <span>Neto pagado</span>
          <strong>{dinero(total.neto)}</strong>
        </div>
      </div>
      <p className="ayuda">Una fila por funcionario con la suma de todos sus recibos del período, con los mismos conceptos de la planilla de cada liquidación.</p>
      <div className="tabla-contenedor">
        <table className="tabla ancha planilla">
          <thead>
            <tr>
              <th>Funcionario</th>
              <th>C.I. Nº</th>
              <th className="numero">Recibos</th>
              <th className="numero">Sueldo</th>
              <th className="numero">Ausencias (-)</th>
              <th className="numero">Horas extra</th>
              <th className="numero">Viáticos</th>
              <th className="numero">Comisión y otros</th>
              <th className="numero">Adelantos y préstamos (-)</th>
              <th className="numero">IPS (-)</th>
              <th className="numero">Otros desc. (-)</th>
              <th className="numero">Neto</th>
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((fila) => (
              <tr key={fila.empleadoId ?? fila.empleado}>
                <td>
                  {fila.empleado}
                  {fila.cargo ? <small className="ayuda"> · {fila.cargo}</small> : null}
                </td>
                <td>{texto(fila.documento)}</td>
                <td className="numero">{fila.recibos}</td>
                <td className="numero">{importe(fila.sueldo)}</td>
                <td className="numero">{descuento(fila.ausencias)}</td>
                <td className="numero">{importe(fila.horasExtra)}</td>
                <td className="numero">{importe(fila.viaticos)}</td>
                <td className="numero">{importe(fila.comisionesOtros)}</td>
                <td className="numero">{descuento(fila.adelantosPrestamos)}</td>
                <td className="numero">{descuento(fila.ips)}</td>
                <td className="numero">{descuento(fila.otrosDescuentos)}</td>
                <td className="numero">
                  <strong>{dinero(fila.neto)}</strong>
                </td>
              </tr>
            ))}
            {datos.filas.length === 0 ? (
              <tr>
                <td colSpan={12}>No hay liquidaciones confirmadas en el período.</td>
              </tr>
            ) : (
              <tr className="fila-total">
                <td colSpan={2}>Totales ({datos.filas.length} funcionarios)</td>
                <td className="numero">{total.recibos}</td>
                <td className="numero">{dinero(total.sueldo)}</td>
                <td className="numero">{dinero(total.ausencias)}</td>
                <td className="numero">{dinero(total.horasExtra)}</td>
                <td className="numero">{dinero(total.viaticos)}</td>
                <td className="numero">{dinero(total.comisionesOtros)}</td>
                <td className="numero">{dinero(total.adelantosPrestamos)}</td>
                <td className="numero">{dinero(total.ips)}</td>
                <td className="numero">{dinero(total.otrosDescuentos)}</td>
                <td className="numero">{dinero(total.neto)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {datos.liquidaciones.length > 0 ? (
        <>
          <h3 className="bloque">Liquidaciones incluidas</h3>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="numero">Nº</th>
                  <th>Liquidación</th>
                  <th className="numero">Recibos</th>
                  <th className="numero">Neto</th>
                </tr>
              </thead>
              <tbody>
                {datos.liquidaciones.map((incluida) => (
                  <tr key={incluida.id}>
                    <td className="numero">{incluida.id}</td>
                    <td>{liquidacion(incluida.modalidad, incluida.desde, incluida.hasta)}</td>
                    <td className="numero">{incluida.recibos}</td>
                    <td className="numero">{dinero(incluida.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  )
}
