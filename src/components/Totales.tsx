import { dinero } from '../api/client'

export type Totales = {
  exento: number
  gravado5: number
  iva5: number
  gravado10: number
  iva10: number
  total: number
}

export function ivaIncluido(total: number, porcentaje: number): number {
  if (!porcentaje) {
    return 0
  }
  return Math.round((total * porcentaje) / (100 + porcentaje))
}

export function sumarTotales(lineas: { total: number; porcentaje: number }[]): Totales {
  const totales: Totales = { exento: 0, gravado5: 0, iva5: 0, gravado10: 0, iva10: 0, total: 0 }
  for (const { total, porcentaje } of lineas) {
    if (porcentaje === 10) {
      totales.gravado10 += total
      totales.iva10 += ivaIncluido(total, 10)
    } else if (porcentaje === 5) {
      totales.gravado5 += total
      totales.iva5 += ivaIncluido(total, 5)
    } else {
      totales.exento += total
    }
    totales.total += total
  }
  return totales
}

export function totalesDe(comprobante: {
  totalExento: number
  totalGravado5: number
  totalGravado10: number
  totalIva5: number
  totalIva10: number
  total: number
}): Totales {
  return {
    exento: comprobante.totalExento,
    gravado5: comprobante.totalGravado5,
    iva5: comprobante.totalIva5,
    gravado10: comprobante.totalGravado10,
    iva10: comprobante.totalIva10,
    total: comprobante.total,
  }
}

export function CuadroTotales({ totales }: { totales: Totales }) {
  return (
    <div className="totales">
      <div>
        <span>Exento</span>
        <strong>{dinero(totales.exento)}</strong>
      </div>
      <div>
        <span>Gravado 5%</span>
        <strong>{dinero(totales.gravado5)}</strong>
      </div>
      <div>
        <span>IVA 5%</span>
        <strong>{dinero(totales.iva5)}</strong>
      </div>
      <div>
        <span>Gravado 10%</span>
        <strong>{dinero(totales.gravado10)}</strong>
      </div>
      <div>
        <span>IVA 10%</span>
        <strong>{dinero(totales.iva10)}</strong>
      </div>
      <div className="total">
        <span>Total</span>
        <strong>{dinero(totales.total)}</strong>
      </div>
    </div>
  )
}
