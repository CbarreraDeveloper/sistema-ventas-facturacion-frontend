import { useEffect, useRef, useState, type ReactNode } from 'react'
import { apiListar, cargarSesion, renovarSesion, salir } from '../api/client'

const LATIDO_MS = 60_000

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

const ENLACES = [
  { href: '#/', etiqueta: 'Inicio' },
  { href: '#/presupuestos', etiqueta: 'Presupuestos' },
  { href: '#/ventas', etiqueta: 'Ventas' },
  { href: '#/remisiones', etiqueta: 'Remisiones' },
  { href: '#/notas-credito', etiqueta: 'Notas de crédito' },
  { href: '#/caja', etiqueta: 'Caja' },
  { href: '#/cuentas', etiqueta: 'Cuentas corrientes' },
  { href: '#/materiales', etiqueta: 'Materiales' },
  { href: '#/compras', etiqueta: 'Compras' },
  { href: '#/cuentas-pagar', etiqueta: 'Cuentas a pagar' },
  { href: '#/clientes', etiqueta: 'Clientes' },
  { href: '#/proveedores', etiqueta: 'Proveedores' },
]

export function AppShell({ ruta, children }: { ruta: string; children: ReactNode }) {
  const sesion = cargarSesion()
  const seccion = ruta === '/' ? '' : (ruta.split('/')[1] ?? '')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const mesa = useRef<HTMLElement>(null)

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
          <img className="logo" src="/logo-distriworld.jpg" alt="Distriworld" />
          <div className="marca-texto">
            <strong>Distriworld</strong>
            <span>Pisos y sanitarios</span>
          </div>
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
            {ENLACES.map((enlace) => (
              <a
                key={enlace.href}
                href={enlace.href}
                className={seccion === enlace.href.replace('#/', '') ? 'activo' : undefined}
              >
                {enlace.etiqueta}
              </a>
            ))}
            {sesion?.roles.includes('ADMIN') ? (
              <>
                <a href="#/reportes" className={seccion === 'reportes' ? 'activo' : undefined}>
                  Reportes
                </a>
                <a href="#/empresa" className={seccion === 'empresa' ? 'activo' : undefined}>
                  Empresa
                </a>
                <a href="#/usuarios" className={seccion === 'usuarios' ? 'activo' : undefined}>
                  Usuarios
                </a>
              </>
            ) : null}
          </nav>
          <div className="lado-pie">
            <span>{nombreVisible(sesion?.nombre, sesion?.username)}</span>
            <button type="button" className="btn ghost claro" onClick={() => void salir()}>
              Salir
            </button>
          </div>
        </div>
      </aside>
      <main ref={mesa} className="mesa">
        {children}
      </main>
    </div>
  )
}
