import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiCrear, apiListar, cantidad, cargarSesion, fecha, hoy, texto } from '../api/client'
import type { EntregaPendiente, Material, MotivoTraslado, Obra, Remision, RemisionOpciones, Tercero, Venta } from '../api/types'
import { etiquetaCliente, etiquetaMaterial } from '../components/etiquetas'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, mascaraMonto, numeroOpcional, textoOpcional } from '../components/ui'

export const MOTIVOS: { valor: MotivoTraslado; etiqueta: string }[] = [
  { valor: 'VENTA', etiqueta: 'Venta' },
  { valor: 'TRASLADO_ENTRE_LOCALES', etiqueta: 'Traslado entre locales' },
  { valor: 'CONSIGNACION', etiqueta: 'Consignación' },
  { valor: 'DEVOLUCION', etiqueta: 'Devolución' },
  { valor: 'EXHIBICION', etiqueta: 'Exhibición' },
  { valor: 'OTRO', etiqueta: 'Otro' },
]

function etiquetaMotivo(motivo: MotivoTraslado): string {
  return MOTIVOS.find((item) => item.valor === motivo)?.etiqueta ?? motivo
}

function lugar(direccion: string | null | undefined, ciudad: string | null | undefined): string {
  return [direccion, ciudad].filter((parte) => parte && parte.trim()).join(' - ')
}

