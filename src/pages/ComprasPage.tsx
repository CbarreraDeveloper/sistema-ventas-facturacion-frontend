import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiCrear, apiListar, cantidad, dinero, fecha, hoy, texto } from '../api/client'
import type { Compra, Material, Tercero } from '../api/types'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { CuadroTotales, sumarTotales, totalesDe } from '../components/Totales'
import type { Totales } from '../components/Totales'
import { Aviso, Barra, Campo, Dialogo, mascaraMonto, numeroOpcional, textoOpcional, valorInput } from '../components/ui'

type Linea = {
  clave: number
  material: Material
  cantidad: string
  precio: string
}

export function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [creando, setCreando] = useState(false)
  const [viendo, setViendo] = useState<Compra | null>(null)

  async function cargar() {
    try {
      setCompras(await apiListar<Compra[]>('/compras'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las compras')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function ver(compra: Compra) {
    try {
      setViendo(await apiListar<Compra>(`/compras/${compra.id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la compra')
    }
  }

  const paginacion = usePaginacion(compras)

  return (
    <section>
      <Barra kicker="Abastecimiento" titulo="Compras" detalle="Facturas de proveedores. Al confirmar suman stock al depósito principal.">
        <button type="button" className="btn primary" onClick={() => setCreando(true)}>
          Nueva compra
        </button>
      </Barra>
      <Aviso mensaje={error} />
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th className="fecha">Fecha</th>
              <th>Proveedor</th>
              <th>Factura</th>
              <th>Condición</th>
              <th className="fecha">Vence</th>
              <th className="numero">Total</th>
              <th className="numero">Saldo</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((compra) => (
              <tr key={compra.id} className={compra.estado === 'ANULADO' ? 'baja' : undefined}>
                <td className="fecha">{fecha(compra.fecha)}</td>
                <td>{compra.proveedor}</td>
                <td>{compra.numeroComprobante}</td>
                <td>{compra.condicion === 'CREDITO' ? 'Crédito' : 'Contado'}</td>
                <td className="fecha">{compra.vencimiento ? fecha(compra.vencimiento) : '—'}</td>
                <td className="numero">{dinero(compra.total)}</td>
                <td className="numero">{compra.saldo ? dinero(compra.saldo) : '—'}</td>
                <td>
                  <span className={compra.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{compra.estado}</span>
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void ver(compra)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && compras.length === 0 ? <p className="vacio">Todavía no hay compras cargadas.</p> : null}
      {creando ? (
        <NuevaCompra
          onCerrar={() => setCreando(false)}
          onGuardada={() => {
            setCreando(false)
            void cargar()
          }}
        />
      ) : null}
      {viendo ? (
        <DetalleCompra
          compra={viendo}
          onCerrar={() => setViendo(null)}
          onAnulada={(anulada) => {
            setViendo(anulada)
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

function etiquetaMaterial(material: Material): string {
  return `${material.codigo} · ${material.descripcion}`
}

function totalLinea(linea: Linea): number {
  const unidades = numeroOpcional(linea.cantidad) ?? 0
  const precio = numeroOpcional(linea.precio) ?? 0
  return Math.round(unidades * precio)
}

function calcularTotales(lineas: Linea[]): Totales {
  return sumarTotales(lineas.map((linea) => ({ total: totalLinea(linea), porcentaje: linea.material.porcentajeIva })))
}

function NuevaCompra({ onCerrar, onGuardada }: { onCerrar: () => void; onGuardada: () => void }) {
  const [proveedores, setProveedores] = useState<Tercero[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [lineas, setLineas] = useState<Linea[]>([])
  const [buscar, setBuscar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [siguiente, setSiguiente] = useState(1)
  const [credito, setCredito] = useState(false)
  const [proveedorId, setProveedorId] = useState('')
  const [plazo, setPlazo] = useState('')

  useEffect(() => {
    Promise.all([apiListar<Tercero[]>('/terceros?rol=proveedor'), apiListar<Material[]>('/productos')])
      .then(([listaProveedores, listaMateriales]) => {
        setProveedores(listaProveedores)
        setMateriales(listaMateriales.filter((material) => material.activo))
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudieron leer los datos'))
  }, [])

  function elegir(valor: string) {
    setBuscar(valor)
    const material = materiales.find((item) => etiquetaMaterial(item) === valor)
    if (!material) {
      return
    }
    setLineas((actuales) => [
      ...actuales,
      { clave: siguiente, material, cantidad: '1', precio: mascaraMonto(String(Math.round(material.costo))) },
    ])
    setSiguiente((valorActual) => valorActual + 1)
    setBuscar('')
  }

  function cambiar(clave: number, campo: 'cantidad' | 'precio', valor: string) {
    setLineas((actuales) =>
      actuales.map((linea) =>
        linea.clave === clave ? { ...linea, [campo]: mascaraMonto(valor, campo === 'cantidad' ? 3 : 2) } : linea,
      ),
    )
  }

  function quitar(clave: number) {
    setLineas((actuales) => actuales.filter((linea) => linea.clave !== clave))
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lineas.length === 0) {
      setError('Cargá al menos un material')
      return
    }
    const items = lineas.map((linea) => ({
      productoId: linea.material.id,
      cantidad: numeroOpcional(linea.cantidad),
      precioUnitario: numeroOpcional(linea.precio),
    }))
    if (items.some((item) => !item.cantidad || item.cantidad <= 0)) {
      setError('Todas las cantidades deben ser mayores a cero')
      return
    }
    if (items.some((item) => item.precioUnitario == null)) {
      setError('Indicá el precio de todos los materiales')
      return
    }
    const form = event.currentTarget
    setGuardando(true)
    try {
      await apiCrear('/compras', {
        proveedorId: Number(valorInput(form, 'proveedorId')),
        fecha: valorInput(form, 'fecha'),
        condicion: valorInput(form, 'condicion'),
        plazoDias: credito ? numeroOpcional(plazo) : null,
        numeroComprobante: valorInput(form, 'numeroComprobante'),
        timbradoNumero: textoOpcional(valorInput(form, 'timbradoNumero')),
        observacion: textoOpcional(valorInput(form, 'observacion')),
        actualizarCosto: marcado(form, 'actualizarCosto'),
        items,
      })
      onGuardada()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar la compra')
      setGuardando(false)
    }
  }

  const totales = calcularTotales(lineas)

  return (
    <Dialogo clase="ancho" titulo="Nueva compra" onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla tres">
          <Campo etiqueta="Proveedor">
            <select
              name="proveedorId"
              required
              value={proveedorId}
              onChange={(event) => {
                setProveedorId(event.target.value)
                const proveedor = proveedores.find((item) => String(item.id) === event.target.value)
                setPlazo(proveedor?.plazoDias ? String(proveedor.plazoDias) : '')
              }}
            >
              <option value="" disabled>
                Elegí el proveedor
              </option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.razonSocial}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Fecha">
            <input name="fecha" type="date" required defaultValue={hoy()} max={hoy()} />
          </Campo>
          <Campo etiqueta="Condición">
            <select name="condicion" defaultValue="CONTADO" onChange={(event) => setCredito(event.target.value === 'CREDITO')}>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </Campo>
          {credito ? (
            <Campo etiqueta="Plazo (días)">
              <input
                inputMode="numeric"
                value={plazo}
                maxLength={3}
                placeholder="Sin plazo"
                onChange={(event) => setPlazo(event.target.value.replace(/\D/g, ''))}
              />
            </Campo>
          ) : null}
          <Campo etiqueta="Factura N°">
            <input name="numeroComprobante" required placeholder="001-001-0000001" maxLength={17} />
          </Campo>
          <Campo etiqueta="Timbrado">
            <input name="timbradoNumero" inputMode="numeric" maxLength={20} />
          </Campo>
          <label className="check linea">
            <input name="actualizarCosto" type="checkbox" defaultChecked />
            Actualizar costo de los materiales
          </label>
        </div>
        <div className="grilla bloque">
          <div className="span">
            <Campo etiqueta="Agregar material">
              <input
                list="materiales-compra"
                value={buscar}
                onChange={(event) => elegir(event.target.value)}
                placeholder="Escribí código o descripción y elegí de la lista"
              />
            </Campo>
            <datalist id="materiales-compra">
              {materiales.map((material) => (
                <option key={material.id} value={etiquetaMaterial(material)} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="tabla-contenedor bloque">
          <table className="tabla lineas">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th className="numero">Cantidad</th>
                <th className="numero">Precio unitario</th>
                <th className="numero">IVA</th>
                <th className="numero">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.clave}>
                  <td>{linea.material.codigo}</td>
                  <td>{linea.material.descripcion}</td>
                  <td>
                    <input
                      className="monto"
                      inputMode="decimal"
                      aria-label={`Cantidad de ${linea.material.codigo}`}
                      value={linea.cantidad}
                      onChange={(event) => cambiar(linea.clave, 'cantidad', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="monto"
                      inputMode="decimal"
                      aria-label={`Precio de ${linea.material.codigo}`}
                      value={linea.precio}
                      onChange={(event) => cambiar(linea.clave, 'precio', event.target.value)}
                    />
                  </td>
                  <td className="numero">{dinero(linea.material.porcentajeIva)}%</td>
                  <td className="numero">{dinero(totalLinea(linea))}</td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => quitar(linea.clave)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lineas.length === 0 ? <p className="vacio">Agregá los materiales de la factura.</p> : null}
        <CuadroTotales totales={totales} />
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Observación">
              <textarea name="observacion" rows={2} maxLength={300} />
            </Campo>
          </div>
          <div className="dialogo-acciones">
            <button className="btn" type="button" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn primary" type="submit" disabled={guardando}>
              Confirmar compra
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

function DetalleCompra({
  compra,
  onCerrar,
  onAnulada,
}: {
  compra: Compra
  onCerrar: () => void
  onAnulada: (compra: Compra) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)

  async function anular() {
    if (!window.confirm(`¿Anular la factura ${compra.numeroComprobante}? Se descontará el stock que sumó.`)) {
      return
    }
    setAnulando(true)
    try {
      onAnulada(await apiCrear<Compra>(`/compras/${compra.id}/anular`, {}))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular la compra')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <Dialogo clase="ancho" titulo={`Factura ${compra.numeroComprobante}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla tres">
        <Campo etiqueta="Proveedor">
          <strong>{compra.proveedor}</strong>
        </Campo>
        <Campo etiqueta="RUC">
          <strong>{texto(compra.proveedorDocumento)}</strong>
        </Campo>
        <Campo etiqueta="Fecha">
          <strong>{fecha(compra.fecha)}</strong>
        </Campo>
        <Campo etiqueta="Condición">
          <strong>
            {compra.condicion === 'CREDITO'
              ? `Crédito${compra.plazoDias ? ` ${compra.plazoDias} días` : ''}`
              : 'Contado'}
          </strong>
        </Campo>
        {compra.condicion === 'CREDITO' ? (
          <>
            <Campo etiqueta="Vence">
              <strong>{compra.vencimiento ? fecha(compra.vencimiento) : '—'}</strong>
            </Campo>
            <Campo etiqueta="Saldo a pagar">
              <strong className={compra.saldo > 0 ? 'falta' : undefined}>{dinero(compra.saldo)}</strong>
            </Campo>
          </>
        ) : null}
        <Campo etiqueta="Timbrado">
          <strong>{texto(compra.timbradoNumero)}</strong>
        </Campo>
        <Campo etiqueta="Estado">
          <span className={compra.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{compra.estado}</span>
        </Campo>
      </div>
      <div className="tabla-contenedor bloque">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th className="numero">Cantidad</th>
              <th className="numero">Precio unitario</th>
              <th className="numero">IVA</th>
              <th className="numero">Total</th>
            </tr>
          </thead>
          <tbody>
            {compra.lineas.map((linea, indice) => (
              <tr key={`${linea.codigo}-${indice}`}>
                <td>{texto(linea.codigo)}</td>
                <td>{linea.descripcion}</td>
                <td className="numero">{cantidad(linea.cantidad)}</td>
                <td className="numero">{dinero(linea.precioUnitario)}</td>
                <td className="numero">{dinero(linea.porcentajeIva)}%</td>
                <td className="numero">{dinero(linea.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CuadroTotales totales={totalesDe(compra)} />
      {compra.observacion ? <p className="ayuda">{compra.observacion}</p> : null}
      <div className="dialogo-acciones">
        {compra.estado === 'CONFIRMADO' ? (
          <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
            Anular compra
          </button>
        ) : null}
        <button type="button" className="btn primary" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}

function marcado(form: HTMLFormElement, nombre: string): boolean {
  const campo = form.elements.namedItem(nombre)
  return campo instanceof HTMLInputElement && campo.checked
}
