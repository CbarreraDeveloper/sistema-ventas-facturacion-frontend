import { useState } from 'react'

const TAMANO = 20

export type PaginacionEstado<T> = {
  filas: T[]
  pagina: number
  paginas: number
  total: number
  desde: number
  hasta: number
  anterior: () => void
  siguiente: () => void
}

export function usePaginacion<T>(filas: T[]): PaginacionEstado<T> {
  const clave = filas.map(claveFila).join('\n')
  const [marca, setMarca] = useState(clave)
  const [pagina, setPagina] = useState(1)
  if (marca !== clave) {
    setMarca(clave)
    setPagina(1)
  }
  const paginas = Math.max(1, Math.ceil(filas.length / TAMANO))
  const actual = Math.min(marca === clave ? pagina : 1, paginas)
  const inicio = (actual - 1) * TAMANO
  return {
    filas: filas.slice(inicio, inicio + TAMANO),
    pagina: actual,
    paginas,
    total: filas.length,
    desde: filas.length === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + TAMANO, filas.length),
    anterior: () => setPagina((valor) => Math.max(1, valor - 1)),
    siguiente: () => setPagina((valor) => Math.min(paginas, valor + 1)),
  }
}

export function ControlPaginacion<T>({ paginacion }: { paginacion: PaginacionEstado<T> }) {
  if (paginacion.total === 0) {
    return null
  }
  return (
    <nav className="paginacion" aria-label="Paginación">
      <span>
        {paginacion.desde}–{paginacion.hasta} de {paginacion.total}
      </span>
      <div className="paginacion-controles">
        <button type="button" className="btn" onClick={paginacion.anterior} disabled={paginacion.pagina <= 1}>
          Anterior
        </button>
        <span>
          {paginacion.pagina} / {paginacion.paginas}
        </span>
        <button type="button" className="btn" onClick={paginacion.siguiente} disabled={paginacion.pagina >= paginacion.paginas}>
          Siguiente
        </button>
      </div>
    </nav>
  )
}

function claveFila(fila: unknown): string {
  if (fila && typeof fila === 'object' && 'id' in fila && fila.id != null) {
    return String(fila.id)
  }
  return JSON.stringify(fila)
}
