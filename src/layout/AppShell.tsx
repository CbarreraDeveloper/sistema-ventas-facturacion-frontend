import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Banknote,
  BadgePercent,
  BookOpen,
  Building2,
  CalendarCheck,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Factory,
  FileMinus,
  FileText,
  FileSpreadsheet,
  Gift,
  HandCoins,
  Handshake,
  House,
  IdCard,
  LayoutDashboard,
  Luggage,
  Package,
  Palmtree,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  UserCog,
  UserMinus,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { apiListar, cargarSesion, renovarSesion, salir } from '../api/client'

const LATIDO_MS = 60_000
const INACTIVIDAD_MS = 3 * 60_000
const EVENTOS_ACTIVIDAD = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

function nombreVisible(nombre: string | undefined, usuario: string | undefined): string {
  const texto = (nombre?.trim() || usuario || '').trim()
  if (!texto || texto !== texto.toLocaleUpperCase('es-PY')) {
    return texto
  }
  return texto
    .toLocaleLowerCase('es-PY')
    .split(/([\s-]+)/)
    .map((parte) => {
      if (!parte || parte.trim() === '' || parte === '-') {
        return parte
      }
      return parte.charAt(0).toLocaleUpperCase('es-PY') + parte.slice(1)
    })
    .join('')
}

type Enlace = { ruta: string; etiqueta: string; icono: LucideIcon; soloAdmin?: boolean }
type Grupo = { id: 'ventas' | 'rrhh'; etiqueta: string; icono: LucideIcon; soloAdmin?: boolean; enlaces: Enlace[] }

const GRUPOS: Grupo[] = [
  {
    id: 'ventas',
    etiqueta: 'Ventas',
    icono: ShoppingCart,
    enlaces: [
      { ruta: '/', etiqueta: 'Inicio', icono: House },
      { ruta: '/presupuestos', etiqueta: 'Presupuestos', icono: FileText },
      { ruta: '/ventas', etiqueta: 'Ventas', icono: Receipt },
      { ruta: '/remisiones', etiqueta: 'Remisiones', icono: Truck },
      { ruta: '/notas-credito', etiqueta: 'Notas de crédito', icono: FileMinus },
      { ruta: '/caja', etiqueta: 'Caja', icono: Wallet },
      { ruta: '/cuentas', etiqueta: 'Cuentas corrientes', icono: BookOpen },
      { ruta: '/materiales', etiqueta: 'Materiales', icono: Package },
      { ruta: '/compras', etiqueta: 'Compras', icono: ShoppingBag },
      { ruta: '/cuentas-pagar', etiqueta: 'Cuentas a pagar', icono: CreditCard },
      { ruta: '/clientes', etiqueta: 'Clientes', icono: UserRound },
      { ruta: '/proveedores', etiqueta: 'Proveedores', icono: Factory },
      { ruta: '/reportes', etiqueta: 'Reportes', icono: ChartColumn, soloAdmin: true },
      { ruta: '/empresa', etiqueta: 'Empresa', icono: Building2, soloAdmin: true },
      { ruta: '/usuarios', etiqueta: 'Usuarios', icono: UserCog, soloAdmin: true },
    ],
  },
  {
    id: 'rrhh',
    etiqueta: 'RR.HH',
    icono: Users,
    soloAdmin: true,
    enlaces: [
      { ruta: '/rrhh', etiqueta: 'Inicio RR.HH', icono: LayoutDashboard },
      { ruta: '/rrhh/empleados', etiqueta: 'Empleados', icono: IdCard },
      { ruta: '/rrhh/casuales', etiqueta: 'Vendedores casuales', icono: Handshake },
      { ruta: '/rrhh/asistencia', etiqueta: 'Asistencia', icono: CalendarCheck },
      { ruta: '/rrhh/licencias', etiqueta: 'Vacaciones y permisos', icono: Palmtree },
      { ruta: '/rrhh/viaticos', etiqueta: 'Viáticos', icono: Luggage },
      { ruta: '/rrhh/adelantos', etiqueta: 'Adelantos y préstamos', icono: HandCoins },
      { ruta: '/rrhh/comisiones', etiqueta: 'Comisiones', icono: BadgePercent },
      { ruta: '/rrhh/liquidaciones', etiqueta: 'Sueldos y liquidación', icono: Banknote },
      { ruta: '/rrhh/aguinaldo', etiqueta: 'Aguinaldo', icono: Gift },
      { ruta: '/rrhh/liquidaciones-finales', etiqueta: 'Liquidación final', icono: UserMinus },
      { ruta: '/rrhh/mtess', etiqueta: 'Planillas MTESS', icono: FileSpreadsheet },
      { ruta: '/rrhh/reportes', etiqueta: 'Reportes', icono: ChartColumn },
      { ruta: '/rrhh/configuracion', etiqueta: 'Configuración', icono: Settings },
    ],
  },
]

export function esRutaRrhh(ruta: string): boolean {
  return ruta === '/rrhh' || ruta.startsWith('/rrhh/')
}

function grupoDe(ruta: string): Grupo['id'] {
  return esRutaRrhh(ruta) ? 'rrhh' : 'ventas'
}

function enlaceActivo(enlace: string, ruta: string): boolean {
  if (enlace === '/' || enlace === '/rrhh') {
    return ruta === enlace
  }
  return ruta === enlace || ruta.startsWith(`${enlace}/`)
}

