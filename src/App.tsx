import { useEffect, useState } from 'react'
import { apiEnviar, AUTH_EVENT, cargarSesion, guardarSesion } from './api/client'
import type { Sesion, Usuario } from './api/types'
import { AppShell } from './layout/AppShell'
import { CambiarClavePage, LoginPage } from './pages/AccesoPage'
import { CajaPage } from './pages/CajaPage'
import { ComprasPage } from './pages/ComprasPage'
import { CuentasPage } from './pages/CuentasPage'
import { EmpresaPage } from './pages/EmpresaPage'
import { InicioPage } from './pages/InicioPage'
import { MaterialesPage } from './pages/MaterialesPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { ClientesPage, ProveedoresPage } from './pages/TercerosPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { VentasPage } from './pages/VentasPage'

function leerRuta(): string {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash || hash === '/') {
    return '/'
  }
  return hash.startsWith('/') ? hash : '/'
}

function Pantalla({ ruta }: { ruta: string }) {
  if (ruta === '/usuarios') {
    return <UsuariosPage />
  }
  if (ruta === '/materiales') {
    return <MaterialesPage />
  }
  if (ruta === '/empresa') {
    return <EmpresaPage />
  }
  if (ruta === '/ventas') {
    return <VentasPage />
  }
  if (ruta === '/caja') {
    return <CajaPage />
  }
  if (ruta === '/presupuestos') {
    return <PresupuestosPage />
  }
  if (ruta === '/cuentas') {
    return <CuentasPage />
  }
  if (ruta === '/compras') {
    return <ComprasPage />
  }
  if (ruta === '/clientes') {
    return <ClientesPage />
  }
  if (ruta === '/proveedores') {
    return <ProveedoresPage />
  }
  return <InicioPage />
}

export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(cargarSesion)
  const [ruta, setRuta] = useState(leerRuta)

  useEffect(() => {
    const sincronizar = () => setSesion(cargarSesion())
    const cambiarRuta = () => setRuta(leerRuta())
    window.addEventListener(AUTH_EVENT, sincronizar)
    window.addEventListener('hashchange', cambiarRuta)
    if (!window.location.hash) {
      window.location.hash = '#/'
    }
    return () => {
      window.removeEventListener(AUTH_EVENT, sincronizar)
      window.removeEventListener('hashchange', cambiarRuta)
    }
  }, [])

  useEffect(() => {
    if (!sesion || sesion.mustChangePassword) {
      return
    }
    let vigente = true
    apiEnviar<Usuario>('/auth/me')
      .then((perfil) => {
        if (!vigente) {
          return
        }
        const roles = [...(perfil.roles ?? [])].sort()
        const actuales = [...(sesion.roles ?? [])].sort()
        const nombre = perfil.nombre?.trim() ?? ''
        if (
          roles.join(',') !== actuales.join(',')
          || perfil.username !== sesion.username
          || nombre !== (sesion.nombre ?? '')
        ) {
          guardarSesion({ ...sesion, username: perfil.username, nombre, roles })
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [sesion])

  if (!sesion) {
    return <LoginPage onSesion={setSesion} />
  }
  if (sesion.mustChangePassword) {
    return <CambiarClavePage onSesion={setSesion} />
  }

  return (
    <AppShell ruta={ruta}>
      <Pantalla ruta={ruta} />
    </AppShell>
  )
}
