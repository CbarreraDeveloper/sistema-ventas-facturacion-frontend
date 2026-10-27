import { useState } from 'react'
import { cantidad, dinero } from '../api/client'
import type { Material, VentaLinea } from '../api/types'
import { etiquetaMaterial } from './etiquetas'
import { sumarTotales } from './Totales'
import { Campo, mascaraMonto, numeroOpcional } from './ui'

export type Renglon = {
  clave: number
  material: Material
  cantidad: string
  precio: string
  descuento: string
}

export type EstadoRenglones = ReturnType<typeof useRenglones>

export function precioDeLista(material: Material, lista: string): number {
  const minorista = material.precioMinorista ?? 0
  if (lista === 'MAYORISTA') {
    return material.precioMayorista ?? minorista
  }
  if (lista === 'ESPECIAL') {
    return material.precioEspecial ?? minorista
  }
  return minorista
}

export function totalRenglon(renglon: Renglon): number {
  const unidades = numeroOpcional(renglon.cantidad) ?? 0
  const precio = numeroOpcional(renglon.precio) ?? 0
  const descuento = numeroOpcional(renglon.descuento) ?? 0
  return Math.round(unidades * precio) - Math.round(descuento)
}

function faltaStock(renglon: Renglon): boolean {
  return renglon.material.controlaStock && (numeroOpcional(renglon.cantidad) ?? 0) > renglon.material.existencia
}

function mascaraCantidad(valor: number): string {
  return mascaraMonto(String(valor).replace('.', ','), 3)
}

export function useRenglones() {
  const [renglones, setRenglones] = useState<Renglon[]>([])
  const [siguiente, setSiguiente] = useState(1)

  const totales = sumarTotales(
    renglones.map((renglon) => ({ total: totalRenglon(renglon), porcentaje: renglon.material.porcentajeIva })),
  )

  function agregar(material: Material, lista: string) {
    setRenglones((actuales) => {
      const existente = actuales.find((renglon) => renglon.material.id === material.id)
      if (existente) {
        const sumada = (numeroOpcional(existente.cantidad) ?? 0) + 1
        return actuales.map((renglon) => (renglon.clave === existente.clave ? { ...renglon, cantidad: mascaraCantidad(sumada) } : renglon))
      }
      return [
        ...actuales,
        {
          clave: siguiente,
          material,
          cantidad: '1',
          precio: mascaraMonto(String(Math.round(precioDeLista(material, lista)))),
          descuento: '',
        },
      ]
    })
    setSiguiente((valor) => valor + 1)
  }

  function cargar(lineas: VentaLinea[], materiales: Material[]): number {
    let faltantes = 0
    const cargados: Renglon[] = []
    lineas.forEach((linea, indice) => {
      const material = materiales.find((item) => item.id === linea.productoId)
      if (!material) {
        faltantes++
        return
      }
      cargados.push({
        clave: indice + 1,
        material,
        cantidad: mascaraCantidad(linea.cantidad),
        precio: mascaraMonto(String(Math.round(linea.precioUnitario))),
        descuento: linea.descuento ? mascaraMonto(String(Math.round(linea.descuento)), 0) : '',
      })
    })
    setRenglones(cargados)
    setSiguiente(lineas.length + 1)
    return faltantes
  }

  function repreciar(lista: string) {
    setRenglones((actuales) =>
      actuales.map((renglon) => ({
        ...renglon,
        precio: mascaraMonto(String(Math.round(precioDeLista(renglon.material, lista)))),
      })),
    )
  }

  function cambiar(clave: number, campo: 'cantidad' | 'precio' | 'descuento', valor: string) {
    setRenglones((actuales) =>
      actuales.map((renglon) =>
        renglon.clave === clave ? { ...renglon, [campo]: mascaraMonto(valor, campo === 'cantidad' ? 3 : 0) } : renglon,
      ),
    )
  }

  function quitar(clave: number) {
    setRenglones((actuales) => actuales.filter((renglon) => renglon.clave !== clave))
  }

  function validar(): string | null {
    if (renglones.length === 0) {
      return 'Cargá al menos un material'
    }
    if (renglones.some((renglon) => !numeroOpcional(renglon.cantidad) || (numeroOpcional(renglon.cantidad) ?? 0) <= 0)) {
      return 'Todas las cantidades deben ser mayores a cero'
    }
    if (renglones.some((renglon) => !numeroOpcional(renglon.precio) || (numeroOpcional(renglon.precio) ?? 0) <= 0)) {
      return 'Hay materiales sin precio. Cargalo en la línea o en Materiales'
    }
    if (renglones.some((renglon) => totalRenglon(renglon) < 0)) {
      return 'Hay un descuento mayor que el importe de su línea'
    }
    return null
  }

  function items() {
    return renglones.map((renglon) => ({
      productoId: renglon.material.id,
      cantidad: numeroOpcional(renglon.cantidad),
      precioUnitario: numeroOpcional(renglon.precio),
      descuento: numeroOpcional(renglon.descuento),
    }))
  }

  return { renglones, totales, agregar, cargar, repreciar, cambiar, quitar, validar, items }
}

