import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiCrear, apiListar, cantidad, cargarSesion, dinero, fecha, hoy, texto } from '../api/client'
import { confirmar } from '../components/Confirmacion'
import type {
  EntregaPendiente,
  EstadoCuenta,
  Material,
  NotaCredito,
  Obra,
  Presupuesto,
  Remision,
  Tercero,
  Venta,
  VentaOpciones,
} from '../api/types'
import { SeccionCobro, useCobro } from '../components/Cobro'
import { etiquetaCliente, SIN_NOMBRE } from '../components/etiquetas'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { EditorRenglones, useRenglones } from '../components/Renglones'
import { CuadroTotales, totalesDe } from '../components/Totales'
import { Aviso, Barra, Campo, Dialogo, textoOpcional } from '../components/ui'
import { DetalleNotaCredito, NuevaNotaCredito } from './NotasCreditoPage'
import { DetalleRemision, NuevaRemision } from './RemisionesPage'
import { FichaTercero } from './TercerosPage'

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

export function NuevaVenta({
  presupuesto,
  onCerrar,
  onGuardada,
}: {
  presupuesto?: Presupuesto
  onCerrar: () => void
  onGuardada: (venta: Venta) => void
}) {
  const [opciones, setOpciones] = useState<VentaOpciones | null>(null)
  const [clientes, setClientes] = useState<Tercero[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [puntoId, setPuntoId] = useState('')
  const [condicion, setCondicion] = useState<'CONTADO' | 'CREDITO'>(presupuesto?.condicion ?? 'CONTADO')
  const [lista, setLista] = useState(presupuesto?.listaPrecio ?? 'MINORISTA')
  const [clienteTexto, setClienteTexto] = useState('')
  const [obraId, setObraId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null)
  const [altaCliente, setAltaCliente] = useState(false)
  const renglones = useRenglones()
  const totales = renglones.totales
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
        const activos = listaMateriales.filter((material) => material.activo)
        setMateriales(activos)
        if (presupuesto) {
          const faltantes = renglones.cargar(presupuesto.lineas, activos)
          if (faltantes > 0) {
            setError(`${faltantes} material(es) del presupuesto están de baja y no se cargaron`)
          }
          const elegido = listaClientes.find((item) => item.id === presupuesto.clienteId)
          if (elegido) {
            setClienteTexto(etiquetaCliente(elegido))
          }
        }
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
          if (presupuesto?.obraId && presupuesto.clienteId === clienteId && lista.some((obra) => obra.id === presupuesto.obraId)) {
            setObraId(String(presupuesto.obraId))
          }
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

  function clienteCreado(nuevo: Tercero) {
    setClientes((actuales) =>
      [...actuales.filter((item) => item.id !== nuevo.id), nuevo].sort((a, b) =>
        a.razonSocial.localeCompare(b.razonSocial, 'es'),
      ),
    )
    setClienteTexto(etiquetaCliente(nuevo))
    setAltaCliente(false)
    setError(null)
  }

  function cambiarLista(codigo: string) {
    setLista(codigo)
    renglones.repreciar(codigo)
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
    const problemaRenglones = renglones.validar()
    if (problemaRenglones) {
      setError(problemaRenglones)
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
      !(await confirmar({
        titulo: 'Emitir factura',
        mensaje: `¿Emitir la factura ${punto?.proximoComprobante ?? ''} por Gs. ${dinero(totales.total)} a ${cliente?.razonSocial ?? SIN_NOMBRE}?`,
        aceptar: 'Emitir factura',
      }))
    ) {
      return
    }
    setGuardando(true)
    try {
      const venta = await apiCrear<Venta>('/ventas', {
        clienteId,
        obraId: obraId ? Number(obraId) : null,
        presupuestoId: presupuesto?.id ?? null,
        puntoExpedicionId: Number(puntoId),
        fecha: (form.elements.namedItem('fecha') as HTMLInputElement).value,
        condicion,
        listaPrecio: lista,
        observacion: textoOpcional((form.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()),
        plazoDias,
        notaRemision: textoOpcional((form.elements.namedItem('notaRemision') as HTMLInputElement).value.trim()),
        items: renglones.items(),
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
    <Dialogo
      clase="ancho"
      titulo={presupuesto ? `Facturar presupuesto ${presupuesto.numero}` : 'Nueva factura'}
      onCerrar={onCerrar}
    >
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
          <div className="campo-con-accion">
            <Campo etiqueta="Cliente">
              <input
                list="clientes-venta"
                value={clienteTexto}
                onChange={(event) => setClienteTexto(event.target.value)}
                placeholder="Vacío = SIN NOMBRE"
              />
            </Campo>
            <button type="button" className="btn" title="Registrar un cliente nuevo" onClick={() => setAltaCliente(true)}>
              Nuevo
            </button>
          </div>
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
                defaultValue={presupuesto?.plazoDias ?? undefined}
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
        <EditorRenglones
          estado={renglones}
          materiales={materiales}
          lista={lista}
          avisarStock="Hay líneas que superan el stock registrado. Se puede facturar igual y el stock queda en negativo."
        />
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
      {altaCliente ? (
        <FichaTercero rol="cliente" tercero={null} onCerrar={() => setAltaCliente(false)} onGuardado={clienteCreado} />
      ) : null}
    </Dialogo>
  )
}

export function DetalleVenta({
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
  const [remisiones, setRemisiones] = useState<Remision[]>([])
  const [pendientes, setPendientes] = useState<EntregaPendiente[]>([])
  const [remitiendo, setRemitiendo] = useState(false)
  const [remision, setRemision] = useState<Remision | null>(null)
  const [notas, setNotas] = useState<NotaCredito[]>([])
  const [acreditando, setAcreditando] = useState(false)
  const [nota, setNota] = useState<NotaCredito | null>(null)
  const esAdmin = cargarSesion()?.roles.includes('ADMIN') ?? false

  async function cargarEntregas() {
    try {
      const [lista, faltan, creditos] = await Promise.all([
        apiListar<Remision[]>(`/remisiones/factura/${venta.id}`),
        apiListar<EntregaPendiente[]>(`/remisiones/factura/${venta.id}/pendiente`),
        apiListar<NotaCredito[]>(`/notas-credito/factura/${venta.id}`),
      ])
      setRemisiones(lista)
      setPendientes(faltan)
      setNotas(creditos)
    } catch {
      setRemisiones([])
      setPendientes([])
      setNotas([])
    }
  }

  async function verNota(id: number) {
    try {
      setNota(await apiListar<NotaCredito>(`/notas-credito/${id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la nota de crédito')
    }
  }

  const acreditado = notas.filter((item) => item.estado === 'CONFIRMADO').reduce((suma, item) => suma + item.total, 0)

  useEffect(() => {
    void cargarEntregas()
  }, [venta.id])

  async function verRemision(id: number) {
    try {
      setRemision(await apiListar<Remision>(`/remisiones/${id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la nota de remisión')
    }
  }

  const porEntregar = pendientes.filter((entrega) => entrega.pendiente > 0)

  async function imprimir() {
    try {
      await apiAbrir(`/ventas/${venta.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  async function anular() {
    if (
      !(await confirmar({
        titulo: 'Anular factura',
        mensaje: `¿Anular la factura ${venta.numeroComprobante}? El stock vuelve al depósito, lo cobrado sale de la caja como egreso y el número queda usado. Recordá anular también el talonario físico.`,
        aceptar: 'Anular factura',
        peligro: true,
      }))
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
    <>
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
          <Campo etiqueta="Presupuesto">
            <strong>{texto(venta.presupuestoNumero)}</strong>
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
        {remisiones.length > 0 ? (
          <>
            <h3 className="bloque">Notas de remisión</h3>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th className="fecha">Fecha</th>
                    <th>Número</th>
                    <th>Llegada</th>
                    <th>Chapa</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {remisiones.map((item) => (
                    <tr key={item.id} className={item.estado === 'ANULADO' ? 'baja' : undefined}>
                      <td className="fecha">{fecha(item.fecha)}</td>
                      <td>{item.numeroComprobante}</td>
                      <td>{item.puntoLlegada}</td>
                      <td>{item.vehiculoChapa}</td>
                      <td>
                        <span className={item.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{item.estado}</span>
                      </td>
                      <td className="acciones">
                        <button type="button" className="btn ghost" onClick={() => void verRemision(item.id)}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ayuda">
              {porEntregar.length === 0
                ? 'Toda la mercadería facturada ya tiene nota de remisión.'
                : `Falta remitir: ${porEntregar.map((entrega) => `${entrega.codigo} ${cantidad(entrega.pendiente)}`).join(' · ')}`}
            </p>
          </>
        ) : null}
        {notas.length > 0 ? (
          <>
            <h3 className="bloque">Notas de crédito</h3>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th className="fecha">Fecha</th>
                    <th>Número</th>
                    <th className="numero">Total</th>
                    <th className="numero">Devuelto en caja</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {notas.map((item) => (
                    <tr key={item.id} className={item.estado === 'ANULADO' ? 'baja' : undefined}>
                      <td className="fecha">{fecha(item.fecha)}</td>
                      <td>{item.numeroComprobante}</td>
                      <td className="numero">{dinero(item.total)}</td>
                      <td className="numero">{item.reintegro ? dinero(item.reintegro) : '—'}</td>
                      <td>
                        <span className={item.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{item.estado}</span>
                      </td>
                      <td className="acciones">
                        <button type="button" className="btn ghost" onClick={() => void verNota(item.id)}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        <div className="dialogo-acciones">
          {esAdmin && venta.estado === 'CONFIRMADO' ? (
            <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
              Anular factura
            </button>
          ) : null}
          {venta.estado === 'CONFIRMADO' && porEntregar.length > 0 ? (
            <button type="button" className="btn" onClick={() => setRemitiendo(true)}>
              Nota de remisión
            </button>
          ) : null}
          {venta.estado === 'CONFIRMADO' && acreditado < venta.total ? (
            <button type="button" className="btn" onClick={() => setAcreditando(true)}>
              Nota de crédito
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
      {remitiendo ? (
        <NuevaRemision
          factura={venta}
          onCerrar={() => setRemitiendo(false)}
          onGuardada={(nueva) => {
            setRemitiendo(false)
            setRemision(nueva)
            void cargarEntregas()
          }}
        />
      ) : null}
      {remision ? (
        <DetalleRemision
          remision={remision}
          onCerrar={() => setRemision(null)}
          onAnulada={(anulada) => {
            setRemision(anulada)
            void cargarEntregas()
          }}
        />
      ) : null}
      {acreditando ? (
        <NuevaNotaCredito
          facturaId={venta.id}
          onCerrar={() => setAcreditando(false)}
          onGuardada={(nueva) => {
            setAcreditando(false)
            setNota(nueva)
            void cargarEntregas()
          }}
        />
      ) : null}
      {nota ? (
        <DetalleNotaCredito
          nota={nota}
          onCerrar={() => setNota(null)}
          onAnulada={(anulada) => {
            setNota(anulada)
            void cargarEntregas()
          }}
        />
      ) : null}
    </>
  )
}
