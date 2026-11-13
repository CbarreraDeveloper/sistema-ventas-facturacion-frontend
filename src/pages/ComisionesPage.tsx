import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiActualizar, apiCrear, apiEliminar, apiListar, dinero, fecha, hoy } from '../api/client'
import type { CalculoComisiones, Comision, EstadoComision, TasasComision } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, valorInput } from '../components/ui'

const ESTADOS: Record<EstadoComision, string> = {
  PENDIENTE: 'Pendiente',
  EN_LIQUIDACION: 'En liquidación (borrador)',
  LIQUIDADA: 'Pagada con el sueldo',
}

type Filtro = 'TODAS' | EstadoComision

function semanaActual(): { desde: string; hasta: string } {
  const [anio, mes, dia] = hoy().split('-').map(Number)
  const lunes = new Date(anio, mes - 1, dia)
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  const sabado = new Date(lunes)
  sabado.setDate(lunes.getDate() + 5)
  const iso = (valor: Date) =>
    `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`
  return { desde: iso(lunes), hasta: iso(sabado) }
}

function leerPorcentaje(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!limpio) {
    return null
  }
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : Number.NaN
}

function porcentaje(valor: number): string {
  return `${valor.toLocaleString('es-PY', { maximumFractionDigits: 2 })} %`
}

