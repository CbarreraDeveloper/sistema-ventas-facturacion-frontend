import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiActualizar, apiCrear, apiListar, cantidad, dinero, fecha, hoy, texto } from '../api/client'
import { confirmar } from '../components/Confirmacion'
import type { EstadoPresupuesto, Material, Obra, Presupuesto, Tercero, Venta, VentaOpciones } from '../api/types'
import { etiquetaCliente } from '../components/etiquetas'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { EditorRenglones, useRenglones } from '../components/Renglones'
import { CuadroTotales, totalesDe } from '../components/Totales'
import { Aviso, Barra, Campo, Dialogo, textoOpcional } from '../components/ui'
import { DetalleVenta, NuevaVenta } from './VentasPage'

const ESTADOS: { valor: EstadoPresupuesto | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'VENCIDO', etiqueta: 'Vencidos' },
  { valor: 'FACTURADO', etiqueta: 'Facturados' },
  { valor: 'ANULADO', etiqueta: 'Anulados' },
]

function claseEstado(estado: EstadoPresupuesto): string {
  if (estado === 'ANULADO') {
    return 'estado anulado'
  }
  if (estado === 'VENCIDO') {
    return 'estado alerta'
  }
  return 'estado'
}

function abierto(presupuesto: Presupuesto): boolean {
  return presupuesto.estado === 'PENDIENTE' || presupuesto.estado === 'VENCIDO'
}

