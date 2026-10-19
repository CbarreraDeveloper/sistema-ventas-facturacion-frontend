import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiCrear, apiListar, cantidad, cargarSesion, dinero, fecha, hoy, texto } from '../api/client'
import { confirmar } from '../components/Confirmacion'
import type { CreditoDisponible, CreditoLinea, MotivoCredito, NotaCredito, NotaCreditoOpciones, Venta } from '../api/types'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { CuadroTotales, sumarTotales, totalesDe } from '../components/Totales'
import { Aviso, Barra, Campo, Dialogo, mascaraMonto, numeroOpcional, textoOpcional } from '../components/ui'

const MOTIVOS: { valor: MotivoCredito; etiqueta: string }[] = [
  { valor: 'DEVOLUCION', etiqueta: 'Devolución de mercadería' },
  { valor: 'DESCUENTO', etiqueta: 'Descuento' },
  { valor: 'BONIFICACION', etiqueta: 'Bonificación' },
  { valor: 'AJUSTE_PRECIO', etiqueta: 'Ajuste de precio' },
]

function etiquetaMotivo(motivo: MotivoCredito): string {
  return MOTIVOS.find((item) => item.valor === motivo)?.etiqueta ?? motivo
}

export function NotasCreditoPage() {
  const [notas, setNotas] = useState<NotaCredito[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [eligiendo, setEligiendo] = useState(false)
  const [facturaId, setFacturaId] = useState<number | null>(null)
  const [viendo, setViendo] = useState<NotaCredito | null>(null)

  async function cargar() {
    try {
      setNotas(await apiListar<NotaCredito[]>('/notas-credito'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las notas de crédito')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function ver(id: number) {
    try {
      setViendo(await apiListar<NotaCredito>(`/notas-credito/${id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la nota de crédito')
    }
  }

  async function imprimir(id: number) {
    try {
      await apiAbrir(`/notas-credito/${id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtradas = notas.filter(
    (nota) =>
      !consulta
      || nota.cliente.includes(consulta)
      || nota.numeroComprobante.includes(consulta)
      || nota.facturaNumero.includes(consulta),
  )
  const paginacion = usePaginacion(filtradas)

  return (
    <section>
      <Barra
        kicker="Comercial"
        titulo="Notas de crédito"
        detalle="Devoluciones y descuentos sobre facturas emitidas. Bajan el saldo del cliente y, si la factura ya estaba cobrada, devuelven el dinero desde la caja."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Número, cliente o factura" />
        </label>
        <button type="button" className="btn primary" onClick={() => setEligiendo(true)}>
          Nueva nota de crédito
        </button>
      </Barra>
      <Aviso mensaje={error} />
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th className="fecha">Fecha</th>
              <th>Número</th>
              <th>Cliente</th>
              <th>Factura</th>
              <th>Motivo</th>
              <th className="numero">Total</th>
              <th className="numero">Devuelto en caja</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((nota) => (
              <tr key={nota.id} className={nota.estado === 'ANULADO' ? 'baja' : undefined}>
                <td className="fecha">{fecha(nota.fecha)}</td>
                <td>{nota.numeroComprobante}</td>
                <td>{nota.cliente}</td>
                <td>{nota.facturaNumero}</td>
                <td>{etiquetaMotivo(nota.motivo)}</td>
                <td className="numero">{dinero(nota.total)}</td>
                <td className="numero">{nota.reintegro ? dinero(nota.reintegro) : '—'}</td>
                <td>
                  <span className={nota.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{nota.estado}</span>
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void ver(nota.id)}>
                    Ver
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void imprimir(nota.id)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && filtradas.length === 0 ? <p className="vacio">No hay notas de crédito para mostrar.</p> : null}
      {eligiendo ? (
        <ElegirFactura
          onCerrar={() => setEligiendo(false)}
          onElegida={(id) => {
            setEligiendo(false)
            setFacturaId(id)
          }}
        />
      ) : null}
      {facturaId !== null ? (
        <NuevaNotaCredito
          facturaId={facturaId}
          onCerrar={() => setFacturaId(null)}
          onGuardada={(nota) => {
            setFacturaId(null)
            setViendo(nota)
            void cargar()
          }}
        />
      ) : null}
      {viendo ? (
        <DetalleNotaCredito
          nota={viendo}
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

function etiquetaFactura(venta: Venta): string {
  return `${venta.numeroComprobante} · ${venta.cliente}`
}

function ElegirFactura({ onCerrar, onElegida }: { onCerrar: () => void; onElegida: (facturaId: number) => void }) {
  const [facturas, setFacturas] = useState<Venta[]>([])
  const [elegida, setElegida] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiListar<Venta[]>('/ventas')
      .then((lista) => setFacturas(lista.filter((venta) => venta.estado === 'CONFIRMADO')))
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudieron leer las facturas'))
  }, [])

  const factura = facturas.find((venta) => etiquetaFactura(venta) === elegida.trim()) ?? null

  return (
    <Dialogo titulo="¿Sobre qué factura?" onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <Campo etiqueta="Factura">
        <input
          list="facturas-credito"
          aria-required="true"
          value={elegida}
          onChange={(event) => setElegida(event.target.value)}
          placeholder="Escribí el número o el cliente y elegí de la lista"
        />
      </Campo>
      <datalist id="facturas-credito">
        {facturas.map((venta) => (
          <option key={venta.id} value={etiquetaFactura(venta)} />
        ))}
      </datalist>
      {factura ? (
        <p className="ayuda">
          Del {fecha(factura.fecha)} por Gs. {dinero(factura.total)}, {factura.condicion === 'CREDITO' ? 'a crédito' : 'al contado'}.
        </p>
      ) : null}
      <div className="dialogo-acciones">
        <button type="button" className="btn" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="btn primary" disabled={!factura} onClick={() => factura && onElegida(factura.id)}>
          Continuar
        </button>
      </div>
    </Dialogo>
  )
}

function importeLinea(linea: CreditoLinea, devolucion: boolean, valor: string): number {
  const numero = numeroOpcional(valor) ?? 0
  if (numero <= 0) {
    return 0
  }
  if (!devolucion) {
    return Math.round(numero)
  }
  if (linea.cantidadDisponible <= 0) {
    return 0
  }
  if (numero >= linea.cantidadDisponible) {
    return linea.montoDisponible
  }
  return Math.round((linea.montoDisponible * numero) / linea.cantidadDisponible)
}

export function NuevaNotaCredito({
  facturaId,
  onCerrar,
  onGuardada,
}: {
  facturaId: number
  onCerrar: () => void
  onGuardada: (nota: NotaCredito) => void
}) {
  const [opciones, setOpciones] = useState<NotaCreditoOpciones | null>(null)
  const [disponible, setDisponible] = useState<CreditoDisponible | null>(null)
  const [puntoId, setPuntoId] = useState('')
  const [motivo, setMotivo] = useState<MotivoCredito>('DEVOLUCION')
  const [valores, setValores] = useState<Record<number, string>>({})
  const [medioId, setMedioId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([
      apiListar<NotaCreditoOpciones>('/notas-credito/opciones'),
      apiListar<CreditoDisponible>(`/notas-credito/factura/${facturaId}/disponible`),
    ])
      .then(([datos, credito]) => {
        setOpciones(datos)
        setDisponible(credito)
        setPuntoId(datos.puntos[0] ? String(datos.puntos[0].puntoExpedicionId) : '')
        const efectivo = datos.medios.find((medio) => medio.codigo === 'EFECTIVO') ?? datos.medios[0]
        setMedioId(efectivo ? String(efectivo.id) : '')
        if (credito.lineas.every((linea) => linea.montoDisponible <= 0)) {
          setError('Esta factura ya se acreditó por completo')
        }
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudieron leer los datos'))
  }, [facturaId])

  const devolucion = motivo === 'DEVOLUCION'
  const lineas = disponible?.lineas ?? []
  const importes = lineas.map((linea) => ({ linea, total: importeLinea(linea, devolucion, valores[linea.detalleId] ?? '') }))
  const totales = sumarTotales(importes.filter((item) => item.total > 0).map((item) => ({ total: item.total, porcentaje: item.linea.porcentajeIva })))
  const reintegro = disponible ? Math.max(0, totales.total - disponible.saldoCuenta) : 0

  function cambiarMotivo(valor: MotivoCredito) {
    setMotivo(valor)
    setValores({})
  }

  function cambiar(detalleId: number, valor: string) {
    setValores((actuales) => ({ ...actuales, [detalleId]: mascaraMonto(valor, devolucion ? 3 : 0) }))
  }

  function todo() {
    const completos: Record<number, string> = {}
    for (const linea of lineas) {
      const valor = devolucion ? linea.cantidadDisponible : linea.montoDisponible
      if (valor > 0) {
        completos[linea.detalleId] = mascaraMonto(String(valor).replace('.', ','), devolucion ? 3 : 0)
      }
    }
    setValores(completos)
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const items = []
    for (const { linea } of importes) {
      const valor = numeroOpcional(valores[linea.detalleId] ?? '') ?? 0
      if (valor <= 0) {
        continue
      }
      const nombre = linea.codigo ?? linea.descripcion
      if (devolucion && valor > linea.cantidadDisponible) {
        setError(`De ${nombre} se pueden devolver hasta ${cantidad(linea.cantidadDisponible)}`)
        return
      }
      if (!devolucion && valor > linea.montoDisponible) {
        setError(`A ${nombre} le quedan Gs. ${dinero(linea.montoDisponible)} por acreditar`)
        return
      }
      items.push(devolucion ? { detalleId: linea.detalleId, cantidad: valor } : { detalleId: linea.detalleId, monto: valor })
    }
    if (items.length === 0) {
      setError(devolucion ? 'Indicá cuánto se devuelve de al menos un material' : 'Indicá el importe de al menos una línea')
      return
    }
    const punto = opciones?.puntos.find((item) => String(item.puntoExpedicionId) === puntoId)
    const aviso = reintegro > 0 ? ` Sale de la caja Gs. ${dinero(reintegro)} para devolver al cliente.` : ''
    const form = event.currentTarget
    if (
      !(await confirmar({
        titulo: 'Emitir nota de crédito',
        mensaje: `¿Emitir la nota de crédito ${punto?.proximoComprobante ?? ''} por Gs. ${dinero(totales.total)}?${aviso}`,
        aceptar: 'Emitir nota de crédito',
      }))
    ) {
      return
    }
    setGuardando(true)
    try {
      onGuardada(
        await apiCrear<NotaCredito>('/notas-credito', {
          puntoExpedicionId: Number(puntoId),
          fecha: (form.elements.namedItem('fecha') as HTMLInputElement).value,
          facturaId,
          motivo,
          medioPagoId: reintegro > 0 && medioId ? Number(medioId) : null,
          observacion: textoOpcional((form.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()),
          items,
        }),
      )
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo emitir la nota de crédito')
      setGuardando(false)
    }
  }

  const puntoElegido = opciones?.puntos.find((item) => String(item.puntoExpedicionId) === puntoId)
  const bloqueo = !opciones
    ? null
    : !opciones.empresaConfigurada
      ? 'Antes de emitir notas de crédito hay que cargar los datos de la empresa (menú Empresa).'
      : opciones.puntos.length === 0
        ? 'No hay un timbrado de nota de crédito vigente con números disponibles. Cargalo en Empresa › Timbrados con tipo Nota de crédito.'
        : reintegro > 0 && !opciones.cajaAbierta
          ? `Hay que devolverle Gs. ${dinero(reintegro)} al cliente: abrí tu caja (menú Caja) para registrar la salida del dinero.`
          : null

  return (
    <Dialogo
      clase="ancho"
      titulo={disponible ? `Nota de crédito de la factura ${disponible.facturaNumero}` : 'Nota de crédito'}
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
          <Campo etiqueta="Nota de crédito N°">
            <strong className="proximo">{puntoElegido?.proximoComprobante ?? '—'}</strong>
          </Campo>
          <Campo etiqueta="Fecha">
            <input name="fecha" type="date" required defaultValue={hoy()} min={disponible?.fecha} max={hoy()} />
          </Campo>
          <Campo etiqueta="Cliente">
            <strong>{disponible?.cliente ?? '—'}</strong>
          </Campo>
          <Campo etiqueta="Factura">
            <strong>
              {disponible
                ? `${fecha(disponible.fecha)} · Gs. ${dinero(disponible.total)} · ${disponible.condicion === 'CREDITO' ? 'Crédito' : 'Contado'}`
                : '—'}
            </strong>
          </Campo>
          <Campo etiqueta="Motivo">
            <select value={motivo} required onChange={(event) => cambiarMotivo(event.target.value as MotivoCredito)}>
              {MOTIVOS.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <p className="ayuda">
          {devolucion
            ? 'Indicá la cantidad que devuelve el cliente. El importe sale proporcional a lo facturado y la mercadería vuelve al stock.'
            : 'Indicá el importe (IVA incluido) a acreditar en cada línea. No mueve stock.'}
        </p>
        <div className="tabla-contenedor bloque">
          <table className="tabla lineas">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th className="numero">Facturado</th>
                <th className="numero">{devolucion ? 'Se puede devolver' : 'Se puede acreditar'}</th>
                <th className="numero">{devolucion ? 'Devuelve' : 'Importe'}</th>
                <th className="numero">Total</th>
              </tr>
            </thead>
            <tbody>
              {importes.map(({ linea, total }) => (
                <tr key={linea.detalleId}>
                  <td>{texto(linea.codigo)}</td>
                  <td>{linea.descripcion}</td>
                  <td className="numero">
                    {cantidad(linea.cantidad)} · Gs. {dinero(linea.total)}
                  </td>
                  <td className="numero">
                    {devolucion ? `${cantidad(linea.cantidadDisponible)} ${linea.unidad ?? ''}` : `Gs. ${dinero(linea.montoDisponible)}`}
                  </td>
                  <td className="numero">
                    <input
                      className="monto"
                      inputMode="decimal"
                      value={valores[linea.detalleId] ?? ''}
                      disabled={devolucion ? linea.cantidadDisponible <= 0 : linea.montoDisponible <= 0}
                      onChange={(event) => cambiar(linea.detalleId, event.target.value)}
                    />
                  </td>
                  <td className="numero">{total ? dinero(total) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dialogo-acciones">
          <button type="button" className="btn ghost" onClick={todo}>
            {devolucion ? 'Devolver todo lo pendiente' : 'Acreditar todo lo pendiente'}
          </button>
        </div>
        <CuadroTotales totales={totales} />
        {disponible && totales.total > 0 ? (
          <p className="ayuda">
            {disponible.condicion === 'CREDITO'
              ? `La factura tiene saldo Gs. ${dinero(disponible.saldoCuenta)}. Se descuentan Gs. ${dinero(Math.min(totales.total, disponible.saldoCuenta))} de la cuenta del cliente`
              : 'La factura fue al contado'}
            {reintegro > 0 ? ` y se le devuelven Gs. ${dinero(reintegro)} desde la caja.` : '.'}
          </p>
        ) : null}
        {reintegro > 0 && opciones?.cajaAbierta ? (
          <div className="grilla tres">
            <Campo etiqueta="Se devuelve en">
              <select value={medioId} required onChange={(event) => setMedioId(event.target.value)}>
                {opciones.medios.map((medio) => (
                  <option key={medio.id} value={medio.id}>
                    {medio.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
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
            <button className="btn primary" type="submit" disabled={guardando || !disponible || bloqueo !== null || totales.total <= 0}>
              Emitir nota de crédito
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

export function DetalleNotaCredito({
  nota,
  onCerrar,
  onAnulada,
}: {
  nota: NotaCredito
  onCerrar: () => void
  onAnulada: (nota: NotaCredito) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)
  const esAdmin = cargarSesion()?.roles.includes('ADMIN') ?? false

  async function imprimir() {
    try {
      await apiAbrir(`/notas-credito/${nota.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  async function anular() {
    const detalle = [
      nota.motivo === 'DEVOLUCION' ? 'la mercadería sale de nuevo del stock' : null,
      nota.aplicado > 0 ? `la cuenta del cliente vuelve a subir Gs. ${dinero(nota.aplicado)}` : null,
      nota.reintegro > 0 ? `los Gs. ${dinero(nota.reintegro)} devueltos vuelven a entrar a la caja` : null,
    ]
      .filter(Boolean)
      .join(', ')
    if (
      !(await confirmar({
        titulo: 'Anular nota de crédito',
        mensaje: `¿Anular la nota de crédito ${nota.numeroComprobante}? ${detalle ? `Al anularla ${detalle}.` : ''} El número queda usado.`,
        aceptar: 'Anular nota de crédito',
        peligro: true,
      }))
    ) {
      return
    }
    setAnulando(true)
    try {
      onAnulada(await apiCrear<NotaCredito>(`/notas-credito/${nota.id}/anular`, {}))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular la nota de crédito')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <Dialogo clase="ancho" titulo={`Nota de crédito ${nota.numeroComprobante}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla tres">
        <Campo etiqueta="Cliente">
          <strong>{nota.cliente}</strong>
        </Campo>
        <Campo etiqueta="RUC / CI">
          <strong>{texto(nota.clienteDocumento)}</strong>
        </Campo>
        <Campo etiqueta="Fecha">
          <strong>{fecha(nota.fecha)}</strong>
        </Campo>
        <Campo etiqueta="Factura afectada">
          <strong>
            {nota.facturaNumero} del {fecha(nota.facturaFecha)}
          </strong>
        </Campo>
        <Campo etiqueta="Motivo">
          <strong>{etiquetaMotivo(nota.motivo)}</strong>
        </Campo>
        <Campo etiqueta="Timbrado">
          <strong>{nota.timbradoNumero}</strong>
        </Campo>
        <Campo etiqueta="Descontado de la cuenta">
          <strong>{nota.aplicado ? `Gs. ${dinero(nota.aplicado)}` : '—'}</strong>
        </Campo>
        <Campo etiqueta="Devuelto en caja">
          <strong>{nota.reintegro ? `Gs. ${dinero(nota.reintegro)}` : '—'}</strong>
        </Campo>
        <Campo etiqueta="Emitida por">
          <strong>{texto(nota.usuario)}</strong>
        </Campo>
        <Campo etiqueta="Estado">
          <span className={nota.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{nota.estado}</span>
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
            {nota.lineas.map((linea, indice) => (
              <tr key={`${linea.codigo}-${indice}`}>
                <td>{texto(linea.codigo)}</td>
                <td>{linea.descripcion}</td>
                <td className="numero">{linea.cantidad ? cantidad(linea.cantidad) : '—'}</td>
                <td className="numero">{dinero(linea.precioUnitario)}</td>
                <td className="numero">{dinero(linea.porcentajeIva)}%</td>
                <td className="numero">{dinero(linea.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CuadroTotales totales={totalesDe(nota)} />
      {nota.observacion ? <p className="ayuda">{nota.observacion}</p> : null}
      <div className="dialogo-acciones">
        {esAdmin && nota.estado === 'CONFIRMADO' ? (
          <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
            Anular nota de crédito
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
