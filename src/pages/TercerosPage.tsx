import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiCrear, apiEliminar, apiListar, dinero, texto } from '../api/client'
import type { Obra, Tercero } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, numeroOpcional, valorInput } from '../components/ui'

function documento(tercero: Tercero): string {
  if (!tercero.documento) {
    return '—'
  }
  return tercero.digitoVerificador ? `${tercero.documento}-${tercero.digitoVerificador}` : tercero.documento
}

export function ClientesPage() {
  return <TercerosPage rol="cliente" titulo="Clientes" detalle="Contratistas, comercios, ferreterías, establecimientos y sus destinos de entrega." />
}

export function ProveedoresPage() {
  return <TercerosPage rol="proveedor" titulo="Proveedores" detalle="Quienes abastecen el depósito." />
}

function TercerosPage({ rol, titulo, detalle }: { rol: 'cliente' | 'proveedor'; titulo: string; detalle: string }) {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Tercero | null>(null)
  const [seleccionado, setSeleccionado] = useState<Tercero | null>(null)
  const [obras, setObras] = useState<Obra[]>([])
  const [obraEditando, setObraEditando] = useState<Obra | null>(null)
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    try {
      setTerceros(await apiListar<Tercero[]>(`/terceros?rol=${rol}`))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer el listado')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [rol])

  async function elegir(tercero: Tercero) {
    setSeleccionado(tercero)
    setObraEditando(null)
    if (rol !== 'cliente') {
      return
    }
    try {
      setObras(await apiListar<Obra[]>(`/terceros/${tercero.id}/obras`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los destinos')
    }
  }

  async function guardarObra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!seleccionado) {
      return
    }
    const form = event.currentTarget
    const cuerpo = {
      nombre: valorInput(form, 'nombre'),
      direccion: valorInput(form, 'direccionObra'),
      ciudad: valorInput(form, 'ciudad'),
    }
    try {
      if (obraEditando) {
        await apiActualizar(`/terceros/${seleccionado.id}/obras/${obraEditando.id}`, cuerpo)
      } else {
        await apiCrear(`/terceros/${seleccionado.id}/obras`, cuerpo)
      }
      form.reset()
      setObraEditando(null)
      setError(null)
      setObras(await apiListar<Obra[]>(`/terceros/${seleccionado.id}/obras`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el destino')
    }
  }

  async function quitarObra(obra: Obra) {
    if (!seleccionado) {
      return
    }
    const confirmado = await confirmar({
      titulo: 'Quitar destino',
      mensaje: `¿Quitar el destino ${obra.nombre} de ${seleccionado.razonSocial}? Los comprobantes ya emitidos lo conservan; solo deja de ofrecerse en los nuevos.`,
      aceptar: 'Quitar destino',
      peligro: true,
    })
    if (!confirmado) {
      return
    }
    try {
      await apiEliminar(`/terceros/${seleccionado.id}/obras/${obra.id}`)
      if (obraEditando?.id === obra.id) {
        setObraEditando(null)
      }
      setError(null)
      setObras(await apiListar<Obra[]>(`/terceros/${seleccionado.id}/obras`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo quitar el destino')
    }
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtrados = consulta
    ? terceros.filter((tercero) =>
        [tercero.razonSocial, documento(tercero), tercero.telefono, tercero.celular, tercero.email].some((valor) =>
          (valor ?? '').toLocaleUpperCase('es-PY').includes(consulta),
        ),
      )
    : terceros
  const paginacion = usePaginacion(filtrados)

  return (
    <section>
      <Barra titulo={titulo} detalle={detalle}>
        <label className="campo busqueda">
          <span>Buscar</span>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre, RUC, teléfono o correo"
          />
        </label>
        <button type="button" className="btn primary" onClick={() => setCreando(true)}>
          {rol === 'cliente' ? 'Nuevo cliente' : 'Nuevo proveedor'}
        </button>
      </Barra>
      <Aviso mensaje={error} />
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Teléfono</th>
              <th>Correo</th>
              {rol === 'cliente' ? <th className="numero">Límite de crédito</th> : null}
              <th className="numero">Plazo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((tercero) => (
              <tr key={tercero.id}>
                <td>{tercero.razonSocial}</td>
                <td className="numero">{documento(tercero)}</td>
                <td>{texto(tercero.celular || tercero.telefono)}</td>
                <td>{texto(tercero.email)}</td>
                {rol === 'cliente' ? (
                  <td className="numero">{tercero.limiteCredito ? dinero(tercero.limiteCredito) : '—'}</td>
                ) : null}
                <td className="numero">{tercero.plazoDias ? `${tercero.plazoDias} días` : '—'}</td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setEditando(tercero)}>
                    Editar
                  </button>
                  {rol === 'cliente' ? (
                    <button type="button" className="btn ghost" onClick={() => void elegir(tercero)}>
                      Destinos
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && terceros.length === 0 ? <p className="vacio">No hay registros para mostrar.</p> : null}
      {listo && terceros.length > 0 && filtrados.length === 0 ? (
        <p className="vacio">Ningún registro coincide con la búsqueda.</p>
      ) : null}
      {seleccionado && rol === 'cliente' ? (
        <section className="obras">
          <h3>Destinos de {seleccionado.razonSocial}</h3>
          {obras.length === 0 ? (
            <p className="vacio">Todavía no tiene destinos.</p>
          ) : (
            <div className="tabla-contenedor bloque">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Ciudad</th>
                    <th>Dirección</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {obras.map((obra) => (
                    <tr key={obra.id}>
                      <td>{obra.nombre}</td>
                      <td>{texto(obra.ciudad)}</td>
                      <td>{texto(obra.direccion)}</td>
                      <td className="acciones">
                        <button type="button" className="btn ghost" onClick={() => setObraEditando(obra)}>
                          Editar
                        </button>
                        <button type="button" className="btn ghost" onClick={() => void quitarObra(obra)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <form
            key={obraEditando?.id ?? 'nueva'}
            className="grilla bloque"
            onSubmit={(event) => void guardarObra(event)}
          >
            <Campo etiqueta={obraEditando ? `Editar destino ${obraEditando.nombre}` : 'Nuevo destino'}>
              <input name="nombre" required placeholder="Obra, ferretería, estancia, local…" defaultValue={obraEditando?.nombre ?? ''} autoFocus={obraEditando != null} />
            </Campo>
            <Campo etiqueta="Ciudad">
              <input name="ciudad" defaultValue={obraEditando?.ciudad ?? ''} />
            </Campo>
            <Campo etiqueta="Dirección">
              <input name="direccionObra" defaultValue={obraEditando?.direccion ?? ''} />
            </Campo>
            <div className="dialogo-acciones">
              {obraEditando ? (
                <button className="btn" type="button" onClick={() => setObraEditando(null)}>
                  Cancelar
                </button>
              ) : null}
              <button className="btn primary" type="submit">
                {obraEditando ? 'Guardar cambios' : 'Agregar destino'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
      {creando || editando ? (
        <FichaTercero
          rol={rol}
          tercero={editando}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
          onGuardado={(guardado) => {
            setCreando(false)
            setEditando(null)
            if (seleccionado?.id === guardado.id) {
              setSeleccionado(guardado)
            }
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

export function FichaTercero({
  rol,
  tercero,
  onCerrar,
  onGuardado,
}: {
  rol: 'cliente' | 'proveedor'
  tercero: Tercero | null
  onCerrar: () => void
  onGuardado: (tercero: Tercero) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const esCliente = tercero ? tercero.esCliente : rol === 'cliente'
  const esProveedor = tercero ? tercero.esProveedor : rol === 'proveedor'
  const otroRol = rol === 'cliente' ? 'proveedor' : 'cliente'

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const otro = (form.elements.namedItem('otroRol') as HTMLInputElement).checked
    const cuerpo = {
      razonSocial: valorInput(form, 'razonSocial'),
      tipoPersona: valorInput(form, 'tipoPersona'),
      documento: valorCampo(form, 'documento'),
      telefono: valorCampo(form, 'telefono'),
      celular: valorCampo(form, 'celular'),
      email: valorCampo(form, 'email'),
      direccion: valorInput(form, 'direccion'),
      esCliente: rol === 'cliente' || otro,
      esProveedor: rol === 'proveedor' || otro,
      limiteCredito: numeroOpcional(valorCampo(form, 'limiteCredito')),
      plazoDias: numeroOpcional(valorCampo(form, 'plazoDias')),
    }
    setGuardando(true)
    try {
      onGuardado(
        tercero
          ? await apiActualizar<Tercero>(`/terceros/${tercero.id}`, cuerpo)
          : await apiCrear<Tercero>('/terceros', cuerpo),
      )
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  const titulo = tercero
    ? `Editar ${tercero.razonSocial}`
    : rol === 'cliente' ? 'Nuevo cliente' : 'Nuevo proveedor'

  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar}>
      <form className="grilla" onSubmit={(event) => void guardar(event)}>
        <div className="span">
          <Aviso mensaje={error} />
        </div>
        <Campo etiqueta="Razón social">
          <input name="razonSocial" required defaultValue={tercero?.razonSocial ?? ''} />
        </Campo>
        <Campo etiqueta="Tipo">
          <select name="tipoPersona" required defaultValue={tercero?.tipoPersona ?? 'JURIDICA'}>
            <option value="JURIDICA">Jurídica</option>
            <option value="FISICA">Física</option>
          </select>
        </Campo>
        <Campo etiqueta="RUC o cédula">
          <input name="documento" placeholder="80000000-1" defaultValue={tercero?.documento ? documento(tercero) : ''} />
        </Campo>
        <Campo etiqueta="Teléfono">
          <input name="telefono" defaultValue={tercero?.telefono ?? ''} />
        </Campo>
        <Campo etiqueta="Celular">
          <input name="celular" defaultValue={tercero?.celular ?? ''} />
        </Campo>
        <Campo etiqueta="Correo">
          <input name="email" type="email" defaultValue={tercero?.email ?? ''} />
        </Campo>
        <Campo etiqueta="Dirección">
          <input name="direccion" defaultValue={tercero?.direccion ?? ''} />
        </Campo>
        {esCliente ? (
          <Campo etiqueta="Límite de crédito (vacío = sin límite)">
            <Monto name="limiteCredito" valor={tercero?.limiteCredito} decimales={0} />
          </Campo>
        ) : null}
        <Campo etiqueta="Plazo habitual de crédito (días)">
          <input
            name="plazoDias"
            type="number"
            min={0}
            max={365}
            defaultValue={tercero?.plazoDias ?? ''}
          />
        </Campo>
        <label className="check linea">
          <input
            name="otroRol"
            type="checkbox"
            defaultChecked={rol === 'cliente' ? esProveedor : esCliente}
          />
          También es {otroRol}
        </label>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function valorCampo(form: HTMLFormElement, nombre: string): string {
  const campo = form.elements.namedItem(nombre)
  if (!(campo instanceof HTMLInputElement)) {
    return ''
  }
  return campo.value.trim()
}
