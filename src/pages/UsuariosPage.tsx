import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiCrear, apiEliminar, apiEnviar, apiListar, cargarSesion } from '../api/client'
import type { Usuario } from '../api/types'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, valorInput } from '../components/ui'

const ROLES = ['OPERADOR', 'ADMIN'] as const

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [restableciendo, setRestableciendo] = useState<Usuario | null>(null)
  const [restaurando, setRestaurando] = useState(false)
  const [eliminando, setEliminando] = useState<Usuario | null>(null)
  const [borrando, setBorrando] = useState(false)
  const sesion = cargarSesion()

  async function cargar() {
    try {
      setUsuarios(await apiListar<Usuario[]>('/usuarios'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los usuarios')
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const roles = ROLES.filter((rol) => {
      const campo = form.elements.namedItem(rol)
      return campo instanceof HTMLInputElement && campo.checked
    })
    if (roles.length === 0) {
      setError('Elegí al menos un rol')
      return
    }
    try {
      await apiCrear('/usuarios', {
        nombre: valorInput(form, 'nombre'),
        roles,
      })
      setCreando(false)
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo crear el usuario')
    }
  }

  async function confirmarRestablecer() {
    if (!restableciendo) {
      return
    }
    setRestaurando(true)
    try {
      await apiEnviar<void>(`/usuarios/${restableciendo.id}/reset-password`, { method: 'POST' })
      setRestableciendo(null)
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo restablecer la contraseña')
    } finally {
      setRestaurando(false)
    }
  }

  async function confirmarEliminar() {
    if (!eliminando) {
      return
    }
    setBorrando(true)
    try {
      await apiEliminar(`/usuarios/${eliminando.id}`)
      setEliminando(null)
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo eliminar el usuario')
    } finally {
      setBorrando(false)
    }
  }

  const paginacion = usePaginacion(usuarios)

  return (
    <section>
      <Barra titulo="Usuarios" detalle="El alta deja la contraseña 123456a y obliga a cambiarla en el primer ingreso.">
        <button type="button" className="btn primary" onClick={() => setCreando(true)}>Nuevo usuario</button>
      </Barra>
      <Aviso mensaje={error} />
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Roles</th>
              <th>Clave pendiente</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.nombre}</td>
                <td>{usuario.username}</td>
                <td>{usuario.roles.join(', ')}</td>
                <td>{usuario.mustChangePassword ? 'Sí' : 'No'}</td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setRestableciendo(usuario)}>
                    Restablecer clave
                  </button>
                  {usuario.username !== sesion?.username ? (
                    <button type="button" className="btn ghost" onClick={() => setEliminando(usuario)}>
                      Eliminar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {usuarios.length === 0 ? <p className="vacio">No hay usuarios para mostrar.</p> : null}
      {creando ? (
        <Dialogo titulo="Nuevo usuario" onCerrar={() => setCreando(false)}>
          <form className="grilla" onSubmit={(event) => void guardar(event)}>
            <Campo etiqueta="Nombre y apellido">
              <input name="nombre" required placeholder="Nombre y Apellido" />
            </Campo>
            <p className="detalle">El usuario se arma con la inicial y el apellido. Ejemplo: jperez.</p>
            {ROLES.map((rol) => (
              <label key={rol} className="check">
                <input name={rol} type="checkbox" defaultChecked={rol === 'OPERADOR'} />
                {rol}
              </label>
            ))}
            <div className="dialogo-acciones">
              <button className="btn primary" type="submit">Guardar</button>
            </div>
          </form>
        </Dialogo>
      ) : null}
      {restableciendo ? (
        <Dialogo titulo="Restablecer clave" clase="angosto" onCerrar={() => setRestableciendo(null)}>
          <p>
            La contraseña de {restableciendo.nombre} ({restableciendo.username}) quedará en 123456a.
            En el próximo ingreso tendrá que cambiarla.
          </p>
          <div className="dialogo-acciones">
            <button type="button" className="btn ghost" onClick={() => setRestableciendo(null)} disabled={restaurando}>
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={() => void confirmarRestablecer()} disabled={restaurando}>
              {restaurando ? 'Restableciendo…' : 'Restablecer'}
            </button>
          </div>
        </Dialogo>
      ) : null}
      {eliminando ? (
        <Dialogo titulo="Eliminar usuario" clase="angosto" onCerrar={() => setEliminando(null)}>
          <p>
            Se eliminará a {eliminando.nombre} ({eliminando.username}). No podrá volver a ingresar.
          </p>
          <div className="dialogo-acciones">
            <button type="button" className="btn ghost" onClick={() => setEliminando(null)} disabled={borrando}>
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={() => void confirmarEliminar()} disabled={borrando}>
              {borrando ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </Dialogo>
      ) : null}
    </section>
  )
}