export function RemisionesPage() {
  const [remisiones, setRemisiones] = useState<Remision[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [viendo, setViendo] = useState<Remision | null>(null)

  async function cargar() {
    try {
      setRemisiones(await apiListar<Remision[]>('/remisiones'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las notas de remisión')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function ver(id: number) {
    try {
      setViendo(await apiListar<Remision>(`/remisiones/${id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la nota de remisión')
    }
  }

  async function imprimir(id: number) {
    try {
      await apiAbrir(`/remisiones/${id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtradas = remisiones.filter(
    (remision) =>
      !consulta
      || remision.cliente.includes(consulta)
      || remision.numeroComprobante.includes(consulta)
      || (remision.facturaNumero ?? '').includes(consulta)
      || (remision.vehiculoChapa ?? '').includes(consulta),
  )
  const paginacion = usePaginacion(filtradas)

  return (
    <section>
      <Barra
        kicker="Comercial"
        titulo="Notas de remisión"
        detalle="Documentan el traslado de mercadería. No mueven stock: el stock ya se descuenta al facturar."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Número, cliente, factura o chapa" />
        </label>
        <button type="button" className="btn primary" onClick={() => setCreando(true)}>
          Nueva remisión
        </button>
      </Barra>
      <Aviso mensaje={error} />
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th className="fecha">Fecha</th>
              <th>Número</th>
              <th>Destinatario</th>
              <th>Factura</th>
              <th>Motivo</th>
              <th>Llegada</th>
              <th>Chapa</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((remision) => (
              <tr key={remision.id} className={remision.estado === 'ANULADO' ? 'baja' : undefined}>
                <td className="fecha">{fecha(remision.fecha)}</td>
                <td>{remision.numeroComprobante}</td>
                <td>{remision.cliente}</td>
                <td>{texto(remision.facturaNumero)}</td>
                <td>{etiquetaMotivo(remision.motivo)}</td>
                <td>{remision.puntoLlegada}</td>
                <td>{remision.vehiculoChapa}</td>
                <td>
                  <span className={remision.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{remision.estado}</span>
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void ver(remision.id)}>
                    Ver
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void imprimir(remision.id)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && filtradas.length === 0 ? <p className="vacio">No hay notas de remisión para mostrar.</p> : null}
      {creando ? (
        <NuevaRemision
          onCerrar={() => setCreando(false)}
          onGuardada={(remision) => {
            setCreando(false)
            setViendo(remision)
            void cargar()
          }}
        />
      ) : null}
      {viendo ? (
        <DetalleRemision
          remision={viendo}
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

type Linea = {
  productoId: number
  codigo: string
  descripcion: string
  unidad: string
  cantidad: string
  maximo: number | null
}

function textoCantidad(valor: number): string {
  return mascaraMonto(String(valor).replace('.', ','), 3)
}

export function NuevaRemision({
  factura,
  onCerrar,
  onGuardada,
}: {
  factura?: Venta
  onCerrar: () => void
  onGuardada: (remision: Remision) => void
}) {
  const [opciones, setOpciones] = useState<RemisionOpciones | null>(null)
  const [clientes, setClientes] = useState<Tercero[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [puntoId, setPuntoId] = useState('')
  const [motivo, setMotivo] = useState<MotivoTraslado>('VENTA')
  const [clienteTexto, setClienteTexto] = useState('')
  const [obraId, setObraId] = useState(factura?.obraId ? String(factura.obraId) : '')
  const [partida, setPartida] = useState('')
  const [llegada, setLlegada] = useState(factura?.clienteDireccion ?? '')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [buscar, setBuscar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const pedidos: [Promise<RemisionOpciones>, Promise<Tercero[]>, Promise<Material[]>, Promise<EntregaPendiente[]>] = [
      apiListar<RemisionOpciones>('/remisiones/opciones'),
      factura ? Promise.resolve([]) : apiListar<Tercero[]>('/terceros?rol=cliente'),
      factura ? Promise.resolve([]) : apiListar<Material[]>('/productos'),
      factura ? apiListar<EntregaPendiente[]>(`/remisiones/factura/${factura.id}/pendiente`) : Promise.resolve([]),
    ]
    Promise.all(pedidos)
      .then(([datos, listaClientes, listaMateriales, pendientes]) => {
        setOpciones(datos)
        setPuntoId(datos.puntos[0] ? String(datos.puntos[0].puntoExpedicionId) : '')
        setPartida(datos.puntoPartida ?? '')
        setClientes(listaClientes)
        setMateriales(listaMateriales.filter((material) => material.activo))
        setLineas(
          pendientes
            .filter((entrega) => entrega.pendiente > 0)
            .map((entrega) => ({
              productoId: entrega.productoId,
              codigo: entrega.codigo,
              descripcion: entrega.descripcion,
              unidad: entrega.unidad,
              cantidad: textoCantidad(entrega.pendiente),
              maximo: entrega.pendiente,
            })),
        )
        if (factura && pendientes.every((entrega) => entrega.pendiente <= 0)) {
          setError('Todo lo facturado ya tiene nota de remisión')
        }
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudieron leer los datos'))
  }, [])

  const cliente = clientes.find((item) => etiquetaCliente(item) === clienteTexto.trim()) ?? null
  const clienteId = factura ? factura.clienteId : (cliente?.id ?? null)

  useEffect(() => {
    if (!factura) {
      setObraId('')
    }
    setObras([])
    if (clienteId === null) {
      return
    }
    let vigente = true
    apiListar<Obra[]>(`/terceros/${clienteId}/obras`)
      .then((lista) => {
        if (!vigente) {
          return
        }
        setObras(lista)
        const deFactura = factura?.obraId ? lista.find((obra) => obra.id === factura.obraId) : undefined
        if (deFactura && lugar(deFactura.direccion, deFactura.ciudad)) {
          setLlegada(lugar(deFactura.direccion, deFactura.ciudad))
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [clienteId])

  function elegirObra(valor: string) {
    setObraId(valor)
    const obra = obras.find((item) => String(item.id) === valor)
    if (obra && lugar(obra.direccion, obra.ciudad)) {
      setLlegada(lugar(obra.direccion, obra.ciudad))
    }
  }

  function agregar(valor: string) {
    setBuscar(valor)
    const material = materiales.find((item) => etiquetaMaterial(item) === valor)
    if (!material) {
      return
    }
    setBuscar('')
    setLineas((actuales) =>
      actuales.some((linea) => linea.productoId === material.id)
        ? actuales
        : [
            ...actuales,
            {
              productoId: material.id,
              codigo: material.codigo,
              descripcion: material.descripcion,
              unidad: material.unidad,
              cantidad: '1',
              maximo: null,
            },
          ],
    )
  }

  function cambiar(productoId: number, valor: string) {
    setLineas((actuales) =>
      actuales.map((linea) => (linea.productoId === productoId ? { ...linea, cantidad: mascaraMonto(valor, 3) } : linea)),
    )
  }

  function quitar(productoId: number) {
    setLineas((actuales) => actuales.filter((linea) => linea.productoId !== productoId))
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!factura && motivo !== 'TRASLADO_ENTRE_LOCALES' && !cliente) {
      setError('Elegí el destinatario de la lista de clientes')
      return
    }
    if (lineas.length === 0) {
      setError('Cargá al menos un material')
      return
    }
    for (const linea of lineas) {
      const valor = numeroOpcional(linea.cantidad) ?? 0
      if (valor <= 0) {
        setError(`La cantidad de ${linea.codigo} debe ser mayor a cero`)
        return
      }
      if (linea.maximo !== null && valor > linea.maximo) {
        setError(`De ${linea.codigo} quedan por entregar ${cantidad(linea.maximo)}`)
        return
      }
    }
    const form = event.currentTarget
    const valor = (nombre: string) => (form.elements.namedItem(nombre) as HTMLInputElement).value.trim()
    const punto = opciones?.puntos.find((item) => String(item.puntoExpedicionId) === puntoId)
    if (!window.confirm(`¿Emitir la nota de remisión ${punto?.proximoComprobante ?? ''}?`)) {
      return
    }
    setGuardando(true)
    try {
      const remision = await apiCrear<Remision>('/remisiones', {
        puntoExpedicionId: Number(puntoId),
        fecha: valor('fecha'),
        facturaId: factura?.id ?? null,
        clienteId: factura ? null : clienteId,
        obraId: obraId ? Number(obraId) : null,
        motivo: factura ? 'VENTA' : motivo,
        fechaInicioTraslado: valor('fechaInicioTraslado'),
        fechaFinTraslado: textoOpcional(valor('fechaFinTraslado')),
        puntoPartida: partida.trim(),
        puntoLlegada: llegada.trim(),
        transportistaNombre: textoOpcional(valor('transportistaNombre')),
        transportistaRuc: textoOpcional(valor('transportistaRuc')),
        vehiculoMarca: textoOpcional(valor('vehiculoMarca')),
        vehiculoChapa: valor('vehiculoChapa'),
        conductorNombre: valor('conductorNombre'),
        conductorDocumento: valor('conductorDocumento'),
        conductorDireccion: textoOpcional(valor('conductorDireccion')),
        observacion: textoOpcional((form.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()),
        items: lineas.map((linea) => ({ productoId: linea.productoId, cantidad: numeroOpcional(linea.cantidad) })),
      })
      onGuardada(remision)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo emitir la nota de remisión')
      setGuardando(false)
    }
  }

  const puntoElegido = opciones?.puntos.find((item) => String(item.puntoExpedicionId) === puntoId)
  const bloqueo = !opciones
    ? null
    : !opciones.empresaConfigurada
      ? 'Antes de emitir remisiones hay que cargar los datos de la empresa (menú Empresa).'
      : opciones.puntos.length === 0
        ? 'No hay un timbrado de nota de remisión vigente con números disponibles. Cargalo en Empresa › Timbrados con tipo Remisión.'
        : null

  return (
    <Dialogo
      clase="ancho"
      titulo={factura ? `Nota de remisión de la factura ${factura.numeroComprobante}` : 'Nueva nota de remisión'}
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
          <Campo etiqueta="Remisión N°">
            <strong className="proximo">{puntoElegido?.proximoComprobante ?? '—'}</strong>
          </Campo>
          <Campo etiqueta="Fecha de emisión">
            <input name="fecha" type="date" required defaultValue={hoy()} min={factura?.fecha} max={hoy()} />
          </Campo>
          {factura ? (
            <>
              <Campo etiqueta="Destinatario">
                <strong>{factura.cliente}</strong>
              </Campo>
              <Campo etiqueta="Obra">
                <strong>{texto(factura.obra)}</strong>
              </Campo>
              <Campo etiqueta="Motivo">
                <strong>Venta</strong>
              </Campo>
            </>
          ) : (
            <>
              <Campo etiqueta="Motivo">
                <select value={motivo} onChange={(event) => setMotivo(event.target.value as MotivoTraslado)}>
                  {MOTIVOS.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.etiqueta}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Destinatario">
                <input
                  list="clientes-remision"
                  value={clienteTexto}
                  onChange={(event) => setClienteTexto(event.target.value)}
                  placeholder={motivo === 'TRASLADO_ENTRE_LOCALES' ? 'Vacío = traslado propio' : 'Elegí de la lista'}
                />
              </Campo>
              <datalist id="clientes-remision">
                {clientes.map((item) => (
                  <option key={item.id} value={etiquetaCliente(item)} />
                ))}
              </datalist>
              <Campo etiqueta="Obra">
                <select value={obraId} onChange={(event) => elegirObra(event.target.value)} disabled={obras.length === 0}>
                  <option value="">{obras.length === 0 ? 'Sin obras' : 'Sin obra'}</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </>
          )}
        </div>
        {puntoElegido ? (
          <p className="ayuda">
            Timbrado {puntoElegido.timbrado}, vigente hasta {fecha(puntoElegido.vigenteHasta)}. Quedan {puntoElegido.disponibles} números.
          </p>
        ) : null}

        <h3 className="bloque">Traslado</h3>
        <div className="grilla tres">
          <Campo etiqueta="Inicio del traslado">
            <input name="fechaInicioTraslado" type="date" required defaultValue={hoy()} />
          </Campo>
          <Campo etiqueta="Fin estimado (opcional)">
            <input name="fechaFinTraslado" type="date" />
          </Campo>
          <span />
          <div className="span">
            <Campo etiqueta="Punto de partida">
              <input value={partida} onChange={(event) => setPartida(event.target.value)} required maxLength={200} />
            </Campo>
          </div>
          <div className="span">
            <Campo etiqueta="Punto de llegada">
              <input value={llegada} onChange={(event) => setLlegada(event.target.value)} required maxLength={200} placeholder="Dirección de entrega" />
            </Campo>
          </div>
        </div>

        <h3 className="bloque">Vehículo y conductor</h3>
        <div className="grilla tres">
          <Campo etiqueta="Chapa del vehículo">
            <input name="vehiculoChapa" required maxLength={20} />
          </Campo>
          <Campo etiqueta="Marca del vehículo">
            <input name="vehiculoMarca" maxLength={60} />
          </Campo>
          <span />
          <Campo etiqueta="Nombre del conductor">
            <input name="conductorNombre" required maxLength={150} />
          </Campo>
          <Campo etiqueta="C.I. del conductor">
            <input name="conductorDocumento" required maxLength={20} />
          </Campo>
          <Campo etiqueta="Domicilio del conductor">
            <input name="conductorDireccion" maxLength={200} />
          </Campo>
          <Campo etiqueta="Transportista (si es tercerizado)">
            <input name="transportistaNombre" maxLength={150} />
          </Campo>
          <Campo etiqueta="RUC del transportista">
            <input name="transportistaRuc" maxLength={20} />
          </Campo>
        </div>

        <h3 className="bloque">Mercadería</h3>
        {factura ? null : (
          <div className="grilla">
            <div className="span">
              <Campo etiqueta="Agregar material">
                <input
                  list="materiales-remision"
                  value={buscar}
                  onChange={(event) => agregar(event.target.value)}
                  placeholder="Escribí código o descripción y elegí de la lista"
                />
              </Campo>
              <datalist id="materiales-remision">
                {materiales.map((material) => (
                  <option key={material.id} value={etiquetaMaterial(material)} />
                ))}
              </datalist>
            </div>
          </div>
        )}
        <div className="tabla-contenedor bloque">
          <table className="tabla lineas">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Unidad</th>
                {factura ? <th className="numero">Pendiente</th> : null}
                <th className="numero">Cantidad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.productoId}>
                  <td>{linea.codigo}</td>
                  <td>{linea.descripcion}</td>
                  <td>{linea.unidad}</td>
                  {factura ? <td className="numero">{cantidad(linea.maximo)}</td> : null}
                  <td className="numero">
                    <input
                      className="monto"
                      inputMode="decimal"
                      value={linea.cantidad}
                      onChange={(event) => cambiar(linea.productoId, event.target.value)}
                    />
                  </td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => quitar(linea.productoId)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lineas.length === 0 ? <p className="vacio">{factura ? 'No queda mercadería por remitir.' : 'Agregá los materiales.'}</p> : null}
        {factura ? <p className="ayuda">Si la entrega es parcial, ajustá las cantidades o quitá lo que sale en otro viaje.</p> : null}
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
            <button className="btn primary" type="submit" disabled={guardando || !opciones || bloqueo !== null || lineas.length === 0}>
              Emitir remisión
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

export function DetalleRemision({
  remision,
  onCerrar,
  onAnulada,
}: {
  remision: Remision
  onCerrar: () => void
  onAnulada: (remision: Remision) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)
  const esAdmin = cargarSesion()?.roles.includes('ADMIN') ?? false

  async function imprimir() {
    try {
      await apiAbrir(`/remisiones/${remision.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  async function anular() {
    if (
      !window.confirm(
        `¿Anular la nota de remisión ${remision.numeroComprobante}? El número queda usado. Recordá anular también el talonario físico.`,
      )
    ) {
      return
    }
    setAnulando(true)
    try {
      onAnulada(await apiCrear<Remision>(`/remisiones/${remision.id}/anular`, {}))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular la nota de remisión')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <Dialogo clase="ancho" titulo={`Nota de remisión ${remision.numeroComprobante}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla tres">
        <Campo etiqueta="Destinatario">
          <strong>{remision.cliente}</strong>
        </Campo>
        <Campo etiqueta="RUC / CI">
          <strong>{texto(remision.clienteDocumento)}</strong>
        </Campo>
        <Campo etiqueta="Obra">
          <strong>{texto(remision.obra)}</strong>
        </Campo>
        <Campo etiqueta="Fecha de emisión">
          <strong>{fecha(remision.fecha)}</strong>
        </Campo>
        <Campo etiqueta="Motivo">
          <strong>{etiquetaMotivo(remision.motivo)}</strong>
        </Campo>
        <Campo etiqueta="Factura">
          <strong>{texto(remision.facturaNumero)}</strong>
        </Campo>
        <Campo etiqueta="Traslado">
          <strong>
            {fecha(remision.fechaInicioTraslado)}
            {remision.fechaFinTraslado ? ` al ${fecha(remision.fechaFinTraslado)}` : ''}
          </strong>
        </Campo>
        <Campo etiqueta="Partida">
          <strong>{remision.puntoPartida}</strong>
        </Campo>
        <Campo etiqueta="Llegada">
          <strong>{remision.puntoLlegada}</strong>
        </Campo>
        <Campo etiqueta="Vehículo">
          <strong>
            {remision.vehiculoChapa}
            {remision.vehiculoMarca ? ` · ${remision.vehiculoMarca}` : ''}
          </strong>
        </Campo>
        <Campo etiqueta="Conductor">
          <strong>
            {remision.conductorNombre} · C.I. {remision.conductorDocumento}
          </strong>
        </Campo>
        <Campo etiqueta="Transportista">
          <strong>
            {texto(remision.transportistaNombre)}
            {remision.transportistaRuc ? ` · RUC ${remision.transportistaRuc}` : ''}
          </strong>
        </Campo>
        <Campo etiqueta="Timbrado">
          <strong>{remision.timbradoNumero}</strong>
        </Campo>
        <Campo etiqueta="Emitida por">
          <strong>{texto(remision.usuario)}</strong>
        </Campo>
        <Campo etiqueta="Estado">
          <span className={remision.estado === 'ANULADO' ? 'estado anulado' : 'estado'}>{remision.estado}</span>
        </Campo>
      </div>
      <div className="tabla-contenedor bloque">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th className="numero">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {remision.lineas.map((linea, indice) => (
              <tr key={`${linea.codigo}-${indice}`}>
                <td>{texto(linea.codigo)}</td>
                <td>{linea.descripcion}</td>
                <td>{texto(linea.unidad)}</td>
                <td className="numero">{cantidad(linea.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {remision.observacion ? <p className="ayuda">{remision.observacion}</p> : null}
      <div className="dialogo-acciones">
        {esAdmin && remision.estado === 'CONFIRMADO' ? (
          <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
            Anular remisión
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
