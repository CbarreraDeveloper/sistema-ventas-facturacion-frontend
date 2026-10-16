import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiCrear, apiListar, cantidad, cargarSesion, dinero, fecha, hoy, texto } from '../api/client'
import type { EstadoCuenta, Material, Obra, Tercero, Venta, VentaOpciones } from '../api/types'
import { SeccionCobro, useCobro } from '../components/Cobro'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { CuadroTotales, sumarTotales, totalesDe } from '../components/Totales'
import { Aviso, Barra, Campo, Dialogo, mascaraMonto, numeroOpcional, textoOpcional } from '../components/ui'

type Linea = {
  clave: number
  material: Material
  cantidad: string
  precio: string
  descuento: string
}

const SIN_NOMBRE = 'SIN NOMBRE'

export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [creando, setCreando] = useState(false)
  const [viendo, setViendo] = useState<Venta | null>(null)

  async function cargar() {
    try {
      setVentas(await apiListar<Venta[]>('/ventas'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las facturas')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function ver(venta: Venta) {
    try {
      setViendo(await apiListar<Venta>(`/ventas/${venta.id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la factura')
    }
  }

  async function imprimir(venta: Venta) {
    try {
      await apiAbrir(`/ventas/${venta.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  const paginacion = usePaginacion(ventas)

  return (
    <section>
      <Barra kicker="Comercial" titulo="Ventas" detalle="Facturas emitidas. Al confirmar descuentan stock del depósito principal.">
        <button type="button" className="btn primary" onClick={() => setCreando(true)}>
          Nueva factura
        </button>
      </Barra>
      <Aviso mensaje={error} />
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th className="fecha">Fecha</th>
              <th>Factura</th>
              <th>Cliente</th>
              <th>Condición</th>
              <th className="numero">Total</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((venta) => (
              <tr key={venta.id} className={venta.estado === 'ANULADO' ? 'baja' : undefined}>
                <td className="fecha">{fecha(venta.fecha)}</td>
                <td>{venta.numeroComprobante}</td>
                <td>{venta.cliente}</td>
                <td>{venta.condicion === 'CREDITO' ? 'Crédito' : 'Contado'}</td>
                <td className="numero">{dinero(venta.total)}</td>
                <td>
                  <span className={venta.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{venta.estado}</span>
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void ver(venta)}>
                    Ver
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void imprimir(venta)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && ventas.length === 0 ? <p className="vacio">Todavía no hay facturas emitidas.</p> : null}
      {creando ? (
        <NuevaVenta
          onCerrar={() => setCreando(false)}
          onGuardada={(venta) => {
            setCreando(false)
            setViendo(venta)
            void cargar()
          }}
        />
      ) : null}
      {viendo ? (
        <DetalleVenta
          venta={viendo}
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

function etiquetaCliente(cliente: Tercero): string {
  if (!cliente.documento) {
    return cliente.razonSocial
  }
  const documento = cliente.digitoVerificador ? `${cliente.documento}-${cliente.digitoVerificador}` : cliente.documento
  return `${cliente.razonSocial} · ${documento}`
}

function precioDeLista(material: Material, lista: string): number {
  const minorista = material.precioMinorista ?? 0
  if (lista === 'MAYORISTA') {
    return material.precioMayorista ?? minorista
  }
  if (lista === 'ESPECIAL') {
    return material.precioEspecial ?? minorista
  }
  return minorista
}

function totalLinea(linea: Linea): number {
  const unidades = numeroOpcional(linea.cantidad) ?? 0
  const precio = numeroOpcional(linea.precio) ?? 0
  const descuento = numeroOpcional(linea.descuento) ?? 0
  return Math.round(unidades * precio) - Math.round(descuento)
}

function faltaStock(linea: Linea): boolean {
  return linea.material.controlaStock && (numeroOpcional(linea.cantidad) ?? 0) > linea.material.existencia
}

function NuevaVenta({ onCerrar, onGuardada }: { onCerrar: () => void; onGuardada: (venta: Venta) => void }) {
  const [opciones, setOpciones] = useState<VentaOpciones | null>(null)
  const [clientes, setClientes] = useState<Tercero[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [puntoId, setPuntoId] = useState('')
  const [condicion, setCondicion] = useState<'CONTADO' | 'CREDITO'>('CONTADO')
  const [lista, setLista] = useState('MINORISTA')
  const [clienteTexto, setClienteTexto] = useState('')
  const [obraId, setObraId] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [buscar, setBuscar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [siguiente, setSiguiente] = useState(1)
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null)
  const totales = sumarTotales(lineas.map((linea) => ({ total: totalLinea(linea), porcentaje: linea.material.porcentajeIva })))
  const cobro = useCobro(totales.total, opciones?.medios ?? [])

  useEffect(() => {
    Promise.all([
      apiListar<VentaOpciones>('/ventas/opciones'),
      apiListar<Tercero[]>('/terceros?rol=cliente'),
      apiListar<Material[]>('/productos'),
    ])
      .then(([datos, listaClientes, listaMateriales]) => {
        setOpciones(datos)
        setPuntoId(datos.puntos[0] ? String(datos.puntos[0].puntoExpedicionId) : '')
        setClientes(listaClientes)
        setMateriales(listaMateriales.filter((material) => material.activo))
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudieron leer los datos'))
  }, [])

  const textoCliente = clienteTexto.trim()
  const cliente = clientes.find((item) => etiquetaCliente(item) === textoCliente) ?? null
  const sinNombre = textoCliente === '' || textoCliente === SIN_NOMBRE
  const clienteId = cliente?.id ?? null

  useEffect(() => {
    setObraId('')
    setObras([])
    setCuenta(null)
    if (clienteId === null) {
      return
    }
    let vigente = true
    apiListar<Obra[]>(`/terceros/${clienteId}/obras`)
      .then((lista) => {
        if (vigente) {
          setObras(lista)
        }
      })
      .catch(() => undefined)
    apiListar<EstadoCuenta>(`/cuentas/clientes/${clienteId}`)
      .then((estado) => {
        if (vigente) {
          setCuenta(estado)
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [clienteId])

  function elegir(valor: string) {
    setBuscar(valor)
    const material = materiales.find((item) => etiquetaMaterial(item) === valor)
    if (!material) {
      return
    }
    setLineas((actuales) => {
      const existente = actuales.find((linea) => linea.material.id === material.id)
      if (existente) {
        const sumada = (numeroOpcional(existente.cantidad) ?? 0) + 1
        return actuales.map((linea) =>
          linea.clave === existente.clave ? { ...linea, cantidad: mascaraMonto(String(sumada).replace('.', ','), 3) } : linea,
        )
      }
      return [
        ...actuales,
        {
          clave: siguiente,
          material,
          cantidad: '1',
          precio: mascaraMonto(String(Math.round(precioDeLista(material, lista)))),
          descuento: '',
        },
      ]
    })
    setSiguiente((valorActual) => valorActual + 1)
    setBuscar('')
  }

  function cambiarLista(codigo: string) {
    setLista(codigo)
    setLineas((actuales) =>
      actuales.map((linea) => ({
        ...linea,
        precio: mascaraMonto(String(Math.round(precioDeLista(linea.material, codigo)))),
      })),
    )
  }

  function cambiar(clave: number, campo: 'cantidad' | 'precio' | 'descuento', valor: string) {
    setLineas((actuales) =>
      actuales.map((linea) =>
        linea.clave === clave ? { ...linea, [campo]: mascaraMonto(valor, campo === 'cantidad' ? 3 : 0) } : linea,
      ),
    )
  }

  function quitar(clave: number) {
    setLineas((actuales) => actuales.filter((linea) => linea.clave !== clave))
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sinNombre && !cliente) {
      setError('Elegí el cliente de la lista o dejalo vacío para facturar sin nombre')
      return
    }
    if (condicion === 'CREDITO' && !cliente) {
      setError('Una venta a crédito necesita un cliente')
      return
    }
    if (lineas.length === 0) {
      setError('Cargá al menos un material')
      return
    }
    const items = lineas.map((linea) => ({
      productoId: linea.material.id,
      cantidad: numeroOpcional(linea.cantidad),
      precioUnitario: numeroOpcional(linea.precio),
      descuento: numeroOpcional(linea.descuento),
    }))
    if (items.some((item) => !item.cantidad || item.cantidad <= 0)) {
      setError('Todas las cantidades deben ser mayores a cero')
      return
    }
    if (items.some((item) => !item.precioUnitario || item.precioUnitario <= 0)) {
      setError('Hay materiales sin precio. Cargalo en la línea o en Materiales')
      return
    }
    if (lineas.some((linea) => totalLinea(linea) < 0)) {
      setError('Hay un descuento mayor que el importe de su línea')
      return
    }
    if (condicion === 'CONTADO') {
      const problema = cobro.validar()
      if (problema) {
        setError(problema)
        return
      }
    }
    const pagos = condicion === 'CONTADO' ? cobro.pagos() : []
    const form = event.currentTarget
    const plazoTexto = (form.elements.namedItem('plazoDias') as HTMLInputElement | null)?.value.trim() ?? ''
    const plazoDias = condicion === 'CREDITO' && plazoTexto ? Number(plazoTexto) : null
    if (plazoDias !== null && (!Number.isInteger(plazoDias) || plazoDias < 1 || plazoDias > 365)) {
      setError('El plazo del crédito debe ser un número de días entre 1 y 365')
      return
    }
    const punto = opciones?.puntos.find((item) => String(item.puntoExpedicionId) === puntoId)
    if (
      !window.confirm(
        `¿Emitir la factura ${punto?.proximoComprobante ?? ''} por Gs. ${dinero(totales.total)} a ${cliente?.razonSocial ?? SIN_NOMBRE}?`,
      )
    ) {
      return
    }
    setGuardando(true)
    try {
      const venta = await apiCrear<Venta>('/ventas', {
        clienteId,
        obraId: obraId ? Number(obraId) : null,
        puntoExpedicionId: Number(puntoId),
        fecha: (form.elements.namedItem('fecha') as HTMLInputElement).value,
        condicion,
        listaPrecio: lista,
        observacion: textoOpcional((form.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()),
        plazoDias,
        notaRemision: textoOpcional((form.elements.namedItem('notaRemision') as HTMLInputElement).value.trim()),
        items,
        pagos,
      })
      onGuardada(venta)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo emitir la factura')
      setGuardando(false)
    }
  }

  const puntoElegido = opciones?.puntos.find((item) => String(item.puntoExpedicionId) === puntoId)
  const excedeLimite =
    condicion === 'CREDITO' && cuenta?.limiteCredito ? cuenta.saldo + totales.total > cuenta.limiteCredito : false
  const bloqueo = !opciones
    ? null
    : !opciones.empresaConfigurada
      ? 'Antes de facturar hay que cargar los datos de la empresa (menú Empresa).'
      : opciones.puntos.length === 0
        ? 'No hay un timbrado de factura vigente con números disponibles. Cargalo en Empresa › Timbrados.'
        : condicion === 'CONTADO' && !opciones.cajaAbierta
          ? 'Para facturar al contado tenés que abrir tu caja (menú Caja). A crédito se puede facturar igual.'
          : null

  return (
    <Dialogo clase="ancho" titulo="Nueva factura" onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error ?? bloqueo} />
        <div className="grilla tres">
          <Campo etiqueta="Punto de expedición">
            <select value={puntoId} onChange={(event) => setPuntoId(event.target.value)} required>
              {opciones?.puntos.map((punto) => (
                <option key={punto.puntoExpedicionId} value={punto.puntoExpedicionId}>
                  {punto.codigo} · {punto.descripcion}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Factura N°">
            <strong className="proximo">{puntoElegido?.proximoComprobante ?? '—'}</strong>
          </Campo>
          <Campo etiqueta="Fecha">
            <input name="fecha" type="date" required defaultValue={hoy()} max={hoy()} />
          </Campo>
          <Campo etiqueta="Cliente">
            <input
              list="clientes-venta"
              value={clienteTexto}
              onChange={(event) => setClienteTexto(event.target.value)}
              placeholder="Vacío = SIN NOMBRE"
            />
          </Campo>
          <datalist id="clientes-venta">
            <option value={SIN_NOMBRE} />
            {clientes.map((item) => (
              <option key={item.id} value={etiquetaCliente(item)} />
            ))}
          </datalist>
          <Campo etiqueta="Obra">
            <select value={obraId} onChange={(event) => setObraId(event.target.value)} disabled={obras.length === 0}>
              <option value="">{obras.length === 0 ? 'Sin obras' : 'Sin obra'}</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Condición">
            <select value={condicion} onChange={(event) => setCondicion(event.target.value as 'CONTADO' | 'CREDITO')}>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </Campo>
          <Campo etiqueta="Lista de precios">
            <select value={lista} onChange={(event) => cambiarLista(event.target.value)}>
              {opciones?.listas.map((item) => (
                <option key={item.id} value={item.codigo ?? ''}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </Campo>
          {condicion === 'CREDITO' ? (
            <Campo etiqueta="Plazo del crédito (días)">
              <input
                name="plazoDias"
                inputMode="numeric"
                maxLength={3}
                placeholder={cliente?.plazoDias ? `${cliente.plazoDias} (del cliente)` : 'Ej.: 30'}
              />
            </Campo>
          ) : null}
          <Campo etiqueta="Nota de remisión N°">
            <input name="notaRemision" maxLength={30} />
          </Campo>
        </div>
        {condicion === 'CREDITO' && cuenta ? (
          <p className={excedeLimite || cuenta.vencido > 0 ? 'ayuda falta' : 'ayuda'}>
            Cuenta del cliente: debe Gs. {dinero(cuenta.saldo)}
            {cuenta.vencido > 0 ? `, de los cuales Gs. ${dinero(cuenta.vencido)} están vencidos` : ''}.
            {cuenta.limiteCredito ? ` Límite de crédito Gs. ${dinero(cuenta.limiteCredito)}.` : ' Sin límite de crédito.'}
            {excedeLimite ? ' Con esta factura supera el límite y no se va a poder emitir.' : ''}
          </p>
        ) : null}
        {puntoElegido ? (
          <p className="ayuda">
            Timbrado {puntoElegido.timbrado}, vigente hasta {fecha(puntoElegido.vigenteHasta)}. Quedan {puntoElegido.disponibles} números.
          </p>
        ) : null}
        <div className="grilla bloque">
          <div className="span">
            <Campo etiqueta="Agregar material">
              <input
                list="materiales-venta"
                value={buscar}
                onChange={(event) => elegir(event.target.value)}
                placeholder="Escribí código o descripción y elegí de la lista"
              />
            </Campo>
            <datalist id="materiales-venta">
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
                <th className="numero">Stock</th>
                <th className="numero">Cantidad</th>
                <th className="numero">Precio unitario</th>
                <th className="numero">Descuento</th>
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
                  <td className={faltaStock(linea) ? 'numero falta' : 'numero'}>
                    {linea.material.controlaStock ? cantidad(linea.material.existencia) : '—'}
                  </td>
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
                      inputMode="numeric"
                      aria-label={`Precio de ${linea.material.codigo}`}
                      value={linea.precio}
                      onChange={(event) => cambiar(linea.clave, 'precio', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="monto"
                      inputMode="numeric"
                      aria-label={`Descuento de ${linea.material.codigo}`}
                      value={linea.descuento}
                      onChange={(event) => cambiar(linea.clave, 'descuento', event.target.value)}
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
        {lineas.length === 0 ? <p className="vacio">Agregá los materiales a facturar.</p> : null}
        {lineas.some(faltaStock) ? (
          <p className="ayuda">Hay líneas que superan el stock registrado. Se puede facturar igual y el stock queda en negativo.</p>
        ) : null}
        <CuadroTotales totales={totales} />
        {condicion === 'CONTADO' && opciones?.cajaAbierta ? (
          <SeccionCobro cobro={cobro} detalle="El efectivo es lo que falta para completar el total después de los otros medios." />
        ) : null}
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
            <button className="btn primary" type="submit" disabled={guardando || !opciones || bloqueo !== null || excedeLimite}>
              Emitir factura
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

function DetalleVenta({
  venta,
  onCerrar,
  onAnulada,
}: {
  venta: Venta
  onCerrar: () => void
  onAnulada: (venta: Venta) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)
  const esAdmin = cargarSesion()?.roles.includes('ADMIN') ?? false

  async function imprimir() {
    try {
      await apiAbrir(`/ventas/${venta.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  async function anular() {
    if (
      !window.confirm(
        `¿Anular la factura ${venta.numeroComprobante}? El stock vuelve al depósito, lo cobrado sale de la caja como egreso y el número queda usado. Recordá anular también el talonario físico.`,
      )
    ) {
      return
    }
    setAnulando(true)
    try {
      onAnulada(await apiCrear<Venta>(`/ventas/${venta.id}/anular`, {}))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular la factura')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <Dialogo clase="ancho" titulo={`Factura ${venta.numeroComprobante}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla tres">
        <Campo etiqueta="Cliente">
          <strong>{venta.cliente}</strong>
        </Campo>
        <Campo etiqueta="RUC / CI">
          <strong>{texto(venta.clienteDocumento)}</strong>
        </Campo>
        <Campo etiqueta="Fecha">
          <strong>{fecha(venta.fecha)}</strong>
        </Campo>
        <Campo etiqueta="Condición">
          <strong>
            {venta.condicion === 'CREDITO' ? `Crédito${venta.plazoDias ? ` a ${venta.plazoDias} días` : ''}` : 'Contado'}
          </strong>
        </Campo>
        <Campo etiqueta="Nota de remisión">
          <strong>{texto(venta.notaRemision)}</strong>
        </Campo>
        <Campo etiqueta="Obra">
          <strong>{texto(venta.obra)}</strong>
        </Campo>
        <Campo etiqueta="Timbrado">
          <strong>{venta.timbradoNumero}</strong>
        </Campo>
        <Campo etiqueta="Lista de precios">
          <strong>{texto(venta.listaPrecio)}</strong>
        </Campo>
        <Campo etiqueta="Emitida por">
          <strong>{texto(venta.usuario)}</strong>
        </Campo>
        <Campo etiqueta="Estado">
          <span className={venta.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{venta.estado}</span>
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
              <th className="numero">Descuento</th>
              <th className="numero">IVA</th>
              <th className="numero">Total</th>
            </tr>
          </thead>
          <tbody>
            {venta.lineas.map((linea, indice) => (
              <tr key={`${linea.codigo}-${indice}`}>
                <td>{texto(linea.codigo)}</td>
                <td>{linea.descripcion}</td>
                <td className="numero">{cantidad(linea.cantidad)}</td>
                <td className="numero">{dinero(linea.precioUnitario)}</td>
                <td className="numero">{linea.descuento ? dinero(linea.descuento) : '—'}</td>
                <td className="numero">{dinero(linea.porcentajeIva)}%</td>
                <td className="numero">{dinero(linea.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CuadroTotales totales={totalesDe(venta)} />
      {venta.pagos.length > 0 ? (
        <p className="ayuda">
          Cobrado:{' '}
          {venta.pagos
            .map((pago) => `${pago.medio} Gs. ${dinero(pago.monto)}${pago.referencia ? ` (${pago.referencia})` : ''}`)
            .join(' · ')}
        </p>
      ) : null}
      {venta.observacion ? <p className="ayuda">{venta.observacion}</p> : null}
      <div className="dialogo-acciones">
        {esAdmin && venta.estado === 'CONFIRMADO' ? (
          <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
            Anular factura
          </button>
        ) : null}
        <button type="button" className="btn" onClick={() => void imprimir()}>
          Imprimir PDF
        </button>
        <button type="button" className="btn primary" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}
