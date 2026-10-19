import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiCrear, apiListar, cargarSesion, dinero, fecha, texto } from '../api/client'
import type { CajaSesion, EstadoCuenta, OpcionCatalogo, Recibo, SaldoCliente, Tercero } from '../api/types'
import { SeccionCobro, useCobro } from '../components/Cobro'
import { confirmar } from '../components/Confirmacion'
import { etiquetaCliente } from '../components/etiquetas'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, mascaraMonto, numeroOpcional, textoOpcional } from '../components/ui'

function claseAtraso(dias: number): string {
  return dias > 0 ? 'numero falta' : 'numero'
}

export function CuentasPage() {
  const [saldos, setSaldos] = useState<SaldoCliente[]>([])
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [clientes, setClientes] = useState<Tercero[]>([])
  const [buscar, setBuscar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null)
  const [cobrando, setCobrando] = useState<EstadoCuenta | null>(null)
  const [recibo, setRecibo] = useState<Recibo | null>(null)

  async function cargar() {
    try {
      const [listaSaldos, listaRecibos, listaClientes] = await Promise.all([
        apiListar<SaldoCliente[]>('/cuentas/clientes'),
        apiListar<Recibo[]>('/recibos'),
        apiListar<Tercero[]>('/terceros?rol=cliente'),
      ])
      setSaldos(listaSaldos)
      setRecibos(listaRecibos)
      setClientes(listaClientes)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las cuentas')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function abrirCuenta(clienteId: number, cobrar = false) {
    try {
      const estado = await apiListar<EstadoCuenta>(`/cuentas/clientes/${clienteId}`)
      if (cobrar) {
        setCobrando(estado)
      } else {
        setCuenta(estado)
      }
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer la cuenta del cliente')
    }
  }

  async function verRecibo(id: number) {
    try {
      setRecibo(await apiListar<Recibo>(`/recibos/${id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir el recibo')
    }
  }

  async function imprimir(id: number) {
    try {
      await apiAbrir(`/recibos/${id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  function elegirCliente(valor: string) {
    setBuscar(valor)
    const cliente = clientes.find((item) => etiquetaCliente(item) === valor)
    if (cliente) {
      setBuscar('')
      void abrirCuenta(cliente.id)
    }
  }

  const totalSaldo = saldos.reduce((suma, item) => suma + item.saldo, 0)
  const totalVencido = saldos.reduce((suma, item) => suma + item.vencido, 0)
  const paginacion = usePaginacion(recibos)

  return (
    <section>
      <Barra kicker="Tesorería" titulo="Cuentas corrientes" detalle="Saldos de clientes por facturas a crédito, cobros con recibo y estado de cuenta.">
        <label className="campo busqueda">
          <span>Ver cuenta de un cliente</span>
          <input
            list="clientes-cuenta"
            value={buscar}
            onChange={(event) => elegirCliente(event.target.value)}
            placeholder="Nombre o RUC"
          />
        </label>
        <datalist id="clientes-cuenta">
          {clientes.map((item) => (
            <option key={item.id} value={etiquetaCliente(item)} />
          ))}
        </datalist>
      </Barra>
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Clientes con saldo</span>
          <strong>{saldos.length}</strong>
        </div>
        <div>
          <span>Facturas pendientes</span>
          <strong>{saldos.reduce((suma, item) => suma + item.facturas, 0)}</strong>
        </div>
        <div>
          <span>Vencido</span>
          <strong className={totalVencido > 0 ? 'falta' : undefined}>{dinero(totalVencido)}</strong>
        </div>
        <div className="total">
          <span>Total a cobrar</span>
          <strong>{dinero(totalSaldo)}</strong>
        </div>
      </div>

      <div className="tabla-contenedor bloque">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>RUC / CI</th>
              <th className="numero">Facturas</th>
              <th className="numero">Saldo</th>
              <th className="numero">Vencido</th>
              <th className="numero">Días de atraso</th>
              <th className="numero">Límite</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {saldos.map((item) => (
              <tr key={item.clienteId}>
                <td>{item.cliente}</td>
                <td>{texto(item.documento)}</td>
                <td className="numero">{item.facturas}</td>
                <td className="numero">{dinero(item.saldo)}</td>
                <td className={claseAtraso(item.vencido)}>{item.vencido ? dinero(item.vencido) : '—'}</td>
                <td className={claseAtraso(item.diasAtraso)}>{item.diasAtraso || '—'}</td>
                <td className={item.limiteCredito && item.saldo > item.limiteCredito ? 'numero falta' : 'numero'}>
                  {item.limiteCredito ? dinero(item.limiteCredito) : '—'}
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void abrirCuenta(item.clienteId)}>
                    Ver cuenta
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void abrirCuenta(item.clienteId, true)}>
                    Cobrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listo && saldos.length === 0 ? <p className="vacio">Ningún cliente tiene facturas a crédito pendientes.</p> : null}

      <div className="seccion">
        <div className="seccion-cabecera">
          <div>
            <h3>Recibos emitidos</h3>
            <p>Cada recibo cancela total o parcialmente facturas a crédito y entra en la caja de quien cobra.</p>
          </div>
        </div>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th className="fecha">Fecha</th>
                <th>Recibo</th>
                <th>Cliente</th>
                <th className="numero">Total</th>
                <th>Cobró</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginacion.filas.map((item) => (
                <tr key={item.id} className={item.estado === 'ANULADO' ? 'baja' : undefined}>
                  <td className="fecha">{fecha(item.fecha)}</td>
                  <td>{item.numero}</td>
                  <td>{item.cliente}</td>
                  <td className="numero">{dinero(item.total)}</td>
                  <td>{texto(item.usuario)}</td>
                  <td>
                    <span className={item.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{item.estado}</span>
                  </td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => void verRecibo(item.id)}>
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
        {listo && recibos.length === 0 ? <p className="vacio">Todavía no se emitió ningún recibo.</p> : null}
      </div>

      {cuenta ? (
        <DetalleCuenta
          cuenta={cuenta}
          onCerrar={() => setCuenta(null)}
          onCobrar={() => {
            setCobrando(cuenta)
            setCuenta(null)
          }}
          onRecibo={(id) => void verRecibo(id)}
        />
      ) : null}
      {cobrando ? (
        <NuevoRecibo
          cuenta={cobrando}
          onCerrar={() => setCobrando(null)}
          onGuardado={(nuevo) => {
            setCobrando(null)
            setRecibo(nuevo)
            void cargar()
          }}
        />
      ) : null}
      {recibo ? (
        <DetalleRecibo
          recibo={recibo}
          onCerrar={() => setRecibo(null)}
          onAnulado={(anulado) => {
            setRecibo(anulado)
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
  onCobrar,
  onRecibo,
}: {
  cuenta: EstadoCuenta
  onCerrar: () => void
  onCobrar: () => void
  onRecibo: (id: number) => void
}) {
  return (
    <Dialogo clase="ancho" titulo={`Cuenta de ${cuenta.cliente}`} onCerrar={onCerrar}>
      <p className="ayuda">
        RUC / CI {texto(cuenta.documento)} · Teléfono {texto(cuenta.telefono)} · Plazo habitual{' '}
        {cuenta.plazoDias ? `${cuenta.plazoDias} días` : 'sin definir'}
      </p>
      <div className="totales cuatro">
        <div className="total">
          <span>Saldo</span>
          <strong>{dinero(cuenta.saldo)}</strong>
        </div>
        <div>
          <span>Vencido</span>
          <strong className={cuenta.vencido > 0 ? 'falta' : undefined}>{dinero(cuenta.vencido)}</strong>
        </div>
        <div>
          <span>Límite de crédito</span>
          <strong>{cuenta.limiteCredito ? dinero(cuenta.limiteCredito) : '—'}</strong>
        </div>
        <div>
          <span>Disponible</span>
          <strong className={cuenta.disponible != null && cuenta.disponible < 0 ? 'falta' : undefined}>
            {cuenta.disponible == null ? '—' : dinero(cuenta.disponible)}
          </strong>
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
              <th>Destino</th>
              <th className="numero">Total</th>
              <th className="numero">Cobrado</th>
              <th className="numero">Notas de crédito</th>
              <th className="numero">Saldo</th>
              <th className="numero">Atraso</th>
            </tr>
          </thead>
          <tbody>
            {cuenta.pendientes.map((factura) => (
              <tr key={factura.id}>
                <td>{factura.numeroComprobante}</td>
                <td className="fecha">{fecha(factura.fecha)}</td>
                <td className="fecha">{fecha(factura.vencimiento)}</td>
                <td>{texto(factura.obra)}</td>
                <td className="numero">{dinero(factura.total)}</td>
                <td className="numero">{factura.cobrado ? dinero(factura.cobrado) : '—'}</td>
                <td className="numero">{factura.acreditado ? dinero(factura.acreditado) : '—'}</td>
                <td className="numero">{dinero(factura.saldo)}</td>
                <td className={claseAtraso(factura.diasAtraso)}>{factura.diasAtraso ? `${factura.diasAtraso} días` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cuenta.pendientes.length === 0 ? <p className="vacio">No tiene facturas pendientes.</p> : null}

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
                  {movimiento.tipo === 'RECIBO' ? (
                    <button type="button" className="btn ghost" onClick={() => onRecibo(movimiento.id)}>
                      Recibo {movimiento.numero}
                    </button>
                  ) : movimiento.tipo === 'NOTA_CREDITO' ? (
                    `Nota de crédito ${movimiento.numero}`
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
      {cuenta.movimientos.length === 0 ? <p className="vacio">El cliente no tiene ventas a crédito.</p> : null}

      <div className="dialogo-acciones">
        {cuenta.pendientes.length > 0 ? (
          <button type="button" className="btn" onClick={onCobrar}>
            Cobrar
          </button>
        ) : null}
        <button type="button" className="btn primary" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}

function NuevoRecibo({
  cuenta,
  onCerrar,
  onGuardado,
}: {
  cuenta: EstadoCuenta
  onCerrar: () => void
  onGuardado: (recibo: Recibo) => void
}) {
  const [montos, setMontos] = useState<Record<number, string>>({})
  const [importe, setImporte] = useState('')
  const [medios, setMedios] = useState<OpcionCatalogo[]>([])
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const total = Object.values(montos).reduce((suma, valor) => suma + (numeroOpcional(valor) ?? 0), 0)
  const cobro = useCobro(total, medios)

  useEffect(() => {
    Promise.all([apiListar<CajaSesion | undefined>('/caja/actual'), apiListar<OpcionCatalogo[]>('/caja/medios')])
      .then(([abierta, lista]) => {
        setCajaAbierta(Boolean(abierta))
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
    for (const factura of cuenta.pendientes) {
      if (resto <= 0) {
        break
      }
      const parte = Math.min(resto, factura.saldo)
      siguiente[factura.id] = mascaraMonto(String(parte), 0)
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
      setError('Elegí al menos una factura a cancelar')
      return
    }
    for (const aplicacion of aplicaciones) {
      const factura = cuenta.pendientes.find((item) => item.id === aplicacion.comprobanteId)
      if (aplicacion.monto <= 0) {
        setError(`Indicá el monto a cobrar de la factura ${factura?.numeroComprobante ?? ''}`)
        return
      }
      if (factura && aplicacion.monto > factura.saldo) {
        setError(`A la factura ${factura.numeroComprobante} le quedan Gs. ${dinero(factura.saldo)}`)
        return
      }
    }
    const problema = cobro.validar()
    if (problema) {
      setError(problema)
      return
    }
    const form = event.currentTarget
    if (
      !(await confirmar({
        titulo: 'Emitir recibo',
        mensaje: `¿Emitir recibo por Gs. ${dinero(total)} a ${cuenta.cliente}?`,
        aceptar: 'Emitir recibo',
      }))
    ) {
      return
    }
    const observacion = (form.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()
    setGuardando(true)
    try {
      onGuardado(
        await apiCrear<Recibo>('/recibos', {
          clienteId: cuenta.clienteId,
          aplicaciones,
          pagos: cobro.pagos(),
          observacion: textoOpcional(observacion),
        }),
      )
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo emitir el recibo')
      setGuardando(false)
    }
  }

  const bloqueo = cajaAbierta === false ? 'Para cobrar tenés que abrir tu caja (menú Caja).' : null

  return (
    <Dialogo clase="ancho" titulo={`Cobrar a ${cuenta.cliente}`} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error ?? bloqueo} />
        <div className="grilla tres">
          <Campo etiqueta="Importe que entrega el cliente">
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
        </div>
        <div className="tabla-contenedor bloque">
          <table className="tabla lineas">
            <thead>
              <tr>
                <th />
                <th>Factura</th>
                <th className="fecha">Vence</th>
                <th>Destino</th>
                <th className="numero">Saldo</th>
                <th className="numero">A cobrar</th>
              </tr>
            </thead>
            <tbody>
              {cuenta.pendientes.map((factura) => {
                const marcada = factura.id in montos
                return (
                  <tr key={factura.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Cobrar factura ${factura.numeroComprobante}`}
                        checked={marcada}
                        onChange={(event) => marcar(factura.id, factura.saldo, event.target.checked)}
                      />
                    </td>
                    <td>{factura.numeroComprobante}</td>
                    <td className={claseAtraso(factura.diasAtraso).replace('numero', 'fecha')}>{fecha(factura.vencimiento)}</td>
                    <td>{texto(factura.obra)}</td>
                    <td className="numero">{dinero(factura.saldo)}</td>
                    <td>
                      <input
                        className="monto"
                        inputMode="numeric"
                        aria-label={`Monto a cobrar de ${factura.numeroComprobante}`}
                        value={montos[factura.id] ?? ''}
                        disabled={!marcada}
                        onChange={(event) =>
                          setMontos((actuales) => ({ ...actuales, [factura.id]: mascaraMonto(event.target.value, 0) }))
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
            <span>Total del recibo</span>
            <strong>{dinero(total)}</strong>
          </div>
        </div>
        {cajaAbierta && total > 0 ? (
          <SeccionCobro cobro={cobro} detalle="El efectivo es lo que falta para completar el recibo después de los otros medios." />
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
            <button className="btn primary" type="submit" disabled={guardando || !cajaAbierta || total <= 0}>
              Emitir recibo
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

function DetalleRecibo({
  recibo,
  onCerrar,
  onAnulado,
}: {
  recibo: Recibo
  onCerrar: () => void
  onAnulado: (recibo: Recibo) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)
  const esAdmin = cargarSesion()?.roles.includes('ADMIN') ?? false

  async function imprimir() {
    try {
      await apiAbrir(`/recibos/${recibo.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  async function anular() {
    if (
      !(await confirmar({
        titulo: 'Anular recibo',
        mensaje: `¿Anular el recibo ${recibo.numero}? Las facturas vuelven a quedar pendientes y el dinero sale de la caja como egreso.`,
        aceptar: 'Anular recibo',
        peligro: true,
      }))
    ) {
      return
    }
    setAnulando(true)
    try {
      onAnulado(await apiCrear<Recibo>(`/recibos/${recibo.id}/anular`, {}))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular el recibo')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <Dialogo titulo={`Recibo ${recibo.numero}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla">
        <Campo etiqueta="Cliente">
          <strong>{recibo.cliente}</strong>
        </Campo>
        <Campo etiqueta="RUC / CI">
          <strong>{texto(recibo.clienteDocumento)}</strong>
        </Campo>
        <Campo etiqueta="Fecha">
          <strong>{fecha(recibo.fecha)}</strong>
        </Campo>
        <Campo etiqueta="Estado">
          <span className={recibo.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{recibo.estado}</span>
        </Campo>
      </div>
      <div className="tabla-contenedor bloque">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Factura</th>
              <th className="numero">Importe</th>
            </tr>
          </thead>
          <tbody>
            {recibo.aplicaciones.map((aplicacion) => (
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
          <strong>{dinero(recibo.total)}</strong>
        </div>
      </div>
      <p className="ayuda">
        Cobrado por {texto(recibo.usuario)}:{' '}
        {recibo.pagos.map((pago) => `${pago.medio} Gs. ${dinero(pago.monto)}${pago.referencia ? ` (${pago.referencia})` : ''}`).join(' · ')}
      </p>
      {recibo.observacion ? <p className="ayuda">{recibo.observacion}</p> : null}
      <div className="dialogo-acciones">
        {esAdmin && recibo.estado === 'CONFIRMADO' ? (
          <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
            Anular recibo
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
