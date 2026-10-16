import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiCrear, apiListar, texto } from '../api/client'
import type { Obra, Tercero } from '../api/types'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, valorInput } from '../components/ui'

function documento(tercero: Tercero): string {
  if (!tercero.documento) {
    return '—'
  }
  return tercero.digitoVerificador ? `${tercero.documento}-${tercero.digitoVerificador}` : tercero.documento
}

export function ClientesPage() {
  return <TercerosPage rol="cliente" titulo="Clientes" detalle="Contratistas, comercios y obras de entrega." />
}

export function ProveedoresPage() {
  return <TercerosPage rol="proveedor" titulo="Proveedores" detalle="Quienes abastecen el depósito." />
}

function TercerosPage({ rol, titulo, detalle }: { rol: 'cliente' | 'proveedor'; titulo: string; detalle: string }) {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [creando, setCreando] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Tercero | null>(null)
  const [obras, setObras] = useState<Obra[]>([])

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
    if (rol !== 'cliente') {
      return
    }
    try {
      setObras(await apiListar<Obra[]>(`/terceros/${tercero.id}/obras`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las obras')
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    try {
      await apiCrear('/terceros', {
        razonSocial: valorInput(form, 'razonSocial'),
        tipoPersona: valorInput(form, 'tipoPersona'),
        documento: valorCampo(form, 'documento'),
        telefono: valorCampo(form, 'telefono'),
        celular: valorCampo(form, 'celular'),
        email: valorCampo(form, 'email'),
        direccion: valorInput(form, 'direccion'),
        esCliente: rol === 'cliente',
        esProveedor: rol === 'proveedor',
      })
      setCreando(false)
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar')
    }
  }

  async function guardarObra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!seleccionado) {
      return
    }
    const form = event.currentTarget
    try {
      await apiCrear(`/terceros/${seleccionado.id}/obras`, {
        nombre: valorInput(form, 'nombre'),
        direccion: valorInput(form, 'direccionObra'),
        ciudad: valorInput(form, 'ciudad'),
      })
      form.reset()
      setObras(await apiListar<Obra[]>(`/terceros/${seleccionado.id}/obras`))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar la obra')
    }
  }

  const paginacion = usePaginacion(terceros)

  return (
    <section>
      <Barra titulo={titulo} detalle={detalle}>
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
                <td className="acciones">
                  {rol === 'cliente' ? (
                    <button type="button" className="btn ghost" onClick={() => void elegir(tercero)}>
                      Obras
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
      {seleccionado && rol === 'cliente' ? (
        <section className="obras">
          <h3>Obras de {seleccionado.razonSocial}</h3>
          {obras.length === 0 ? <p className="vacio">Todavía no tiene obras.</p> : null}
          <ul className="sugerencias">
            {obras.map((obra) => (
              <li key={obra.id}>
                {obra.nombre}
                {obra.ciudad ? ` · ${obra.ciudad}` : ''}
                {obra.direccion ? ` · ${obra.direccion}` : ''}
              </li>
            ))}
          </ul>
          <form className="grilla" onSubmit={(event) => void guardarObra(event)}>
            <Campo etiqueta="Nueva obra">
              <input name="nombre" required placeholder="Obra o local" />
            </Campo>
            <Campo etiqueta="Ciudad">
              <input name="ciudad" />
            </Campo>
            <Campo etiqueta="Dirección">
              <input name="direccionObra" />
            </Campo>
            <div className="dialogo-acciones">
              <button className="btn primary" type="submit">Agregar obra</button>
            </div>
          </form>
        </section>
      ) : null}
      {creando ? (
        <Dialogo titulo={rol === 'cliente' ? 'Nuevo cliente' : 'Nuevo proveedor'} onCerrar={() => setCreando(false)}>
          <form className="grilla" onSubmit={(event) => void guardar(event)}>
            <Campo etiqueta="Razón social">
              <input name="razonSocial" required />
            </Campo>
            <Campo etiqueta="Tipo">
              <select name="tipoPersona" defaultValue="JURIDICA">
                <option value="JURIDICA">Jurídica</option>
                <option value="FISICA">Física</option>
              </select>
            </Campo>
            <Campo etiqueta="RUC o cédula">
              <input name="documento" placeholder="80000000-1" />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input name="telefono" />
            </Campo>
            <Campo etiqueta="Celular">
              <input name="celular" />
            </Campo>
            <Campo etiqueta="Correo">
              <input name="email" type="email" />
            </Campo>
            <Campo etiqueta="Dirección">
              <input name="direccion" />
            </Campo>
            <div className="dialogo-acciones">
              <button className="btn primary" type="submit">Guardar</button>
            </div>
          </form>
        </Dialogo>
      ) : null}
    </section>
  )
}

function valorCampo(form: HTMLFormElement, nombre: string): string {
  const campo = form.elements.namedItem(nombre)
  if (!(campo instanceof HTMLInputElement)) {
    return ''
  }
  return campo.value.trim()
}
