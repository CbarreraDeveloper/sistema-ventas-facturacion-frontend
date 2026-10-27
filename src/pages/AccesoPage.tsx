import type { FormEvent } from 'react'
import { apiEnviar, guardarSesion } from '../api/client'
import type { Sesion } from '../api/types'
import { Aviso } from '../components/ui'
import { useState } from 'react'

type LoginResponse = {
  token: string
  username: string
  nombre?: string
  roles?: string[]
  mustChangePassword: boolean
}

export function LoginPage({ onSesion }: { onSesion: (sesion: Sesion) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [animarLogo] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  async function ingresar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const datos = new FormData(event.currentTarget)
    setEnviando(true)
    setError(null)
    try {
      const respuesta = await apiEnviar<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: String(datos.get('username') ?? ''),
          password: String(datos.get('password') ?? ''),
        }),
      })
      const sesion: Sesion = {
        token: respuesta.token,
        username: respuesta.username,
        nombre: respuesta.nombre,
        mustChangePassword: respuesta.mustChangePassword,
        roles: respuesta.roles ?? [],
      }
      guardarSesion(sesion)
      window.location.hash = '#/'
      onSesion(sesion)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo ingresar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="acceso">
      <form className="panel acceso-panel" onSubmit={ingresar}>
        {animarLogo ? (
          <video className="logo-acceso" src="/logo-reveal.mp4" autoPlay muted playsInline aria-label="Distriworld" />
        ) : (
          <img className="logo-acceso" src="/logo-distriworld.jpg" alt="Distriworld" />
        )}
        <p className="kicker">Pisos y sanitarios</p>
        <h1>Distriworld</h1>
        <p className="lead">Ingrese con el usuario del escritorio.</p>
        <Aviso mensaje={error} />
        <label className="campo">
          <span>Usuario</span>
          <input name="username" autoComplete="username" required />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn primary" type="submit" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}

const CLAVE_GENERICA = '123456a'

export function CambiarClavePage({ onSesion }: { onSesion: (sesion: Sesion) => void }) {
  const [error, setError] = useState<string | null>(null)

  async function cambiar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const datos = new FormData(event.currentTarget)
    const nueva = String(datos.get('nueva') ?? '')
    const repetir = String(datos.get('repetir') ?? '')
    setError(null)
    if (nueva !== repetir) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (nueva === CLAVE_GENERICA) {
      setError('La contraseña nueva tiene que ser distinta de la genérica 123456a.')
      return
    }
    try {
      const respuesta = await apiEnviar<LoginResponse>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: String(datos.get('actual') ?? ''),
          newPassword: nueva,
        }),
      })
      const sesion: Sesion = {
        token: respuesta.token,
        username: respuesta.username,
        nombre: respuesta.nombre,
        mustChangePassword: false,
        roles: respuesta.roles ?? [],
      }
      guardarSesion(sesion)
      window.location.hash = '#/'
      onSesion(sesion)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cambiar la contraseña')
    }
  }

  return (
    <main className="acceso">
      <form className="panel acceso-panel" onSubmit={cambiar}>
        <p className="kicker">Primer ingreso</p>
        <h1>Cambiar contraseña</h1>
        <p className="lead">Definí una contraseña propia. No puede ser la genérica 123456a.</p>
        <Aviso mensaje={error} />
        <label className="campo">
          <span>Contraseña actual</span>
          <input name="actual" type="password" required />
        </label>
        <label className="campo">
          <span>Contraseña nueva</span>
          <input name="nueva" type="password" autoComplete="new-password" minLength={4} required />
        </label>
        <label className="campo">
          <span>Repetir contraseña nueva</span>
          <input name="repetir" type="password" autoComplete="new-password" minLength={4} required />
        </label>
        <button className="btn primary" type="submit">
          Guardar y entrar
        </button>
      </form>
    </main>
  )
}
