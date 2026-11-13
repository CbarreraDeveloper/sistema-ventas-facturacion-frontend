import { useEffect, useState } from 'react'
import { apiEnviar, AUTH_EVENT, cargarSesion, guardarSesion } from './api/client'
import type { Sesion, Usuario } from './api/types'
import { Confirmaciones } from './components/Confirmacion'
import { AppShell, esRutaRrhh } from './layout/AppShell'
import { CambiarClavePage, LoginPage } from './pages/AccesoPage'
import { CajaPage } from './pages/CajaPage'
import { ComprasPage } from './pages/ComprasPage'
import { CuentasPage } from './pages/CuentasPage'
import { CuentasPagarPage } from './pages/CuentasPagarPage'
import { AdelantosPage } from './pages/AdelantosPage'
import { AguinaldoPage } from './pages/AguinaldoPage'
import { LiquidacionesFinalesPage } from './pages/LiquidacionesFinalesPage'
import { PlanillaMtessPage } from './pages/PlanillaMtessPage'
import { LiquidacionesPage } from './pages/LiquidacionesPage'
import { AsistenciaPage } from './pages/AsistenciaPage'
import { CasualesPage } from './pages/CasualesPage'
import { ComisionesPage } from './pages/ComisionesPage'
import { EmpleadosPage } from './pages/EmpleadosPage'
import { EmpresaPage } from './pages/EmpresaPage'
import { InicioPage } from './pages/InicioPage'
import { LicenciasPage } from './pages/LicenciasPage'
import { MaterialesPage } from './pages/MaterialesPage'
import { NotasCreditoPage } from './pages/NotasCreditoPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { RemisionesPage } from './pages/RemisionesPage'
import { ReportesPage } from './pages/ReportesPage'
import { RrhhInicioPage } from './pages/RrhhInicioPage'
import { RrhhReportesPage } from './pages/RrhhReportesPage'
import { ConfiguracionRrhhPage } from './pages/ConfiguracionRrhhPage'
import { ClientesPage, ProveedoresPage } from './pages/TercerosPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { VentasPage } from './pages/VentasPage'
import { ViaticosPage } from './pages/ViaticosPage'

function leerRuta(): string {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash || hash === '/') {
    return '/'
  }
  return hash.startsWith('/') ? hash : '/'
}

function Pantalla({ ruta, esAdmin }: { ruta: string; esAdmin: boolean }) {
  if (esRutaRrhh(ruta)) {
    if (!esAdmin) {
      return null
    }
    if (ruta === '/rrhh/empleados') {
      return <EmpleadosPage />
    }
    if (ruta === '/rrhh/casuales') {
      return <CasualesPage />
    }
    if (ruta === '/rrhh/asistencia') {
      return <AsistenciaPage />
    }
    if (ruta === '/rrhh/licencias') {
      return <LicenciasPage />
    }
    if (ruta === '/rrhh/adelantos') {
      return <AdelantosPage />
    }
    if (ruta === '/rrhh/liquidaciones') {
      return <LiquidacionesPage />
    }
    if (ruta === '/rrhh/aguinaldo') {
      return <AguinaldoPage />
    }
    if (ruta === '/rrhh/liquidaciones-finales') {
      return <LiquidacionesFinalesPage />
    }
    if (ruta === '/rrhh/mtess') {
      return <PlanillaMtessPage />
    }
    if (ruta === '/rrhh/viaticos') {
      return <ViaticosPage />
    }
    if (ruta === '/rrhh/comisiones') {
      return <ComisionesPage />
    }
    if (ruta === '/rrhh/reportes') {
      return <RrhhReportesPage />
    }
    if (ruta === '/rrhh/configuracion') {
      return <ConfiguracionRrhhPage />
    }
    return <RrhhInicioPage />
  }
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
  if (ruta === '/reportes') {
    return <ReportesPage />
  }
  if (ruta === '/notas-credito') {
    return <NotasCreditoPage />
  }
  if (ruta === '/remisiones') {
    return <RemisionesPage />
  }
  if (ruta === '/cuentas') {
    return <CuentasPage />
  }
  if (ruta === '/cuentas-pagar') {
    return <CuentasPagarPage />
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

  const esAdmin = sesion?.roles.includes('ADMIN') ?? false
  useEffect(() => {
    if (sesion && !esAdmin && esRutaRrhh(ruta)) {
      window.location.hash = '#/'
    }
  }, [sesion, esAdmin, ruta])

  if (!sesion) {
    return <LoginPage onSesion={setSesion} />
  }
  if (sesion.mustChangePassword) {
    return <CambiarClavePage onSesion={setSesion} />
  }

  return (
    <>
      <AppShell ruta={ruta}>
        <Pantalla ruta={ruta} esAdmin={esAdmin} />
      </AppShell>
      <Confirmaciones />
    </>
  )
}
