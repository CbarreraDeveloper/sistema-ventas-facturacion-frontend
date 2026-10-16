import { useState, type ReactNode } from 'react'

export function Aviso({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) {
    return null
  }
  return <p className="aviso">{mensaje}</p>
}

export function Dialogo({
  titulo,
  onCerrar,
  clase,
  children,
}: {
  titulo: string
  onCerrar: () => void
  clase?: string
  children: ReactNode
}) {
  return (
    <div className="velo" onClick={onCerrar}>
      <div className={clase ? `dialogo ${clase}` : 'dialogo'} role="dialog" aria-modal="true" aria-labelledby="dialogo-titulo" onClick={(event) => event.stopPropagation()}>
        <header className="dialogo-cabecera">
          <h2 id="dialogo-titulo">{titulo}</h2>
          <button type="button" className="btn ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string
  children: ReactNode
}) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
    </label>
  )
}

export function Barra({
  titulo,
  detalle,
  kicker = 'Sistema',
  children,
}: {
  titulo: string
  detalle?: string
  kicker?: string
  children?: ReactNode
}) {
  return (
    <div className="barra">
      <div>
        <p className="kicker">{kicker}</p>
        <h2>{titulo}</h2>
        {detalle ? <p className="detalle">{detalle}</p> : null}
      </div>
      <div className="barra-acciones">{children}</div>
    </div>
  )
}

export function valorInput(form: HTMLFormElement, nombre: string): string {
  const campo = form.elements.namedItem(nombre)
  if (!(campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement || campo instanceof HTMLSelectElement)) {
    return ''
  }
  const valor = campo.value.trim()
  if (campo instanceof HTMLSelectElement || !esTextoLibre(campo)) {
    return valor
  }
  return valor.toLocaleUpperCase('es-PY')
}

export function numeroOpcional(valor: string): number | null {
  const limpio = valor.trim()
  if (!limpio || limpio === '-') {
    return null
  }
  const numero = Number(limpio.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(numero) ? numero : null
}

export function Monto({
  name,
  valor,
  required,
  decimales = 2,
}: {
  name: string
  valor?: number | null
  required?: boolean
  decimales?: number
}) {
  const [texto, setTexto] = useState(() => textoMonto(valor, decimales))
  return (
    <input
      name={name}
      className="monto"
      inputMode="decimal"
      autoComplete="off"
      required={required}
      value={texto}
      onChange={(event) => setTexto(mascaraMonto(event.target.value, decimales))}
    />
  )
}

function esTextoLibre(campo: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (campo instanceof HTMLTextAreaElement) {
    return true
  }
  return campo.type === 'text' && !campo.classList.contains('monto')
}

function textoMonto(valor: number | null | undefined, decimales = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return ''
  }
  return new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: decimales }).format(valor)
}

export function mascaraMonto(entrada: string, decimales = 2): string {
  const negativo = entrada.trim().startsWith('-')
  const limpio = entrada.replace(/[^\d,]/g, '')
  if (!limpio) {
    return negativo ? '-' : ''
  }
  const coma = limpio.indexOf(',')
  const entera = (coma === -1 ? limpio : limpio.slice(0, coma)).replace(/^0+(?=\d)/, '')
  const fraccion = coma === -1 ? '' : limpio.slice(coma + 1).replace(/,/g, '').slice(0, decimales)
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const cuerpo = coma === -1 ? conMiles : `${conMiles || '0'},${fraccion}`
  return negativo ? `-${cuerpo}` : cuerpo
}

export function textoOpcional(valor: string): string | null {
  return valor ? valor : null
}
