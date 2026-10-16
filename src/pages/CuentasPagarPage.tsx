import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiCrear, apiListar, cargarSesion, dinero, fecha, texto } from '../api/client'
import type { CajaSesion, EstadoProveedor, OpcionCatalogo, OrdenPago, SaldoProveedor, Tercero } from '../api/types'
import { SeccionCobro, useCobro } from '../components/Cobro'
import { etiquetaCliente } from '../components/etiquetas'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, mascaraMonto, numeroOpcional, textoOpcional } from '../components/ui'

function claseAtraso(dias: number): string {
  return dias > 0 ? 'numero falta' : 'numero'
}

export function CuentasPagarPage() {
  const [saldos, setSaldos] = useState<SaldoProveedor[]>([])
  const [ordenes, setOrdenes] = useState<OrdenPago[]>([])
  const [proveedores, setProveedores] = useState<Tercero[]>([])
  const [buscar, setBuscar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [cuenta, setCuenta] = useState<EstadoProveedor | null>(null)
  const [pagando, setPagando] = useState<EstadoProveedor | null>(null)
  const [orden, setOrden] = useState<OrdenPago | null>(null)

  async function cargar() {
    try {
      const [listaSaldos, listaOrdenes, listaProveedores] = await Promise.all([
        apiListar<SaldoProveedor[]>('/cuentas/proveedores'),
        apiListar<OrdenPago[]>('/ordenes-pago'),
        apiListar<Tercero[]>('/terceros?rol=proveedor'),
      ])
      setSaldos(listaSaldos)
      setOrdenes(listaOrdenes)
      setProveedores(listaProveedores)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las cuentas a pagar')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function abrirCuenta(proveedorId: number, pagar = false) {
    try {
      const estado = await apiListar<EstadoProveedor>(`/cuentas/proveedores/${proveedorId}`)
      if (pagar) {
        setPagando(estado)
      } else {
        setCuenta(estado)
      }
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer la cuenta del proveedor')
    }
  }

  async function verOrden(id: number) {
    try {
      setOrden(await apiListar<OrdenPago>(`/ordenes-pago/${id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la orden de pago')
    }
  }

  async function imprimir(id: number) {
    try {
      await apiAbrir(`/ordenes-pago/${id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  function elegirProveedor(valor: string) {
    setBuscar(valor)
    const proveedor = proveedores.find((item) => etiquetaCliente(item) === valor)
    if (proveedor) {
      setBuscar('')
      void abrirCuenta(proveedor.id)
    }
  }

  const totalSaldo = saldos.reduce((suma, item) => suma + item.saldo, 0)
  const totalVencido = saldos.reduce((suma, item) => suma + item.vencido, 0)
  const paginacion = usePaginacion(ordenes)

  return (
    <section>
      <Barra kicker="Tesorería" titulo="Cuentas a pagar" detalle="Saldos con proveedores por compras a crédito, pagos con orden de pago y estado de cuenta.">
        <label className="campo busqueda">
          <span>Ver cuenta de un proveedor</span>
          <input
            list="proveedores-cuenta"
            value={buscar}
            onChange={(event) => elegirProveedor(event.target.value)}
            placeholder="Nombre o RUC"
          />
        </label>
        <datalist id="proveedores-cuenta">
          {proveedores.map((item) => (
            <option key={item.id} value={etiquetaCliente(item)} />
          ))}
        </datalist>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Proveedores con saldo</span>
          <strong>{saldos.length}</strong>
        </div>
        <div>
          <span>Facturas pendientes</span>
          <strong>{saldos.reduce((suma, item) => suma + item.compras, 0)}</strong>
        </div>
        <div>
          <span>Vencido</span>
          <strong className={totalVencido > 0 ? 'falta' : undefined}>{dinero(totalVencido)}</strong>
        </div>
        <div className="total">
          <span>Total a pagar</span>
          <strong>{dinero(totalSaldo)}</strong>
        </div>
      </div>

      <div className="tabla-contenedor bloque">
        <table className="tabla">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>RUC</th>
              <th className="numero">Facturas</th>
              <th className="numero">Saldo</th>
              <th className="numero">Vencido</th>
              <th className="numero">Días de atraso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {saldos.map((item) => (
              <tr key={item.proveedorId}>
                <td>{item.proveedor}</td>
                <td>{texto(item.documento)}</td>
                <td className="numero">{item.compras}</td>
                <td className="numero">{dinero(item.saldo)}</td>
                <td className={claseAtraso(item.vencido)}>{item.vencido ? dinero(item.vencido) : '—'}</td>
                <td className={claseAtraso(item.diasAtraso)}>{item.diasAtraso || '—'}</td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void abrirCuenta(item.proveedorId)}>
                    Ver cuenta
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void abrirCuenta(item.proveedorId, true)}>
                    Pagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listo && saldos.length === 0 ? <p className="vacio">No hay compras a crédito pendientes de pago.</p> : null}

      <div className="seccion">
        <div className="seccion-cabecera">
          <div>
            <h3>Órdenes de pago</h3>
            <p>Cada orden cancela total o parcialmente compras a crédito y sale de la caja de quien paga.</p>
          </div>
        </div>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th className="fecha">Fecha</th>
                <th>Orden</th>
                <th>Proveedor</th>
                <th className="numero">Total</th>
                <th>Pagó</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginacion.filas.map((item) => (
                <tr key={item.id} className={item.estado === 'ANULADO' ? 'baja' : undefined}>
                  <td className="fecha">{fecha(item.fecha)}</td>
                  <td>{item.numero}</td>
                  <td>{item.proveedor}</td>
                  <td className="numero">{dinero(item.total)}</td>
                  <td>{texto(item.usuario)}</td>
                  <td>
                    <span className={item.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{item.estado}</span>
                  </td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => void verOrden(item.id)}>
                      Ver
                    </button>
                    <button type="button" className="btn ghost" onClick={() => void imprimir(item.id)}>
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ControlPaginacion paginacion={paginacion} />
        {listo && ordenes.length === 0 ? <p className="vacio">Todavía no se emitió ninguna orden de pago.</p> : null}
      </div>

      {cuenta ? (
        <DetalleCuenta
          cuenta={cuenta}
          onCerrar={() => setCuenta(null)}
          onPagar={() => {
            setPagando(cuenta)
            setCuenta(null)
          }}
          onOrden={(id) => void verOrden(id)}
        />
      ) : null}
      {pagando ? (
        <NuevaOrden
          cuenta={pagando}
          onCerrar={() => setPagando(null)}
          onGuardada={(nueva) => {
            setPagando(null)
            setOrden(nueva)
            void cargar()
          }}
        />
      ) : null}
      {orden ? (
        <DetalleOrden
          orden={orden}
          onCerrar={() => setOrden(null)}
          onAnulada={(anulada) => {
            setOrden(anulada)
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

function DetalleCuenta({
  cuenta,
  onCerrar,
  onPagar,
  onOrden,
}: {
  cuenta: EstadoProveedor
  onCerrar: () => void
  onPagar: () => void
  onOrden: (id: number) => void
}) {
  return (
    <Dialogo clase="ancho" titulo={`Cuenta con ${cuenta.proveedor}`} onCerrar={onCerrar}>
      <p className="ayuda">
        RUC {texto(cuenta.documento)} · Teléfono {texto(cuenta.telefono)} · Plazo habitual{' '}
        {cuenta.plazoDias ? `${cuenta.plazoDias} días` : 'sin definir'}
      </p>
      <div className="totales">
        <div>
          <span>Vencido</span>
          <strong className={cuenta.vencido > 0 ? 'falta' : undefined}>{dinero(cuenta.vencido)}</strong>
        </div>
        <div className="total">
          <span>Saldo a pagar</span>
          <strong>{dinero(cuenta.saldo)}</strong>
        </div>
      </div>

      <h3 className="bloque">Facturas pendientes</h3>
      <div className="tabla-contenedor">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Factura</th>
              <th className="fecha">Fecha</th>
              <th className="fecha">Vence</th>
              <th className="numero">Total</th>
              <th className="numero">Pagado</th>
              <th className="numero">Saldo</th>
              <th className="numero">Atraso</th>
            </tr>
          </thead>
          <tbody>
            {cuenta.pendientes.map((compra) => (
              <tr key={compra.id}>
                <td>{compra.numeroComprobante}</td>
                <td className="fecha">{fecha(compra.fecha)}</td>
                <td className="fecha">{fecha(compra.vencimiento)}</td>
                <td className="numero">{dinero(compra.total)}</td>
                <td className="numero">{compra.pagado ? dinero(compra.pagado) : '—'}</td>
                <td className="numero">{dinero(compra.saldo)}</td>
                <td className={claseAtraso(compra.diasAtraso)}>{compra.diasAtraso ? `${compra.diasAtraso} días` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cuenta.pendientes.length === 0 ? <p className="vacio">No hay facturas pendientes de pago.</p> : null}

      <h3 className="bloque">Movimientos</h3>
      <div className="tabla-contenedor">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th className="fecha">Fecha</th>
              <th>Comprobante</th>
              <th>Detalle</th>
              <th className="numero">Debe</th>
              <th className="numero">Haber</th>
              <th className="numero">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {cuenta.movimientos.map((movimiento) => (
              <tr key={`${movimiento.tipo}-${movimiento.id}`}>
                <td className="fecha">{fecha(movimiento.fecha)}</td>
                <td>
                  {movimiento.tipo === 'ORDEN_PAGO' ? (
                    <button type="button" className="btn ghost" onClick={() => onOrden(movimiento.id)}>
                      Orden de pago {movimiento.numero}
                    </button>
                  ) : (
                    `Factura ${movimiento.numero}`
                  )}
                </td>
                <td>{movimiento.detalle}</td>
                <td className="numero">{movimiento.debe ? dinero(movimiento.debe) : ''}</td>
                <td className="numero">{movimiento.haber ? dinero(movimiento.haber) : ''}</td>
                <td className="numero">{dinero(movimiento.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cuenta.movimientos.length === 0 ? <p className="vacio">No hay compras a crédito con este proveedor.</p> : null}

      <div className="dialogo-acciones">
        {cuenta.pendientes.length > 0 ? (
          <button type="button" className="btn" onClick={onPagar}>
            Pagar
          </button>
        ) : null}
        <button type="button" className="btn primary" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}

function NuevaOrden({
  cuenta,
  onCerrar,
  onGuardada,
}: {
  cuenta: EstadoProveedor
  onCerrar: () => void
  onGuardada: (orden: OrdenPago) => void
}) {
  const [montos, setMontos] = useState<Record<number, string>>({})
  const [importe, setImporte] = useState('')
  const [medios, setMedios] = useState<OpcionCatalogo[]>([])
  const [caja, setCaja] = useState<CajaSesion | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const total = Object.values(montos).reduce((suma, valor) => suma + (numeroOpcional(valor) ?? 0), 0)
  const pago = useCobro(total, medios)

  useEffect(() => {
    Promise.all([apiListar<CajaSesion | undefined>('/caja/actual'), apiListar<OpcionCatalogo[]>('/caja/medios')])
      .then(([abierta, lista]) => {
        setCaja(abierta ?? null)
        setMedios(lista)
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo leer la caja'))
  }, [])

  function marcar(id: number, saldo: number, marcada: boolean) {
    setMontos((actuales) => {
      const siguiente = { ...actuales }
      if (marcada) {
        siguiente[id] = mascaraMonto(String(saldo), 0)
      } else {
        delete siguiente[id]
      }
      return siguiente
    })
  }

  function repartir() {
    let resto = numeroOpcional(importe) ?? 0
    const siguiente: Record<number, string> = {}
    for (const compra of cuenta.pendientes) {
      if (resto <= 0) {
        break
      }
      const parte = Math.min(resto, compra.saldo)
      siguiente[compra.id] = mascaraMonto(String(parte), 0)
      resto -= parte
    }
    setMontos(siguiente)
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const aplicaciones = Object.entries(montos).map(([id, valor]) => ({
      comprobanteId: Number(id),
      monto: numeroOpcional(valor) ?? 0,
    }))
    if (aplicaciones.length === 0) {
      setError('Elegí al menos una factura a pagar')
      return
    }
    for (const aplicacion of aplicaciones) {
      const compra = cuenta.pendientes.find((item) => item.id === aplicacion.comprobanteId)
      if (aplicacion.monto <= 0) {
        setError(`Indicá el monto a pagar de la factura ${compra?.numeroComprobante ?? ''}`)
        return
      }
      if (compra && aplicacion.monto > compra.saldo) {
        setError(`A la factura ${compra.numeroComprobante} le quedan Gs. ${dinero(compra.saldo)}`)
        return
      }
    }
    const problema = pago.validar()
    if (problema) {
      setError(problema)
      return
    }
    if (caja && pago.efectivoACobrar > caja.efectivoEsperado) {
      setError(`En la caja hay Gs. ${dinero(caja.efectivoEsperado)} en efectivo. No alcanza para pagar Gs. ${dinero(pago.efectivoACobrar)}`)
      return
    }
    if (!window.confirm(`¿Emitir orden de pago por Gs. ${dinero(total)} a ${cuenta.proveedor}?`)) {
      return
    }
    const observacion = (event.currentTarget.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()
    setGuardando(true)
    try {
      onGuardada(
        await apiCrear<OrdenPago>('/ordenes-pago', {
          proveedorId: cuenta.proveedorId,
          aplicaciones,
          pagos: pago.pagos(),
          observacion: textoOpcional(observacion),
        }),
      )
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo emitir la orden de pago')
      setGuardando(false)
    }
  }

  const bloqueo = caja === null ? 'Para pagar tenés que abrir tu caja (menú Caja).' : null

  return (
    <Dialogo clase="ancho" titulo={`Pagar a ${cuenta.proveedor}`} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error ?? bloqueo} />
        <div className="grilla tres">
          <Campo etiqueta="Importe a pagar">
            <input
              className="monto"
              inputMode="numeric"
              value={importe}
              onChange={(event) => setImporte(mascaraMonto(event.target.value, 0))}
              placeholder={dinero(cuenta.saldo)}
            />
          </Campo>
          <div className="dialogo-acciones">
            <button type="button" className="btn" onClick={repartir} disabled={!numeroOpcional(importe)}>
              Repartir desde la más antigua
            </button>
          </div>
          {caja ? (
            <Campo etiqueta="Efectivo en tu caja">
              <strong>{dinero(caja.efectivoEsperado)}</strong>
            </Campo>
          ) : null}
        </div>
        <div className="tabla-contenedor bloque">
          <table className="tabla lineas">
            <thead>
              <tr>
                <th />
                <th>Factura</th>
                <th className="fecha">Vence</th>
                <th className="numero">Saldo</th>
                <th className="numero">A pagar</th>
              </tr>
            </thead>
            <tbody>
              {cuenta.pendientes.map((compra) => {
                const marcada = compra.id in montos
                return (
                  <tr key={compra.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Pagar factura ${compra.numeroComprobante}`}
                        checked={marcada}
                        onChange={(event) => marcar(compra.id, compra.saldo, event.target.checked)}
                      />
                    </td>
                    <td>{compra.numeroComprobante}</td>
                    <td className={claseAtraso(compra.diasAtraso).replace('numero', 'fecha')}>{fecha(compra.vencimiento)}</td>
                    <td className="numero">{dinero(compra.saldo)}</td>
                    <td>
                      <input
                        className="monto"
                        inputMode="numeric"
                        aria-label={`Monto a pagar de ${compra.numeroComprobante}`}
                        value={montos[compra.id] ?? ''}
                        disabled={!marcada}
                        onChange={(event) =>
                          setMontos((actuales) => ({ ...actuales, [compra.id]: mascaraMonto(event.target.value, 0) }))
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="totales">
          <div className="total">
            <span>Total de la orden</span>
            <strong>{dinero(total)}</strong>
          </div>
        </div>
        {caja && total > 0 ? (
          <SeccionCobro
            cobro={pago}
            titulo="Pago"
            conVuelto={false}
            detalle="El efectivo es lo que falta para completar la orden después de transferencias o cheques."
          />
        ) : null}
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Observación">
              <textarea name="observacion" rows={2} maxLength={200} />
            </Campo>
          </div>
          <div className="dialogo-acciones">
            <button className="btn" type="button" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn primary" type="submit" disabled={guardando || !caja || total <= 0}>
              Emitir orden de pago
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

function DetalleOrden({
  orden,
  onCerrar,
  onAnulada,
}: {
  orden: OrdenPago
  onCerrar: () => void
  onAnulada: (orden: OrdenPago) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)
  const esAdmin = cargarSesion()?.roles.includes('ADMIN') ?? false

  async function imprimir() {
    try {
      await apiAbrir(`/ordenes-pago/${orden.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  async function anular() {
    if (!window.confirm(`¿Anular la orden de pago ${orden.numero}? Las facturas vuelven a quedar pendientes y el dinero vuelve a la caja como ingreso.`)) {
      return
    }
    setAnulando(true)
    try {
      onAnulada(await apiCrear<OrdenPago>(`/ordenes-pago/${orden.id}/anular`, {}))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular la orden de pago')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <Dialogo titulo={`Orden de pago ${orden.numero}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla">
        <Campo etiqueta="Proveedor">
          <strong>{orden.proveedor}</strong>
        </Campo>
        <Campo etiqueta="RUC">
          <strong>{texto(orden.proveedorDocumento)}</strong>
        </Campo>
        <Campo etiqueta="Fecha">
          <strong>{fecha(orden.fecha)}</strong>
        </Campo>
        <Campo etiqueta="Estado">
          <span className={orden.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{orden.estado}</span>
        </Campo>
      </div>
      <div className="tabla-contenedor bloque">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Factura del proveedor</th>
              <th className="numero">Importe</th>
            </tr>
          </thead>
          <tbody>
            {orden.aplicaciones.map((aplicacion) => (
              <tr key={aplicacion.comprobanteId}>
                <td>{aplicacion.numeroComprobante}</td>
                <td className="numero">{dinero(aplicacion.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="totales">
        <div className="total">
          <span>Total</span>
          <strong>{dinero(orden.total)}</strong>
        </div>
      </div>
      <p className="ayuda">
        Pagado por {texto(orden.usuario)}:{' '}
        {orden.pagos.map((linea) => `${linea.medio} Gs. ${dinero(linea.monto)}${linea.referencia ? ` (${linea.referencia})` : ''}`).join(' · ')}
      </p>
      {orden.observacion ? <p className="ayuda">{orden.observacion}</p> : null}
      <div className="dialogo-acciones">
        {esAdmin && orden.estado === 'CONFIRMADO' ? (
          <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
            Anular orden
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