export function ComisionesPage() {
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [error, setError] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('TODAS')
  const [periodo, setPeriodo] = useState(semanaActual)
  const [calculando, setCalculando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [listo, setListo] = useState(false)
  const [viendo, setViendo] = useState<Comision | null>(null)
  const [tasas, setTasas] = useState(false)

  async function cargar() {
    try {
      setComisiones(await apiListar<Comision[]>('/rrhh/comisiones'))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer las comisiones')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function calcular(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCalculando(true)
    try {
      const resultado = await apiCrear<CalculoComisiones>('/rrhh/comisiones/calcular', periodo)
      setAvisos(resultado.avisos)
      setError(null)
      await cargar()
    } catch (causa) {
      setAvisos([])
      setError(causa instanceof Error ? causa.message : 'No se pudieron calcular las comisiones')
    } finally {
      setCalculando(false)
    }
  }

  async function imprimir() {
    if (!periodo.desde || !periodo.hasta) {
      setError('Indicá el período del reporte')
      return
    }
    setImprimiendo(true)
    try {
      await apiAbrir(`/rrhh/comisiones/reporte/pdf?desde=${periodo.desde}&hasta=${periodo.hasta}`)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el reporte')
    } finally {
      setImprimiendo(false)
    }
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtradas = comisiones.filter((comision) => {
    if (filtro !== 'TODAS' && comision.estado !== filtro) {
      return false
    }
    return !consulta || comision.empleado.toLocaleUpperCase('es-PY').includes(consulta)
  })
  const suma = (lista: Comision[]) => lista.reduce((total, comision) => total + comision.total, 0)
  const paginacion = usePaginacion(filtradas)

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Comisiones"
        detalle="Se calculan solas con las facturas comisionadas a cada empleado en Nueva factura y con las que emitió el usuario de cada vendedor, menos sus notas de crédito. Se pagan en la liquidación de sueldo."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Empleado" />
        </label>
        <label className="campo">
          <span>Mostrar</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value as Filtro)}>
            <option value="TODAS">Todas</option>
            {(Object.keys(ESTADOS) as EstadoComision[]).map((estado) => (
              <option key={estado} value={estado}>
                {ESTADOS[estado]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={() => setTasas(true)}>
          Porcentajes
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <form className="periodo" onSubmit={(event) => void calcular(event)}>
        <Campo etiqueta="Ventas desde">
          <input
            type="date"
            required
            value={periodo.desde}
            onChange={(event) => setPeriodo({ ...periodo, desde: event.target.value })}
          />
        </Campo>
        <Campo etiqueta="Hasta">
          <input
            type="date"
            required
            min={periodo.desde}
            value={periodo.hasta}
            onChange={(event) => setPeriodo({ ...periodo, hasta: event.target.value })}
          />
        </Campo>
        <button type="submit" className="btn primary" disabled={calculando}>
          {calculando ? 'Calculando…' : 'Calcular comisiones'}
        </button>
        <button type="button" className="btn" disabled={imprimiendo} onClick={() => void imprimir()}>
          {imprimiendo ? 'Generando…' : 'Imprimir reporte'}
        </button>
        <p className="ayuda">
          Si ya calculaste ese mismo período, se vuelve a calcular y se conserva el ajuste manual. El reporte incluye el
          resumen por empleado y cada factura comisionada del período.
        </p>
      </form>
      {avisos.length > 0 ? (
        <div className="aviso advertencia">
          <ul>
            {avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="totales cuatro">
        <div>
          <span>Comisiones</span>
          <strong>{filtradas.length}</strong>
        </div>
        <div>
          <span>Pendientes de liquidar</span>
          <strong>{dinero(suma(filtradas.filter((comision) => comision.estado !== 'LIQUIDADA')))}</strong>
        </div>
        <div>
          <span>Pagadas con el sueldo</span>
          <strong>{dinero(suma(filtradas.filter((comision) => comision.estado === 'LIQUIDADA')))}</strong>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{dinero(suma(filtradas))}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Período</th>
              <th>Empleado</th>
              <th className="numero">Ventas</th>
              <th className="numero">Notas de crédito</th>
              <th className="numero">Calculada</th>
              <th className="numero">Ajuste</th>
              <th className="numero">Comisión</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((comision) => (
              <tr key={comision.id}>
                <td>
                  {fecha(comision.desde)} al {fecha(comision.hasta)}
                </td>
                <td>
                  {comision.empleado}
                  <small className="sub">
                    {comision.cargo}
                    {comision.usuario ? ` · usuario ${comision.usuario}` : ''}
                  </small>
                </td>
                <td className="numero">{dinero(comision.ventas)}</td>
                <td className="numero">{comision.notasCredito ? <span className="resta">{dinero(comision.notasCredito)}</span> : '—'}</td>
                <td className="numero">{dinero(comision.calculada)}</td>
                <td className="numero">{comision.ajuste ? dinero(comision.ajuste) : '—'}</td>
                <td className="numero">
                  <strong>{dinero(comision.total)}</strong>
                </td>
                <td>
                  <span className={comision.estado === 'LIQUIDADA' ? 'estado' : 'estado alerta'}>
                    {comision.estado === 'LIQUIDADA' && comision.fechaLiquidada
                      ? `Pagada el ${fecha(comision.fechaLiquidada)}`
                      : ESTADOS[comision.estado]}
                  </span>
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setViendo(comision)}>
                    {comision.estado === 'PENDIENTE' ? 'Ver y ajustar' : 'Ver'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && comisiones.length === 0 ? (
        <p className="vacio">Todavía no hay comisiones. Configurá los porcentajes y calculá un período.</p>
      ) : null}
      {listo && comisiones.length > 0 && filtradas.length === 0 ? <p className="vacio">Ninguna comisión coincide con el filtro.</p> : null}

      {viendo ? (
        <DetalleComision
          comision={viendo}
          onCerrar={() => setViendo(null)}
          onCambio={() => {
            setViendo(null)
            void cargar()
          }}
        />
      ) : null}
      {tasas ? <TasasDialogo onCerrar={() => setTasas(false)} /> : null}
    </section>
  )
}

function DetalleComision({ comision, onCerrar, onCambio }: { comision: Comision; onCerrar: () => void; onCambio: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [ajuste, setAjuste] = useState<number | null>(comision.ajuste)
  const editable = comision.estado === 'PENDIENTE'

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const motivo = valorInput(event.currentTarget, 'motivo').trim()
    setGuardando(true)
    try {
      await apiActualizar<Comision>(`/rrhh/comisiones/${comision.id}/ajuste`, { ajuste: ajuste ?? 0, motivo: motivo || null })
      onCambio()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el ajuste')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (
      !(await confirmar({
        titulo: 'Eliminar comisión',
        mensaje: `¿Eliminar la comisión de ${comision.empleado} del ${fecha(comision.desde)} al ${fecha(comision.hasta)}? Podés volver a calcularla después.`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return
    }
    setGuardando(true)
    try {
      await apiEliminar(`/rrhh/comisiones/${comision.id}`)
      onCambio()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo eliminar la comisión')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={`Comisión de ${comision.empleado}`} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <p className="ayuda">
          Ventas del {fecha(comision.desde)} al {fecha(comision.hasta)}
          {comision.usuario ? ` facturadas por el usuario ${comision.usuario}` : ''}. Las facturas comisionadas a mano al
          emitirlas figuran como FACTURAS COMISIONADAS. Importes con IVA incluido.
        </p>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Rubro</th>
                <th className="numero">Ventas</th>
                <th className="numero">Notas de crédito</th>
                <th className="numero">%</th>
                <th className="numero">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {comision.detalles.map((detalle) => (
                <tr key={detalle.rubro}>
                  <td>{detalle.rubro}</td>
                  <td className="numero">{dinero(detalle.ventas)}</td>
                  <td className="numero">{detalle.notasCredito ? <span className="resta">{dinero(detalle.notasCredito)}</span> : '—'}</td>
                  <td className="numero">{porcentaje(detalle.porcentaje)}</td>
                  <td className="numero">{dinero(detalle.comision)}</td>
                </tr>
              ))}
              {comision.detalles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="vacio">
                    No facturó en el período.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4}>Calculada</th>
                <th className="numero">{dinero(comision.calculada)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grilla">
          <Campo etiqueta="Ajuste manual (Gs., negativo para restar)">
            {editable ? <Monto name="ajuste" valor={comision.ajuste} decimales={0} onValor={setAjuste} /> : <strong>{dinero(comision.ajuste)}</strong>}
          </Campo>
          <Campo etiqueta="Comisión a pagar">
            <strong>{dinero(comision.calculada + (editable ? ajuste ?? 0 : comision.ajuste))} Gs.</strong>
          </Campo>
          <div className="span">
            <Campo etiqueta="Motivo del ajuste">
              {editable ? (
                <input name="motivo" maxLength={200} placeholder="Venta cobrada en otra caja, corrección…" defaultValue={comision.motivoAjuste ?? ''} />
              ) : (
                <span>{comision.motivoAjuste ?? '—'}</span>
              )}
            </Campo>
          </div>
        </div>
        {!editable ? (
          <p className="ayuda">
            {comision.estado === 'LIQUIDADA'
              ? 'Ya se pagó con el sueldo. Para cambiarla, anulá esa liquidación.'
              : 'Está en una liquidación de sueldo en borrador. Para cambiarla, eliminá ese borrador o quitá la línea de comisión.'}
          </p>
        ) : null}
        <div className="dialogo-acciones">
          {editable ? (
            <button className="btn peligro" type="button" disabled={guardando} onClick={() => void eliminar()}>
              Eliminar
            </button>
          ) : null}
          <button className="btn" type="button" onClick={onCerrar}>
            {editable ? 'Cancelar' : 'Cerrar'}
          </button>
          {editable ? (
            <button className="btn primary" type="submit" disabled={guardando}>
              Guardar ajuste
            </button>
          ) : null}
        </div>
      </form>
    </Dialogo>
  )
}

function TasasDialogo({ onCerrar }: { onCerrar: () => void }) {
  const [tasas, setTasas] = useState<TasasComision | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    apiListar<TasasComision>('/rrhh/comisiones/tasas')
      .then(setTasas)
      .catch((causa) => setError(causa instanceof Error ? causa.message : 'No se pudieron leer los porcentajes'))
  }, [])

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tasas) {
      return
    }
    const form = event.currentTarget
    const general = leerPorcentaje(valorInput(form, 'general'))
    if (general == null || !(general >= 0 && general <= 100)) {
      setError('El porcentaje general debe estar entre 0 y 100')
      return
    }
    const rubros = tasas.rubros.map((rubro) => ({
      rubroId: rubro.rubroId,
      rubro: rubro.rubro,
      porcentaje: leerPorcentaje(valorInput(form, `rubro-${rubro.rubroId}`)),
    }))
    if (rubros.some((rubro) => rubro.porcentaje != null && !(rubro.porcentaje >= 0 && rubro.porcentaje <= 100))) {
      setError('Los porcentajes deben estar entre 0 y 100')
      return
    }
    setGuardando(true)
    try {
      await apiActualizar<TasasComision>('/rrhh/comisiones/tasas', { general, rubros })
      onCerrar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron guardar los porcentajes')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo="Porcentajes de comisión" onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        {tasas ? (
          <>
            <Campo etiqueta="Porcentaje general (%)">
              <input name="general" inputMode="decimal" required defaultValue={tasas.general?.toString().replace('.', ',') ?? ''} placeholder="5" />
            </Campo>
            <p className="ayuda">Se aplica a los productos sin rubro y a los rubros que dejes vacíos.</p>
            {tasas.rubros.map((rubro) => (
              <Campo key={rubro.rubroId} etiqueta={`${rubro.rubro} (%)`}>
                <input
                  name={`rubro-${rubro.rubroId}`}
                  inputMode="decimal"
                  defaultValue={rubro.porcentaje?.toString().replace('.', ',') ?? ''}
                  placeholder="General"
                />
              </Campo>
            ))}
            {tasas.rubros.length === 0 ? <p className="ayuda">No hay rubros activos cargados en materiales.</p> : null}
          </>
        ) : (
          <p className="ayuda">Cargando…</p>
        )}
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando || !tasas}>
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
