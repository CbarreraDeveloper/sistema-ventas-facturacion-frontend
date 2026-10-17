import { useEffect, useRef, useState } from 'react'

type Pedido = {
  titulo: string
  mensaje: string
  aceptar: string
  cancelar: string
  peligro: boolean
  responder: (aceptado: boolean) => void
}

type Opciones = {
  titulo: string
  mensaje: string
  aceptar?: string
  cancelar?: string
  peligro?: boolean
}

let mostrar: ((pedido: Pedido) => void) | null = null

export function confirmar(opciones: Opciones): Promise<boolean> {
  return new Promise((resolver) => {
    if (!mostrar) {
      resolver(false)
      return
    }
    mostrar({
      titulo: opciones.titulo,
      mensaje: opciones.mensaje,
      aceptar: opciones.aceptar ?? 'Aceptar',
      cancelar: opciones.cancelar ?? 'Cancelar',
      peligro: opciones.peligro ?? false,
      responder: resolver,
    })
  })
}

export function Confirmaciones() {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const aceptar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    mostrar = setPedido
    return () => {
      mostrar = null
    }
  }, [])

  useEffect(() => {
    if (!pedido) {
      return
    }
    aceptar.current?.focus()
    const teclas = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        responder(false)
      }
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  }, [pedido])

  function responder(aceptado: boolean) {
    pedido?.responder(aceptado)
    setPedido(null)
  }

  if (!pedido) {
    return null
  }

  return (
    <div className="velo confirmacion" onClick={() => responder(false)}>
      <div
        className="dialogo angosto"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        aria-describedby="confirmacion-mensaje"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialogo-cabecera">
          <h2 id="confirmacion-titulo">{pedido.titulo}</h2>
        </header>
        <p id="confirmacion-mensaje" className="confirmacion-mensaje">
          {pedido.mensaje}
        </p>
        <div className="dialogo-acciones">
          <button type="button" className="btn" onClick={() => responder(false)}>
            {pedido.cancelar}
          </button>
          <button
            ref={aceptar}
            type="button"
            className={pedido.peligro ? 'btn peligro' : 'btn primary'}
            onClick={() => responder(true)}
          >
            {pedido.aceptar}
          </button>
        </div>
      </div>
    </div>
  )
}
