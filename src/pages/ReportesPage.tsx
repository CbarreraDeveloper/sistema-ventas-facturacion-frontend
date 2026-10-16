import { useEffect, useState } from 'react'
import { apiDescargar, apiListar, cantidad, dinero, fecha, hoy, texto } from '../api/client'
import type {
  FilaCaja,
  LibroIva,
  ReporteCaja,
  ReporteCobranzas,
  ReporteProductos,
  ReporteStock,
  ReporteVentas,
} from '../api/types'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra } from '../components/ui'

type Clave = 'ventas' | 'productos' | 'libro-ventas' | 'libro-compras' | 'stock' | 'cobranzas' | 'caja'

const REPORTES: { clave: Clave; etiqueta: string; periodo: boolean }[] = [
  { clave: 'ventas', etiqueta: 'Ventas', periodo: true },
  { clave: 'productos', etiqueta: 'Productos y rentabilidad', periodo: true },
  { clave: 'libro-ventas', etiqueta: 'Libro IVA ventas', periodo: true },
  { clave: 'libro-compras', etiqueta: 'Libro IVA compras', periodo: true },
  { clave: 'stock', etiqueta: 'Stock valorizado', periodo: false },
  { clave: 'cobranzas', etiqueta: 'Antigüedad de saldos', periodo: false },
  { clave: 'caja', etiqueta: 'Caja', periodo: true },
]

function iso(fechaLocal: Date): string {
  const parte = (valor: number) => String(valor).padStart(2, '0')
  return `${fechaLocal.getFullYear()}-${parte(fechaLocal.getMonth() + 1)}-${parte(fechaLocal.getDate())}`
}

function inicioMes(desplazamiento = 0): string {
  const ahora = new Date()
  return iso(new Date(ahora.getFullYear(), ahora.getMonth() + desplazamiento, 1))
}

function finMesAnterior(): string {
  const ahora = new Date()
  return iso(new Date(ahora.getFullYear(), ahora.getMonth(), 0))
}

function porcentaje(valor: number): string {
  return `${new Intl.NumberFormat('es-PY', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor)} %`
}

function condicion(valor: 'CONTADO' | 'CREDITO'): string {
  return valor === 'CREDITO' ? 'Crédito' : 'Contado'
}

function useReporte<T>(path: string) {
  const [estado, setEstado] = useState<{ path: string; datos: T | null; error: string | null }>({ path: '', datos: null, error: null })

  useEffect(() => {
    let vigente = true
    apiListar<T>(path)
      .then((datos) => {
        if (vigente) {
          setEstado({ path, datos, error: null })
        }
      })
      .catch((causa: unknown) => {
        if (vigente) {
          setEstado({ path, datos: null, error: causa instanceof Error ? causa.message : 'No se pudo generar el reporte' })
        }
      })
    return () => {
      vigente = false
    }
  }, [path])

  return estado.path === path ? estado : { path, datos: null, error: null }
}