export function AppShell({ ruta, children }: { ruta: string; children: ReactNode }) {
  const sesion = cargarSesion()
  const esAdmin = sesion?.roles.includes('ADMIN') ?? false
  const [menuAbierto, setMenuAbierto] = useState(false)
  const grupoActual = grupoDe(ruta)
  const [abierto, setAbierto] = useState<Grupo['id'] | null>(null)
  const grupoPrevio = useRef(grupoActual)
  const mesa = useRef<HTMLElement>(null)
  const [animarLogo, setAnimarLogo] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const enBienvenida = abierto === null

  const irABienvenida = () => {
    setAbierto(null)
    setMenuAbierto(false)
  }

  useEffect(() => {
    if (grupoPrevio.current !== grupoActual) {
      grupoPrevio.current = grupoActual
      setAbierto(grupoActual)
    }
  }, [grupoActual])

  useEffect(() => {
    if (!enBienvenida) {
      setAnimarLogo(false)
    }
  }, [enBienvenida])

  useEffect(() => {
    let ultimaActividad = Date.now()
    const registrar = () => {
      ultimaActividad = Date.now()
    }
    const revisar = window.setInterval(() => {
      if (Date.now() - ultimaActividad >= INACTIVIDAD_MS) {
        ultimaActividad = Date.now()
        setAbierto(null)
        setMenuAbierto(false)
      }
    }, 10_000)
    EVENTOS_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, registrar, { passive: true }))
    return () => {
      window.clearInterval(revisar)
      EVENTOS_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, registrar))
    }
  }, [])

  useEffect(() => {
    setMenuAbierto(false)
    mesa.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [ruta])

  useEffect(() => {
    const latir = () => {
      renovarSesion()
        .then(() => apiListar('/auth/me'))
        .catch(() => undefined)
    }
    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        latir()
      }
    }
    const latido = window.setInterval(latir, LATIDO_MS)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(latido)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])

  useEffect(() => {
    const subir = (event: Event) => {
      const campo = event.target
      if (!(campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement)) {
        return
      }
      if (!campo.closest('.mesa') || campo.classList.contains('monto')) {
        return
      }
      const tipo = campo instanceof HTMLInputElement ? campo.type : 'textarea'
      if (tipo === 'password' || tipo === 'date' || tipo === 'number' || tipo === 'checkbox' || tipo === 'email') {
        return
      }
      const siguiente = campo.value.toLocaleUpperCase('es-PY')
      if (siguiente === campo.value) {
        return
      }
      const inicio = campo.selectionStart
      const fin = campo.selectionEnd
      campo.value = siguiente
      if (inicio !== null && fin !== null) {
        campo.setSelectionRange(inicio, fin)
      }
    }
    document.addEventListener('input', subir)
    return () => document.removeEventListener('input', subir)
  }, [])

  return (
    <div className="desk">
      {menuAbierto ? (
        <button type="button" className="cortina" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} />
      ) : null}
      <aside className={menuAbierto ? 'lado abierto' : 'lado'}>
        <div className="marca">
          <button type="button" className="marca-inicio" title="Ir a la bienvenida" onClick={irABienvenida}>
            <img className="logo" src="/logo-distriworld.jpg" alt="Distriworld" />
            <div className="marca-texto">
              <strong>Distriworld</strong>
              <span>Pisos y sanitarios</span>
            </div>
          </button>
          <button
            type="button"
            className="btn ghost claro menu-toggle"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            {menuAbierto ? 'Cerrar' : 'Menú'}
          </button>
        </div>
        <div className="menu">
          <nav>
            {GRUPOS.filter((grupo) => esAdmin || !grupo.soloAdmin).map((grupo) => (
              <div key={grupo.id} className="grupo-menu">
                <button
                  type="button"
                  className={grupoActual === grupo.id ? 'grupo-titulo actual' : 'grupo-titulo'}
                  aria-expanded={abierto === grupo.id}
                  onClick={() => {
                    if (abierto === grupo.id) {
                      setAbierto(null)
                      return
                    }
                    setAbierto(grupo.id)
                    if (grupoActual !== grupo.id) {
                      window.location.hash = `#${grupo.enlaces[0].ruta}`
                    }
                  }}
                >
                  <grupo.icono className="icono" aria-hidden="true" />
                  <span>{grupo.etiqueta}</span>
                  {abierto === grupo.id ? (
                    <ChevronDown className="icono flecha" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="icono flecha" aria-hidden="true" />
                  )}
                </button>
                {abierto === grupo.id
                  ? grupo.enlaces
                      .filter((enlace) => esAdmin || !enlace.soloAdmin)
                      .map((enlace) => (
                        <a
                          key={enlace.ruta}
                          href={`#${enlace.ruta}`}
                          className={enlaceActivo(enlace.ruta, ruta) ? 'activo' : undefined}
                        >
                          <enlace.icono className="icono" aria-hidden="true" />
                          <span>{enlace.etiqueta}</span>
                        </a>
                      ))
                  : null}
              </div>
            ))}
          </nav>
          <div className="lado-pie">
            <span>{nombreVisible(sesion?.nombre, sesion?.username)}</span>
            <button type="button" className="btn ghost claro" onClick={() => void salir()}>
              Salir
            </button>
          </div>
        </div>
      </aside>
      <main ref={mesa} className={enBienvenida ? 'mesa vacia' : 'mesa'}>
        {enBienvenida ? (
          <div className="marca-agua" aria-hidden="true">
            {animarLogo ? (
              <video src="/logo-reveal.mp4" autoPlay muted playsInline onEnded={() => setAnimarLogo(false)} />
            ) : (
              <img src="/logo-distriworld.jpg" alt="" />
            )}
          </div>
        ) : null}
        <div hidden={enBienvenida}>{children}</div>
      </main>
    </div>
  )
}
