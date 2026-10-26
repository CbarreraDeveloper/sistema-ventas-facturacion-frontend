import type { Sesion } from './types'

const apiConfigurada = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
export const apiBaseUrl = apiConfigurada || '/api'
const STORAGE_KEY = 'ventas.sesion'
const AUTH_EVENT = 'ventas-auth'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function cargarSesion(): Sesion | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const sesion = JSON.parse(raw) as Sesion
    return { ...sesion, roles: sesion.roles ?? [] }
  } catch {
    return null
  }
}

export function guardarSesion(sesion: Sesion) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sesion))
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function cerrarSesion() {
  sessionStorage.removeItem(STORAGE_KEY)
  if (window.location.hash !== '#/') {
    window.location.replace('#/')
  }
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export async function salir() {
  try {
    await apiEnviar<void>('/auth/logout', { method: 'POST' })
  } catch {
    // Si el servidor no responde, la sesión igual se cierra en el navegador.
  }
  cerrarSesion()
}

const RENOVAR_ANTES_MS = 20 * 60_000

function venceEn(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload)) as { exp?: number }
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

export async function renovarSesion() {
  const sesion = cargarSesion()
  if (!sesion?.token) {
    return
  }
  const vence = venceEn(sesion.token)
  if (vence !== null && vence - Date.now() > RENOVAR_ANTES_MS) {
    return
  }
  const respuesta = await apiEnviar<{ token: string; roles?: string[]; mustChangePassword: boolean }>(
    '/auth/refresh',
    { method: 'POST' },
  )
  const actual = cargarSesion()
  if (actual?.token === sesion.token) {
    guardarSesion({
      ...actual,
      token: respuesta.token,
      roles: respuesta.roles ?? actual.roles,
      mustChangePassword: respuesta.mustChangePassword,
    })
  }
}

async function leerError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    if (body.message) {
      return body.message
    }
  } catch {
    // La respuesta no trae JSON.
  }
  return `La API respondió ${response.status}`
}

export async function apiEnviar<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const sesion = cargarSesion()
  if (sesion?.token) {
    headers.set('Authorization', `Bearer ${sesion.token}`)
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  if (response.status === 401 && !path.startsWith('/auth/login')) {
    cerrarSesion()
  }
  if (!response.ok) {
    throw new ApiError(response.status, await leerError(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export function apiListar<T>(path: string): Promise<T> {
  return apiEnviar<T>(path)
}

export function apiCrear<T>(path: string, body: unknown): Promise<T> {
  return apiEnviar<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiActualizar<T>(path: string, body: unknown): Promise<T> {
  return apiEnviar<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiEliminar(path: string): Promise<void> {
  return apiEnviar<void>(path, { method: 'DELETE' })
}

function nombreConMarca(nombre: string): string {
  const ahora = new Date()
  const parte = (valor: number) => String(valor).padStart(2, '0')
  const marca = [
    parte(ahora.getDate()),
    parte(ahora.getMonth() + 1),
    String(ahora.getFullYear()),
    parte(ahora.getHours()),
    parte(ahora.getMinutes()),
    parte(ahora.getSeconds()),
  ].join('.')
  const punto = nombre.lastIndexOf('.')
  if (punto <= 0) {
    return `${nombre}-${marca}`
  }
  return `${nombre.slice(0, punto)}-${marca}${nombre.slice(punto)}`
}

function guardarDescarga(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreConMarca(nombre)
  enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function apiDescargarConCuerpo(path: string, body: unknown, nombre: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const sesion = cargarSesion()
  if (sesion?.token) {
    headers.set('Authorization', `Bearer ${sesion.token}`)
  }
  const response = await fetch(`${apiBaseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (response.status === 401) {
    cerrarSesion()
  }
  if (!response.ok) {
    throw new ApiError(response.status, await leerError(response))
  }
  guardarDescarga(await response.blob(), nombre)
}

export async function apiDescargar(path: string, nombre: string) {
  const headers = new Headers()
  const sesion = cargarSesion()
  if (sesion?.token) {
    headers.set('Authorization', `Bearer ${sesion.token}`)
  }
  const response = await fetch(`${apiBaseUrl}${path}`, { headers })
  if (response.status === 401) {
    cerrarSesion()
  }
  if (!response.ok) {
    throw new ApiError(response.status, await leerError(response))
  }
  guardarDescarga(await response.blob(), nombre)
}

export async function apiAbrir(path: string) {
  const ventana = window.open('', '_blank')
  const headers = new Headers()
  const sesion = cargarSesion()
  if (sesion?.token) {
    headers.set('Authorization', `Bearer ${sesion.token}`)
  }
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { headers })
    if (response.status === 401) {
      cerrarSesion()
    }
    if (!response.ok) {
      throw new ApiError(response.status, await leerError(response))
    }
    const url = URL.createObjectURL(await response.blob())
    if (ventana) {
      ventana.location.href = url
    } else {
      window.location.assign(url)
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (causa) {
    ventana?.close()
    throw causa
  }
}

export function dinero(valor: number | null | undefined): string {
  return new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(valor ?? 0)
}

export function cantidad(valor: number | null | undefined): string {
  return new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(valor ?? 0)
}

export function fecha(valor: string | null | undefined): string {
  if (!valor) {
    return '—'
  }
  const [anio, mes, dia] = valor.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

export function fechaHora(valor: string | null | undefined): string {
  if (!valor) {
    return '—'
  }
  return `${fecha(valor)} ${valor.slice(11, 16)}`
}

export function hoy(): string {
  const ahora = new Date()
  const parte = (valor: number) => String(valor).padStart(2, '0')
  return `${ahora.getFullYear()}-${parte(ahora.getMonth() + 1)}-${parte(ahora.getDate())}`
}

export function texto(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return '—'
  }
  return String(valor)
}

export { AUTH_EVENT }