export function EditorRenglones({
  estado,
  materiales,
  lista,
  avisarStock,
  onNuevo,
}: {
  estado: EstadoRenglones
  materiales: Material[]
  lista: string
  avisarStock: string
  onNuevo?: () => void
}) {
  const [buscar, setBuscar] = useState('')

  function elegir(valor: string) {
    setBuscar(valor)
    const material = materiales.find((item) => etiquetaMaterial(item) === valor)
    if (material) {
      estado.agregar(material, lista)
      setBuscar('')
    }
  }

  return (
    <>
      <div className="grilla bloque">
        <div className="span">
          <div className={onNuevo ? 'campo-con-accion' : undefined}>
            <Campo etiqueta="Agregar material">
              <input
                list="materiales-renglones"
                value={buscar}
                onChange={(event) => elegir(event.target.value)}
                placeholder="Escribí código o descripción y elegí de la lista"
              />
            </Campo>
            {onNuevo ? (
              <button type="button" className="btn" title="Registrar un material nuevo" onClick={onNuevo}>
                Nuevo
              </button>
            ) : null}
          </div>
          <datalist id="materiales-renglones">
            {materiales.map((material) => (
              <option key={material.id} value={etiquetaMaterial(material)} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="tabla-contenedor bloque">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th className="numero">Stock</th>
              <th className="numero">Cantidad</th>
              <th className="numero">Precio unitario</th>
              <th className="numero">Descuento</th>
              <th className="numero">IVA</th>
              <th className="numero">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {estado.renglones.map((renglon) => (
              <tr key={renglon.clave}>
                <td>{renglon.material.codigo}</td>
                <td>{renglon.material.descripcion}</td>
                <td className={faltaStock(renglon) ? 'numero falta' : 'numero'}>
                  {renglon.material.controlaStock ? cantidad(renglon.material.existencia) : '—'}
                </td>
                <td>
                  <input
                    className="monto"
                    inputMode="decimal"
                    aria-label={`Cantidad de ${renglon.material.codigo}`}
                    value={renglon.cantidad}
                    onChange={(event) => estado.cambiar(renglon.clave, 'cantidad', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="monto"
                    inputMode="numeric"
                    aria-label={`Precio de ${renglon.material.codigo}`}
                    value={renglon.precio}
                    onChange={(event) => estado.cambiar(renglon.clave, 'precio', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="monto"
                    inputMode="numeric"
                    aria-label={`Descuento de ${renglon.material.codigo}`}
                    value={renglon.descuento}
                    onChange={(event) => estado.cambiar(renglon.clave, 'descuento', event.target.value)}
                  />
                </td>
                <td className="numero">{dinero(renglon.material.porcentajeIva)}%</td>
                <td className="numero">{dinero(totalRenglon(renglon))}</td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => estado.quitar(renglon.clave)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {estado.renglones.length === 0 ? <p className="vacio">Agregá los materiales.</p> : null}
      {estado.renglones.some(faltaStock) ? <p className="ayuda">{avisarStock}</p> : null}
    </>
  )
}