export function ReportesPage() {
  const [clave, setClave] = useState<Clave>('ventas')
  const [desde, setDesde] = useState(inicioMes())
  const [hasta, setHasta] = useState(hoy())
  const [error, setError] = useState<string | null>(null)
  const actual = REPORTES.find((reporte) => reporte.clave === clave) ?? REPORTES[0]
  const periodo = `?desde=${desde}&hasta=${hasta}`

  async function exportar() {
    try {
      setError(null)
      await apiDescargar(`/reportes/${clave}/excel${actual.periodo ? periodo : ''}`, `${clave}.xlsx`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo exportar el reporte')
    }
  }

  function rango(inicio: string, fin: string) {
    setDesde(inicio)
    setHasta(fin)
  }

  return (
    <section>
      <Barra kicker="Gestión" titulo="Reportes" detalle="Ventas, rentabilidad, libros de IVA, stock, saldos de clientes y caja. Todos se pueden exportar a Excel.">
        <button type="button" className="btn primary" onClick={() => void exportar()}>
          Exportar a Excel
        </button>
      </Barra>
      <nav className="pestanas" aria-label="Reportes">
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
      {actual.periodo ? (
        <div className="periodo">
          <label className="campo compacto">
            <span>Desde</span>
            <input type="date" value={desde} max={hasta} onChange={(event) => event.target.value && setDesde(event.target.value)} />
          </label>
          <label className="campo compacto">
            <span>Hasta</span>
            <input type="date" value={hasta} min={desde} onChange={(event) => event.target.value && setHasta(event.target.value)} />
          </label>
          <button type="button" className="btn ghost" onClick={() => rango(hoy(), hoy())}>
            Hoy
          </button>
          <button type="button" className="btn ghost" onClick={() => rango(inicioMes(), hoy())}>
            Este mes
          </button>
          <button type="button" className="btn ghost" onClick={() => rango(inicioMes(-1), finMesAnterior())}>
            Mes anterior
          </button>
          <button type="button" className="btn ghost" onClick={() => rango(`${hoy().slice(0, 4)}-01-01`, hoy())}>
            Este año
          </button>
        </div>
      ) : null}
      <Aviso mensaje={error} />
      {clave === 'ventas' ? <Ventas path={`/reportes/ventas${periodo}`} /> : null}
      {clave === 'productos' ? <Productos path={`/reportes/productos${periodo}`} /> : null}
      {clave === 'libro-ventas' ? <Libro path={`/reportes/libro-ventas${periodo}`} contraparte="Cliente" /> : null}
      {clave === 'libro-compras' ? <Libro path={`/reportes/libro-compras${periodo}`} contraparte="Proveedor" /> : null}
      {clave === 'stock' ? <Stock /> : null}
      {clave === 'cobranzas' ? <Cobranzas /> : null}
      {clave === 'caja' ? <Caja path={`/reportes/caja${periodo}`} /> : null}
    </section>
  )
}

function Cargando({ error }: { error: string | null }) {
  return error ? <Aviso mensaje={error} /> : <p className="ayuda">Generando el reporte…</p>
}

function Ventas({ path }: { path: string }) {
  const { datos, error } = useReporte<ReporteVentas>(path)
  if (!datos) {
    return <Cargando error={error} />
  }
  return (
    <>
      <div className="totales">
        <div>
          <span>Facturas</span>
          <strong>{datos.facturas}</strong>
        </div>
        <div>
          <span>Contado</span>
          <strong>{dinero(datos.contado)}</strong>
        </div>
        <div>
          <span>Crédito</span>
          <strong>{dinero(datos.credito)}</strong>
        </div>
        <div>
          <span>Notas de crédito</span>
          <strong>{dinero(datos.notasCredito)}</strong>
        </div>
        <div>
          <span>Promedio por factura</span>
          <strong>{dinero(datos.promedio)}</strong>
        </div>
        <div className="total">
          <span>Venta neta</span>
          <strong>{dinero(datos.neto)}</strong>
        </div>
      </div>
      <p className="ayuda">
        IVA débito neto: 10 % Gs. {dinero(datos.iva10)} · 5 % Gs. {dinero(datos.iva5)}
        {datos.anuladas ? ` · ${datos.anuladas} factura(s) anulada(s) en el período, no suman` : ''}
      </p>
      <h3 className="bloque">Por día</h3>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th className="fecha">Fecha</th>
              <th className="numero">Facturas</th>
              <th className="numero">Contado</th>
              <th className="numero">Crédito</th>
              <th className="numero">Notas de crédito</th>
              <th className="numero">Neto</th>
            </tr>
          </thead>
          <tbody>
            {datos.dias.map((dia) => (
              <tr key={dia.fecha}>
                <td className="fecha">{fecha(dia.fecha)}</td>
                <td className="numero">{dia.facturas}</td>
                <td className="numero">{dinero(dia.contado)}</td>
                <td className="numero">{dinero(dia.credito)}</td>
                <td className="numero">{dinero(dia.notasCredito)}</td>
                <td className="numero">{dinero(dia.neto)}</td>
              </tr>
            ))}
            {datos.dias.length === 0 ? (
              <tr>
                <td colSpan={6}>No hay ventas en el período.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <h3 className="bloque">Por usuario</h3>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th className="numero">Facturas</th>
              <th className="numero">Facturado</th>
              <th className="numero">Notas de crédito</th>
              <th className="numero">Neto</th>
            </tr>
          </thead>
          <tbody>
            {datos.vendedores.map((vendedor) => (
              <tr key={vendedor.usuario}>
                <td>{vendedor.usuario}</td>
                <td className="numero">{vendedor.facturas}</td>
                <td className="numero">{dinero(vendedor.facturado)}</td>
                <td className="numero">{dinero(vendedor.notasCredito)}</td>
                <td className="numero">{dinero(vendedor.neto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Productos({ path }: { path: string }) {
  const { datos, error } = useReporte<ReporteProductos>(path)
  const [busqueda, setBusqueda] = useState('')
  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const lineas = (datos?.lineas ?? []).filter(
    (linea) => !consulta || linea.codigo.includes(consulta) || linea.descripcion.includes(consulta) || (linea.rubro ?? '').includes(consulta),
  )
  const paginacion = usePaginacion(lineas)
  if (!datos) {
    return <Cargando error={error} />
  }
  return (
    <>
      <div className="totales cuatro">
        <div>
          <span>Importe vendido</span>
          <strong>{dinero(datos.importe)}</strong>
        </div>
        <div>
          <span>Costo</span>
          <strong>{dinero(datos.costo)}</strong>
        </div>
        <div>
          <span>Margen</span>
          <strong>{porcentaje(datos.margen)}</strong>
        </div>
        <div className="total">
          <span>Utilidad bruta</span>
          <strong>{dinero(datos.utilidad)}</strong>
        </div>
      </div>
      <p className="ayuda">
        Descuenta devoluciones y descuentos de notas de crédito. El costo es el que tenía cada producto el día de la venta, así que cambiar
        costos después no altera la rentabilidad de meses pasados.
      </p>
      <label className="campo busqueda">
        <span>Buscar</span>
        <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Código, descripción o rubro" />
      </label>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Rubro</th>
              <th className="numero">Cantidad</th>
              <th className="numero">Importe</th>
              <th className="numero">Costo</th>
              <th className="numero">Utilidad</th>
              <th className="numero">Margen</th>
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((linea) => (
              <tr key={linea.codigo + linea.descripcion}>
                <td>{linea.codigo}</td>
                <td>{linea.descripcion}</td>
                <td>{texto(linea.rubro)}</td>
                <td className="numero">
                  {cantidad(linea.cantidad)} {linea.unidad ?? ''}
                </td>
                <td className="numero">{dinero(linea.importe)}</td>
                <td className="numero">{dinero(linea.costo)}</td>
                <td className={linea.utilidad < 0 ? 'numero falta' : 'numero'}>{dinero(linea.utilidad)}</td>
                <td className="numero">{porcentaje(linea.margen)}</td>
              </tr>
            ))}
            {lineas.length === 0 ? (
              <tr>
                <td colSpan={8}>No hay productos vendidos en el período.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
    </>
  )
}

function Libro({ path, contraparte }: { path: string; contraparte: string }) {
  const { datos, error } = useReporte<LibroIva>(path)
  const paginacion = usePaginacion(datos?.lineas ?? [])
  if (!datos) {
    return <Cargando error={error} />
  }
  return (
    <>
      <div className="totales">
        <div>
          <span>Gravado 10 %</span>
          <strong>{dinero(datos.gravado10)}</strong>
        </div>
        <div>
          <span>IVA 10 %</span>
          <strong>{dinero(datos.iva10)}</strong>
        </div>
        <div>
          <span>Gravado 5 %</span>
          <strong>{dinero(datos.gravado5)}</strong>
        </div>
        <div>
          <span>IVA 5 %</span>
          <strong>{dinero(datos.iva5)}</strong>
        </div>
        <div>
          <span>Exento</span>
          <strong>{dinero(datos.exento)}</strong>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{dinero(datos.total)}</strong>
        </div>
      </div>
      <p className="ayuda">
        Los montos gravados incluyen el IVA. Las notas de crédito restan y los comprobantes anulados figuran en cero.
      </p>
      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th className="fecha">Fecha</th>
              <th>Tipo</th>
              <th>Número</th>
              <th>Timbrado</th>
              <th>RUC / CI</th>
              <th>{contraparte}</th>
              <th>Condición</th>
              <th className="numero">Gravado 10 %</th>
              <th className="numero">IVA 10 %</th>
              <th className="numero">Gravado 5 %</th>
              <th className="numero">IVA 5 %</th>
              <th className="numero">Exento</th>
              <th className="numero">Total</th>
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((linea) => (
              <tr key={linea.id} className={linea.estado === 'ANULADO' ? 'baja' : undefined}>
                <td className="fecha">{fecha(linea.fecha)}</td>
                <td>{linea.estado === 'ANULADO' ? `${linea.tipo} (ANULADA)` : linea.tipo}</td>
                <td>{linea.numero}</td>
                <td>{texto(linea.timbrado)}</td>
                <td>{texto(linea.ruc)}</td>
                <td>{linea.razonSocial}</td>
                <td>{condicion(linea.condicion)}</td>
                <td className="numero">{dinero(linea.gravado10)}</td>
                <td className="numero">{dinero(linea.iva10)}</td>
                <td className="numero">{dinero(linea.gravado5)}</td>
                <td className="numero">{dinero(linea.iva5)}</td>
                <td className="numero">{dinero(linea.exento)}</td>
                <td className="numero">{dinero(linea.total)}</td>
              </tr>
            ))}
            {datos.lineas.length === 0 ? (
              <tr>
                <td colSpan={13}>No hay comprobantes en el período.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
    </>
  )
}

function Stock() {
  const { datos, error } = useReporte<ReporteStock>('/reportes/stock')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'con' | 'sin'>('todos')
  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const lineas = (datos?.lineas ?? []).filter(
    (linea) =>
      (filtro === 'todos' || (filtro === 'con' ? linea.existencia > 0 : linea.existencia <= 0))
      && (!consulta || linea.codigo.includes(consulta) || linea.descripcion.includes(consulta) || (linea.rubro ?? '').includes(consulta)),
  )
  const paginacion = usePaginacion(lineas)
  if (!datos) {
    return <Cargando error={error} />
  }
  return (
    <>
      <div className="totales cuatro">
        <div>
          <span>Productos con control de stock</span>
          <strong>{datos.productos}</strong>
        </div>
        <div>
          <span>Sin existencia</span>
          <strong>{datos.sinStock}</strong>
        </div>
        <div>
          <span>Con existencia</span>
          <strong>{datos.productos - datos.sinStock}</strong>
        </div>
        <div className="total">
          <span>Valorizado al costo</span>
          <strong>{dinero(datos.valorizado)}</strong>
        </div>
      </div>
      <div className="periodo">
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Código, descripción o rubro" />
        </label>
        <label className="campo compacto">
          <span>Mostrar</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value as 'todos' | 'con' | 'sin')}>
            <option value="todos">Todos</option>
            <option value="con">Con existencia</option>
            <option value="sin">Sin existencia</option>
          </select>
        </label>
      </div>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Rubro</th>
              <th className="numero">Existencia</th>
              <th className="numero">Costo</th>
              <th className="numero">Valorizado</th>
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((linea) => (
              <tr key={linea.codigo}>
                <td>{linea.codigo}</td>
                <td>{linea.descripcion}</td>
                <td>{texto(linea.rubro)}</td>
                <td className={linea.existencia < 0 ? 'numero falta' : 'numero'}>
                  {cantidad(linea.existencia)} {linea.unidad}
                </td>
                <td className="numero">{dinero(linea.costo)}</td>
                <td className="numero">{dinero(linea.valorizado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
    </>
  )
}

function Cobranzas() {
  const { datos, error } = useReporte<ReporteCobranzas>('/reportes/cobranzas')
  if (!datos) {
    return <Cargando error={error} />
  }
  return (
    <>
      <div className="totales">
        <div>
          <span>Por vencer</span>
          <strong>{dinero(datos.porVencer)}</strong>
        </div>
        <div>
          <span>Vencido 1 a 30 días</span>
          <strong>{dinero(datos.hasta30)}</strong>
        </div>
        <div>
          <span>31 a 60 días</span>
          <strong>{dinero(datos.hasta60)}</strong>
        </div>
        <div>
          <span>61 a 90 días</span>
          <strong>{dinero(datos.hasta90)}</strong>
        </div>
        <div>
          <span>Más de 90 días</span>
          <strong className={datos.mas90 > 0 ? 'falta' : undefined}>{dinero(datos.mas90)}</strong>
        </div>
        <div className="total">
          <span>Saldo a cobrar</span>
          <strong>{dinero(datos.saldo)}</strong>
        </div>
      </div>
      <p className="ayuda">
        Saldos de facturas a crédito al {fecha(datos.corte)}, según los días de atraso desde el vencimiento. Las facturas sin plazo se cuentan desde su fecha.
      </p>
      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>RUC / CI</th>
              <th className="numero">Facturas</th>
              <th className="fecha">Vence la más antigua</th>
              <th className="numero">Por vencer</th>
              <th className="numero">1 a 30</th>
              <th className="numero">31 a 60</th>
              <th className="numero">61 a 90</th>
              <th className="numero">Más de 90</th>
              <th className="numero">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {datos.clientes.map((cliente) => (
              <tr key={cliente.clienteId}>
                <td>{cliente.cliente}</td>
                <td>{texto(cliente.documento)}</td>
                <td className="numero">{cliente.facturas}</td>
                <td className="fecha">{fecha(cliente.vencimientoMasAntiguo)}</td>
                <td className="numero">{dinero(cliente.porVencer)}</td>
                <td className="numero">{dinero(cliente.hasta30)}</td>
                <td className="numero">{dinero(cliente.hasta60)}</td>
                <td className="numero">{dinero(cliente.hasta90)}</td>
                <td className={cliente.mas90 > 0 ? 'numero falta' : 'numero'}>{dinero(cliente.mas90)}</td>
                <td className="numero">{dinero(cliente.saldo)}</td>
              </tr>
            ))}
            {datos.clientes.length === 0 ? (
              <tr>
                <td colSpan={10}>No hay saldos pendientes.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TablaCaja({ titulo, filas, datos }: { titulo: string; filas: FilaCaja[]; datos: ReporteCaja }) {
  return (
    <>
      <h3 className="bloque">{titulo}</h3>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="numero">Ingresos</th>
              <th className="numero">Egresos</th>
              <th className="numero">Neto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.nombre}>
                <td>{fila.nombre}</td>
                <td className="numero">{dinero(fila.ingresos)}</td>
                <td className="numero">{dinero(fila.egresos)}</td>
                <td className="numero">{dinero(fila.neto)}</td>
              </tr>
            ))}
            {filas.length === 0 ? (
              <tr>
                <td colSpan={4}>No hay movimientos de caja en el período.</td>
              </tr>
            ) : (
              <tr className="fila-total">
                <td>Total</td>
                <td className="numero">{dinero(datos.ingresos)}</td>
                <td className="numero">{dinero(datos.egresos)}</td>
                <td className="numero">{dinero(datos.neto)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Caja({ path }: { path: string }) {
  const { datos, error } = useReporte<ReporteCaja>(path)
  if (!datos) {
    return <Cargando error={error} />
  }
  return (
    <>
      <div className="totales cuatro">
        <div>
          <span>Ingresos</span>
          <strong>{dinero(datos.ingresos)}</strong>
        </div>
        <div>
          <span>Egresos</span>
          <strong>{dinero(datos.egresos)}</strong>
        </div>
        <div>
          <span>Medios usados</span>
          <strong>{datos.medios.length}</strong>
        </div>
        <div className="total">
          <span>Neto</span>
          <strong>{dinero(datos.neto)}</strong>
        </div>
      </div>
      <p className="ayuda">Movimientos de todas las cajas del período, sin contar los montos de apertura. Las anulaciones restan en el mismo concepto.</p>
      <TablaCaja titulo="Por medio de pago" filas={datos.medios} datos={datos} />
      <TablaCaja titulo="Por origen" filas={datos.origenes} datos={datos} />
    </>
  )
}
