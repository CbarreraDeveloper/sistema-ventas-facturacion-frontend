import { useState } from 'react'
import { dinero } from '../api/client'
import type { OpcionCatalogo } from '../api/types'
import { mascaraMonto, numeroOpcional, textoOpcional } from './ui'

type LineaCobro = {
  clave: number
  medioId: string
  monto: string
  referencia: string
}

export type PagoPedido = {
  medioPagoId: number
  monto: number
  referencia: string | null
}

export type EstadoCobro = ReturnType<typeof useCobro>

export function useCobro(total: number, medios: OpcionCatalogo[], conVuelto = true) {
  const [lineas, setLineas] = useState<LineaCobro[]>([])
  const [recibido, setRecibido] = useState('')
  const [siguiente, setSiguiente] = useState(1)

  const efectivo = medios.find((medio) => medio.codigo === 'EFECTIVO')
  const otros = medios.filter((medio) => medio.codigo !== 'EFECTIVO')
  const cobradoOtros = lineas.reduce((suma, linea) => suma + (numeroOpcional(linea.monto) ?? 0), 0)
  const efectivoACobrar = total - cobradoOtros
  const recibidoEfectivo = numeroOpcional(recibido)
  const vuelto = recibidoEfectivo == null ? null : recibidoEfectivo - efectivoACobrar

  function agregar() {
    const primero = otros[0]
    if (!primero) {
      return
    }
    setLineas((actuales) => [...actuales, { clave: siguiente, medioId: String(primero.id), monto: '', referencia: '' }])
    setSiguiente((valor) => valor + 1)
  }

  function cambiar(clave: number, campo: 'medioId' | 'monto' | 'referencia', valor: string) {
    setLineas((actuales) =>
      actuales.map((linea) =>
        linea.clave === clave ? { ...linea, [campo]: campo === 'monto' ? mascaraMonto(valor, 0) : valor } : linea,
      ),
    )
  }

  function quitar(clave: number) {
    setLineas((actuales) => actuales.filter((linea) => linea.clave !== clave))
  }

  function validar(): string | null {
    if (lineas.some((linea) => !numeroOpcional(linea.monto))) {
      return 'Indicá el monto de cada medio de pago o quitalo'
    }
    if (efectivoACobrar < 0) {
      return 'Los otros medios de pago superan el total a cobrar'
    }
    if (conVuelto && efectivoACobrar > 0) {
      if (recibidoEfectivo == null) {
        return 'Indicá con cuánto paga el cliente'
      }
      if (recibidoEfectivo < efectivoACobrar) {
        return 'El efectivo entregado no alcanza para el total'
      }
    }
    return null
  }

  function pagos(): PagoPedido[] {
    const resultado: PagoPedido[] = lineas.map((linea) => ({
      medioPagoId: Number(linea.medioId),
      monto: numeroOpcional(linea.monto) ?? 0,
      referencia: textoOpcional(linea.referencia.trim()),
    }))
    if (efectivoACobrar > 0 && efectivo) {
      resultado.push({ medioPagoId: efectivo.id, monto: efectivoACobrar, referencia: null })
    }
    return resultado
  }

  return {
    conVuelto,
    lineas,
    recibido,
    setRecibido,
    otros,
    efectivoACobrar,
    vuelto,
    agregar,
    cambiar,
    quitar,
    validar,
    pagos,
  }
}

export function SeccionCobro({
  cobro,
  detalle,
  titulo = 'Cobro',
}: {
  cobro: EstadoCobro
  detalle: string
  titulo?: string
}) {
  const pideVuelto = cobro.conVuelto && cobro.efectivoACobrar > 0
  return (
    <div className="ficha cobro">
      <div className="seccion-cabecera">
        <div>
          <h3>{titulo}</h3>
          <p>{detalle}</p>
        </div>
        {cobro.otros.length > 0 ? (
          <button type="button" className="btn ghost" onClick={cobro.agregar}>
            Agregar transferencia, cheque o tarjeta
          </button>
        ) : null}
      </div>
      <div className="tabla-contenedor">
        <table className="tabla lineas">
          <thead>
            <tr>
              <th>Medio</th>
              <th className="numero">Monto</th>
              <th>Referencia</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cobro.lineas.map((linea) => (
              <tr key={linea.clave}>
                <td>
                  <select
                    aria-label="Medio de pago"
                    value={linea.medioId}
                    onChange={(event) => cobro.cambiar(linea.clave, 'medioId', event.target.value)}
                  >
                    {cobro.otros.map((medio) => (
                      <option key={medio.id} value={medio.id}>
                        {medio.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="monto"
                    inputMode="numeric"
                    aria-label="Monto cobrado"
                    value={linea.monto}
                    onChange={(event) => cobro.cambiar(linea.clave, 'monto', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    aria-label="Referencia del cobro"
                    value={linea.referencia}
                    maxLength={80}
                    placeholder="N° de operación, cheque o voucher"
                    onChange={(event) => cobro.cambiar(linea.clave, 'referencia', event.target.value)}
                  />
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => cobro.quitar(linea.clave)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td>Efectivo</td>
              <td className={cobro.efectivoACobrar < 0 ? 'numero falta' : 'numero'}>{dinero(cobro.efectivoACobrar)}</td>
              <td>
                {pideVuelto ? (
                  <label className="paga-con">
                    <span>Paga con *</span>
                    <input
                      className="monto"
                      inputMode="numeric"
                      aria-required="true"
                      value={cobro.recibido}
                      placeholder="Ej.: 50.000"
                      onChange={(event) => cobro.setRecibido(mascaraMonto(event.target.value, 0))}
                    />
                  </label>
                ) : null}
              </td>
              <td className="numero vuelto">
                {!pideVuelto || cobro.vuelto == null ? null : cobro.vuelto < 0 ? (
                  <span className="falta">Faltan {dinero(-cobro.vuelto)}</span>
                ) : (
                  <strong>Vuelto {dinero(cobro.vuelto)}</strong>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
