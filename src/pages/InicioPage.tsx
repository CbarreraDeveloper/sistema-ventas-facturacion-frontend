import { useEffect, useState } from 'react'
import { apiListar, cantidad, dinero } from '../api/client'
import type { MasVendido, Material, Resumen } from '../api/types'
import { Aviso, Barra } from '../components/ui'

const VACIO: Resumen = { materiales: 0, proveedores: 0, clientes: 0 }
const STOCK_MINIMO = 10
const DIAS = 30

export function InicioPage() {
  const [resumen, setResumen] = useState<Resumen>(VACIO)
  const [masVendidos, setMasVendidos] = useState<MasVendido[]>([])
  const [porAgotarse, setPorAgotarse] = useState<Material[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiListar<Resumen>('/resumen'),
      apiListar<MasVendido[]>(`/resumen/mas-vendidos?dias=${DIAS}`),
      apiListar<Material[]>('/productos'),
    ])
      .then(([datos, vendidos, materiales]) => {
        setResumen(datos)
        setMasVendidos(vendidos)
        setPorAgotarse(materiales
          .filter(material => material.activo && material.controlaStock && material.existencia <= STOCK_MINIMO)
          .sort((a, b) => a.existencia - b.existencia || a.codigo.localeCompare(b.codigo)))
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo leer el resumen'))
      .finally(() => setCargando(false))
  }, [])

  const mayor = Math.max(...masVendidos.map(item => item.cantidad), 1)

  return (
    <section>
      <Barra
        kicker="Distribuidora"
        titulo="Distriworld"
        detalle="Pisos, sanitarios y materiales. El catálogo ya está cargado."
      />
      <Aviso mensaje={error} />
      <div className="tablero">
        <a className="tarjeta" href="#/materiales">
          <p className="kicker">Catálogo</p>
          <strong>{resumen.materiales}</strong>
          <span>Materiales</span>
        </a>
        <a className="tarjeta" href="#/proveedores">
          <p className="kicker">Abastecimiento</p>
          <strong>{resumen.proveedores}</strong>
          <span>Proveedores</span>
        </a>
        <a className="tarjeta" href="#/clientes">
          <p className="kicker">Cuenta corriente</p>
          <strong>{resumen.clientes}</strong>
          <span>Clientes</span>
        </a>
      </div>

      <div className="paneles">
        <article className="panel-inicio">
          <div className="seccion-cabecera">
            <div>
              <h3>Materiales más vendidos</h3>
              <p>Unidades vendidas en los últimos {DIAS} días, descontando notas de crédito.</p>
            </div>
          </div>
          {cargando ? (
            <p className="vacio">Cargando…</p>
          ) : masVendidos.length === 0 ? (
            <p className="vacio">Todavía no hay ventas en este período.</p>
          ) : (
            <ol className="grafico">
              {masVendidos.map(item => (
                <li key={item.codigo}>
                  <div className="grafico-etiqueta">
                    <span title={item.descripcion}><strong>{item.codigo}</strong> {item.descripcion}</span>
                    <span className="grafico-valor">{cantidad(item.cantidad)} {item.unidad ?? ''}</span>
                  </div>
                  <div className="grafico-pista" title={`Importe: ${dinero(item.importe)}`}>
                    <div className="grafico-barra" style={{ width: `${(item.cantidad / mayor) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="panel-inicio">
          <div className="seccion-cabecera">
            <div>
              <h3>Próximos a agotarse</h3>
              <p>Materiales con existencia de {STOCK_MINIMO} o menos.</p>
            </div>
            {!cargando && <span className="contador">{porAgotarse.length}</span>}
          </div>
          {cargando ? (
            <p className="vacio">Cargando…</p>
          ) : porAgotarse.length === 0 ? (
            <p className="vacio">Ningún material está por agotarse.</p>
          ) : (
            <div className="tabla-contenedor panel-lista">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th className="numero">Existencia</th>
                  </tr>
                </thead>
                <tbody>
                  {porAgotarse.map(material => (
                    <tr key={material.id}>
                      <td>{material.codigo}</td>
                      <td>{material.descripcion}</td>
                      <td className={`numero ${material.existencia <= 0 ? 'agotado' : 'escaso'}`}>
                        {cantidad(material.existencia)} {material.unidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