export function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [filtro, setFiltro] = useState<EstadoPresupuesto | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Presupuesto | 'nuevo' | null>(null)
  const [viendo, setViendo] = useState<Presupuesto | null>(null)
  const [facturando, setFacturando] = useState<Presupuesto | null>(null)
  const [factura, setFactura] = useState<Venta | null>(null)

  async function cargar() {
    try {
      setPresupuestos(await apiListar<Presupuesto[]>('/presupuestos'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los presupuestos')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function ver(id: number) {
    try {
      setViendo(await apiListar<Presupuesto>(`/presupuestos/${id}`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir el presupuesto')
    }
  }

  async function imprimir(id: number) {
    try {
      await apiAbrir(`/presupuestos/${id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtrados = presupuestos.filter(
    (presupuesto) =>
      (!filtro || presupuesto.estado === filtro)
      && (!consulta || presupuesto.cliente.includes(consulta) || presupuesto.numero.includes(consulta)),
  )
  const paginacion = usePaginacion(filtrados)

  return (
    <section>
      <Barra kicker="Comercial" titulo="Presupuestos" detalle="Cotizaciones para clientes. No mueven stock ni caja; al aceptarlas se facturan con un clic.">
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Cliente o número" />
        </label>
        <label className="campo">
          <span>Estado</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value as EstadoPresupuesto | '')}>
            {ESTADOS.map((estado) => (
              <option key={estado.valor} value={estado.valor}>
                {estado.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn primary" onClick={() => setEditando('nuevo')}>
          Nuevo presupuesto
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
              <th>Destino</th>
              <th className="numero">Total</th>
              <th className="fecha">Válido hasta</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((presupuesto) => (
              <tr key={presupuesto.id} className={presupuesto.estado === 'ANULADO' ? 'baja' : undefined}>
                <td className="fecha">{fecha(presupuesto.fecha)}</td>
                <td>{presupuesto.numero}</td>
                <td>{presupuesto.cliente}</td>
                <td>{texto(presupuesto.obra)}</td>
                <td className="numero">{dinero(presupuesto.total)}</td>
                <td className="fecha">{fecha(presupuesto.validoHasta)}</td>
                <td>
                  <span className={claseEstado(presupuesto.estado)}>
                    {presupuesto.estado === 'FACTURADO' ? `FACTURADO ${presupuesto.facturaNumero ?? ''}` : presupuesto.estado}
                  </span>
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => void ver(presupuesto.id)}>
                    Ver
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void imprimir(presupuesto.id)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && filtrados.length === 0 ? <p className="vacio">No hay presupuestos para mostrar.</p> : null}

      {editando ? (
        <FormPresupuesto
          presupuesto={editando === 'nuevo' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(guardado) => {
            setEditando(null)
            setViendo(guardado)
            void cargar()
          }}
        />
      ) : null}
      {viendo ? (
        <DetallePresupuesto
          presupuesto={viendo}
          onCerrar={() => setViendo(null)}
          onEditar={() => {
            setEditando(viendo)
            setViendo(null)
          }}
          onFacturar={() => {
            setFacturando(viendo)
            setViendo(null)
          }}
          onAnulado={(anulado) => {
            setViendo(anulado)
            void cargar()
          }}
        />
      ) : null}
      {facturando ? (
        <NuevaVenta
          presupuesto={facturando}
          onCerrar={() => setFacturando(null)}
          onGuardada={(venta) => {
            setFacturando(null)
            setFactura(venta)
            void cargar()
          }}
        />
      ) : null}
      {factura ? <DetalleVenta venta={factura} onCerrar={() => setFactura(null)} onAnulada={setFactura} /> : null}
    </section>
  )
}

function FormPresupuesto({
  presupuesto,
  onCerrar,
  onGuardado,
}: {
  presupuesto: Presupuesto | null
  onCerrar: () => void
  onGuardado: (presupuesto: Presupuesto) => void
}) {
  const [opciones, setOpciones] = useState<VentaOpciones | null>(null)
  const [clientes, setClientes] = useState<Tercero[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [clienteTexto, setClienteTexto] = useState(presupuesto?.clienteNombre ?? '')
  const [obraId, setObraId] = useState('')
  const [condicion, setCondicion] = useState<'CONTADO' | 'CREDITO'>(presupuesto?.condicion ?? 'CONTADO')
  const [lista, setLista] = useState(presupuesto?.listaPrecio ?? 'MINORISTA')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const renglones = useRenglones()

  useEffect(() => {
    Promise.all([
      apiListar<VentaOpciones>('/ventas/opciones'),
      apiListar<Tercero[]>('/terceros?rol=cliente'),
      apiListar<Material[]>('/productos'),
    ])
      .then(([datos, listaClientes, listaMateriales]) => {
        setOpciones(datos)
        setClientes(listaClientes)
        const activos = listaMateriales.filter((material) => material.activo)
        setMateriales(activos)
        if (presupuesto) {
          const faltantes = renglones.cargar(presupuesto.lineas, activos)
          if (faltantes > 0) {
            setError(`${faltantes} material(es) están de baja y se quitaron del presupuesto`)
          }
          const elegido = listaClientes.find((item) => item.id === presupuesto.clienteId)
          if (elegido) {
            setClienteTexto(etiquetaCliente(elegido))
          }
        }
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudieron leer los datos'))
  }, [])

  const cliente = clientes.find((item) => etiquetaCliente(item) === clienteTexto.trim()) ?? null
  const clienteId = cliente?.id ?? null

  useEffect(() => {
    setObraId('')
    setObras([])
    if (clienteId === null) {
      return
    }
    let vigente = true
    apiListar<Obra[]>(`/terceros/${clienteId}/obras`)
      .then((lista) => {
        if (vigente) {
          setObras(lista)
          if (presupuesto?.obraId && presupuesto.clienteId === clienteId) {
            setObraId(String(presupuesto.obraId))
          }
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [clienteId])

  function cambiarLista(codigo: string) {
    setLista(codigo)
    renglones.repreciar(codigo)
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problema = renglones.validar()
    if (problema) {
      setError(problema)
      return
    }
    const form = event.currentTarget
    const validezDias = Number((form.elements.namedItem('validezDias') as HTMLInputElement).value)
    if (!Number.isInteger(validezDias) || validezDias < 1 || validezDias > 180) {
      setError('La validez debe ser un número de días entre 1 y 180')
      return
    }
    const plazoTexto = (form.elements.namedItem('plazoDias') as HTMLInputElement | null)?.value.trim() ?? ''
    const plazoDias = condicion === 'CREDITO' && plazoTexto ? Number(plazoTexto) : null
    if (plazoDias !== null && (!Number.isInteger(plazoDias) || plazoDias < 1 || plazoDias > 365)) {
      setError('El plazo del crédito debe ser un número de días entre 1 y 365')
      return
    }
    const cuerpo = {
      clienteId,
      clienteNombre: clienteId === null ? textoOpcional(clienteTexto.trim()) : null,
      obraId: obraId ? Number(obraId) : null,
      fecha: (form.elements.namedItem('fecha') as HTMLInputElement).value,
      condicion,
      listaPrecio: lista,
      validezDias,
      plazoDias,
      observacion: textoOpcional((form.elements.namedItem('observacion') as HTMLTextAreaElement).value.trim()),
      items: renglones.items(),
    }
    setGuardando(true)
    try {
      onGuardado(
        presupuesto
          ? await apiActualizar<Presupuesto>(`/presupuestos/${presupuesto.id}`, cuerpo)
          : await apiCrear<Presupuesto>('/presupuestos', cuerpo),
      )
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el presupuesto')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="ancho" titulo={presupuesto ? `Editar presupuesto ${presupuesto.numero}` : 'Nuevo presupuesto'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla tres">
          <Campo etiqueta="Cliente">
            <input
              list="clientes-presupuesto"
              value={clienteTexto}
              onChange={(event) => setClienteTexto(event.target.value)}
              placeholder="Elegí de la lista o escribí un nombre"
              maxLength={150}
            />
          </Campo>
          <datalist id="clientes-presupuesto">
            {clientes.map((item) => (
              <option key={item.id} value={etiquetaCliente(item)} />
            ))}
          </datalist>
          <Campo etiqueta="Destino">
            <select value={obraId} onChange={(event) => setObraId(event.target.value)} disabled={obras.length === 0}>
              <option value="">{obras.length === 0 ? 'Sin destinos' : 'Sin destino'}</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Fecha">
            <input name="fecha" type="date" required defaultValue={presupuesto?.fecha ?? hoy()} max={hoy()} />
          </Campo>
          <Campo etiqueta="Condición">
            <select value={condicion} required onChange={(event) => setCondicion(event.target.value as 'CONTADO' | 'CREDITO')}>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </Campo>
          <Campo etiqueta="Lista de precios">
            <select value={lista} required onChange={(event) => cambiarLista(event.target.value)}>
              {opciones?.listas.map((item) => (
                <option key={item.id} value={item.codigo ?? ''}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Validez (días)">
            <input name="validezDias" inputMode="numeric" maxLength={3} required defaultValue={presupuesto?.validezDias ?? 15} />
          </Campo>
          {condicion === 'CREDITO' ? (
            <Campo etiqueta="Plazo del crédito (días)">
              <input
                name="plazoDias"
                inputMode="numeric"
                maxLength={3}
                defaultValue={presupuesto?.plazoDias ?? cliente?.plazoDias ?? undefined}
                placeholder="Ej.: 30"
              />
            </Campo>
          ) : null}
        </div>
        {clienteTexto.trim() && !cliente ? (
          <p className="ayuda">No es un cliente registrado: el nombre sale tal cual en el presupuesto. Para facturar a crédito o asignar un destino hay que darlo de alta.</p>
        ) : null}
        <EditorRenglones
          estado={renglones}
          materiales={materiales}
          lista={lista}
          avisarStock="Hay materiales con menos stock que lo presupuestado. Conviene avisar el plazo de entrega."
        />
        <CuadroTotales totales={renglones.totales} />
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Observación">
              <textarea name="observacion" rows={2} maxLength={300} defaultValue={presupuesto?.observacion ?? ''} />
            </Campo>
          </div>
          <div className="dialogo-acciones">
            <button className="btn" type="button" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn primary" type="submit" disabled={guardando || !opciones}>
              {presupuesto ? 'Guardar cambios' : 'Crear presupuesto'}
            </button>
          </div>
        </div>
      </form>
    </Dialogo>
  )
}

function DetallePresupuesto({
  presupuesto,
  onCerrar,
  onEditar,
  onFacturar,
  onAnulado,
}: {
  presupuesto: Presupuesto
  onCerrar: () => void
  onEditar: () => void
  onFacturar: () => void
  onAnulado: (presupuesto: Presupuesto) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)

  async function imprimir() {
    try {
      await apiAbrir(`/presupuestos/${presupuesto.id}/pdf`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    }
  }

  async function anular() {
    if (
      !(await confirmar({
        titulo: 'Anular presupuesto',
        mensaje: `¿Anular el presupuesto ${presupuesto.numero}?`,
        aceptar: 'Anular presupuesto',
        peligro: true,
      }))
    ) {
      return
    }
    setAnulando(true)
    try {
      onAnulado(await apiCrear<Presupuesto>(`/presupuestos/${presupuesto.id}/anular`, {}))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular el presupuesto')
    } finally {
      setAnulando(false)
    }
  }

  async function facturar() {
    if (
      presupuesto.estado === 'VENCIDO'
      && !(await confirmar({
        titulo: 'Presupuesto vencido',
        mensaje: `El presupuesto venció el ${fecha(presupuesto.validoHasta)}. Revisá los precios antes de emitir. ¿Continuar?`,
        aceptar: 'Continuar',
      }))
    ) {
      return
    }
    onFacturar()
  }

  return (
    <Dialogo clase="ancho" titulo={`Presupuesto ${presupuesto.numero}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <div className="grilla tres">
        <Campo etiqueta="Cliente">
          <strong>{presupuesto.cliente}</strong>
        </Campo>
        <Campo etiqueta="RUC / CI">
          <strong>{texto(presupuesto.clienteDocumento)}</strong>
        </Campo>
        <Campo etiqueta="Destino">
          <strong>{texto(presupuesto.obra)}</strong>
        </Campo>
        <Campo etiqueta="Fecha">
          <strong>{fecha(presupuesto.fecha)}</strong>
        </Campo>
        <Campo etiqueta="Válido hasta">
          <strong>
            {fecha(presupuesto.validoHasta)} ({presupuesto.validezDias} días)
          </strong>
        </Campo>
        <Campo etiqueta="Condición">
          <strong>
            {presupuesto.condicion === 'CREDITO'
              ? `Crédito${presupuesto.plazoDias ? ` a ${presupuesto.plazoDias} días` : ''}`
              : 'Contado'}
          </strong>
        </Campo>
        <Campo etiqueta="Lista de precios">
          <strong>{texto(presupuesto.listaPrecioNombre)}</strong>
        </Campo>
        <Campo etiqueta="Hecho por">
          <strong>{texto(presupuesto.usuario)}</strong>
        </Campo>
        <Campo etiqueta="Estado">
          <span className={claseEstado(presupuesto.estado)}>
            {presupuesto.estado === 'FACTURADO' ? `FACTURADO ${presupuesto.facturaNumero ?? ''}` : presupuesto.estado}
          </span>
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
            {presupuesto.lineas.map((linea, indice) => (
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
      <CuadroTotales totales={totalesDe(presupuesto)} />
      {presupuesto.observacion ? <p className="ayuda">{presupuesto.observacion}</p> : null}
      <div className="dialogo-acciones">
        {abierto(presupuesto) ? (
          <>
            <button type="button" className="btn" disabled={anulando} onClick={() => void anular()}>
              Anular
            </button>
            <button type="button" className="btn" onClick={onEditar}>
              Editar
            </button>
          </>
        ) : null}
        <button type="button" className="btn" onClick={() => void imprimir()}>
          Imprimir PDF
        </button>
        {abierto(presupuesto) ? (
          <button type="button" className="btn primary" onClick={() => void facturar()}>
            Facturar
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={onCerrar}>
            Cerrar
          </button>
        )}
      </div>
    </Dialogo>
  )
}
