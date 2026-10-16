import { useEffect, useState } from 'react'
import { apiListar } from '../api/client'
import type { Resumen } from '../api/types'
import { Aviso, Barra } from '../components/ui'

const VACIO: Resumen = { materiales: 0, proveedores: 0, clientes: 0 }

export function InicioPage() {
  const [resumen, setResumen] = useState<Resumen>(VACIO)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiListar<Resumen>('/resumen')
      .then(setResumen)
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo leer el resumen'))
  }, [])

  return (
    <section>
      <Barra
        kicker="Distribuidora"
        titulo="Distriworld"
        detalle="Pisos, sanitarios y materiales. El catálogo ya está cargado."
      />
      <Aviso mensaje={error} />
      <div className="tablero">
        <a className="tarjeta" href="#/materiales">
          <p className="kicker">Catálogo</p>
          <strong>{resumen.materiales}</strong>
          <span>Materiales</span>
        </a>
        <a className="tarjeta" href="#/proveedores">
          <p className="kicker">Abastecimiento</p>
          <strong>{resumen.proveedores}</strong>
          <span>Proveedores</span>
        </a>
        <a className="tarjeta" href="#/clientes">
          <p className="kicker">Cuenta corriente</p>
          <strong>{resumen.clientes}</strong>
          <span>Clientes</span>
        </a>
      </div>
    </section>
  )
}
