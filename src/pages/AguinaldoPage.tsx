import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiActualizar, apiEliminar, apiEnviar, apiListar, dinero, fecha, hoy } from '../api/client'
import type { Aguinaldo, CalculoAguinaldo, FormaPagoSueldo } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { Aviso, Barra, Campo, Dialogo, Monto } from '../components/ui'
import { FORMAS } from './LiquidacionesPage'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function AguinaldoPage() {
  const anioActual = Number(hoy().slice(0, 4))
  const [anio, setAnio] = useState(anioActual)
  const [aguinaldos, setAguinaldos] = useState<Aguinaldo[]>([])
  const [avisos, setAvisos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [listo, setListo] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [pagandoTodos, setPagandoTodos] = useState(false)
  const [abierto, setAbierto] = useState<number | null>(null)

  async function cargar(elegido = anio) {
    try {
      setAguinaldos(await apiListar<Aguinaldo[]>(`/rrhh/aguinaldos?anio=${elegido}`))
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer el aguinaldo')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    setAvisos([])
    void cargar(anio)
  }, [anio])

  async function calcular() {
    setCalculando(true)
    try {
      const resultado = await apiEnviar<CalculoAguinaldo>('/rrhh/aguinaldos/calcular', {
        method: 'POST',
        body: JSON.stringify({ anio }),
      })
      setAguinaldos(resultado.aguinaldos)
      setAvisos(resultado.avisos)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo calcular el aguinaldo')
    } finally {
      setCalculando(false)
    }
  }

  async function imprimir(camino: string) {
    setImprimiendo(true)
    try {
      await apiAbrir(`/rrhh/aguinaldos/${camino}`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF')
    } finally {
      setImprimiendo(false)
    }
  }

  function reemplazar(actualizado: Aguinaldo) {
    setAguinaldos((lista) => lista.map((item) => (item.id === actualizado.id ? actualizado : item)))
  }

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const visibles = aguinaldos.filter((item) => !consulta || item.empleado.toLocaleUpperCase('es-PY').includes(consulta))
  const total = aguinaldos.reduce((suma, item) => suma + item.monto, 0)
  const pagado = aguinaldos.filter((item) => item.fechaPago).reduce((suma, item) => suma + item.monto, 0)
  const pendientes = aguinaldos.filter((item) => !item.fechaPago && item.monto > 0)
  const seleccionado = aguinaldos.find((item) => item.id === abierto) ?? null

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Aguinaldo"
        detalle="Doceava parte de las remuneraciones del año (art. 243 del Código del Trabajo). Se paga hasta el 31 de diciembre."
      >
        <label className="campo">
          <span>Año</span>
          <select value={anio} onChange={(event) => setAnio(Number(event.target.value))}>
            {[0, 1, 2, 3, 4].map((atras) => (
              <option key={atras} value={anioActual - atras}>
                {anioActual - atras}
              </option>
            ))}
          </select>
        </label>
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Empleado" />
        </label>
        <button type="button" className="btn primary" disabled={calculando} onClick={() => void calcular()}>
          {calculando ? 'Calculando…' : aguinaldos.length > 0 ? 'Recalcular' : 'Calcular aguinaldo'}
        </button>
      </Barra>
      <Aviso mensaje={error} />
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
          <span>Empleados</span>
          <strong>{aguinaldos.length}</strong>
        </div>
        <div>
          <span>Pagado</span>
          <strong>{dinero(pagado)}</strong>
        </div>
        <div>
          <span>Pendiente de pago</span>
          <strong>{dinero(total - pagado)}</strong>
        </div>
        <div className="total">
          <span>Total aguinaldo {anio}</span>
          <strong>{dinero(total)}</strong>
        </div>
      </div>

      {aguinaldos.length > 0 ? (
        <div className="acciones">
          <button type="button" className="btn" disabled={pendientes.length === 0} onClick={() => setPagandoTodos(true)}>
            Pagar todos
          </button>
          <button type="button" className="btn" disabled={imprimiendo} onClick={() => void imprimir(`recibos/pdf?anio=${anio}`)}>
            Imprimir recibos
          </button>
          <button type="button" className="btn" disabled={imprimiendo} onClick={() => void imprimir(`planilla/pdf?anio=${anio}`)}>
            Imprimir planilla
          </button>
        </div>
      ) : null}

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Período</th>
              <th className="numero">Remuneraciones en el sistema</th>
              <th className="numero">Otras</th>
              <th className="numero">Total del año</th>
              <th className="numero">Aguinaldo</th>
              <th>Pago</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.empleado}
                  <small className="sub">{item.cargo}</small>
                </td>
                <td>
                  {fecha(item.desde)}
                  <small className="sub">al {fecha(item.hasta)}</small>
                </td>
                <td className="numero">{dinero(item.remuneraciones)}</td>
                <td className="numero">
                  {item.otrasRemuneraciones > 0 ? dinero(item.otrasRemuneraciones) : '—'}
                  {item.notaOtras ? <small className="sub">{item.notaOtras}</small> : null}
                </td>
                <td className="numero">{dinero(item.base)}</td>
                <td className="numero">
                  <strong>{dinero(item.monto)}</strong>
                </td>
                <td>
                  {item.fechaPago ? (
                    <>
                      <span className="estado">Pagado</span>
                      <small className="sub">
                        {fecha(item.fechaPago)} · {FORMAS[item.formaPago ?? 'EFECTIVO']}
                      </small>
                    </>
                  ) : (
                    <span className="estado alerta">Pendiente</span>
                  )}
                </td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setAbierto(item.id)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listo && aguinaldos.length === 0 ? (
        <p className="vacio">Todavía no se calculó el aguinaldo de {anio}. Usá “Calcular aguinaldo”.</p>
      ) : null}
      <p className="ayuda">
        Se suman las liquidaciones confirmadas del año (sueldo, horas extra y comisiones, menos ausencias); los viáticos no
        forman parte. Cada liquidación cuenta en el mes en que termina. Si un empleado cobró meses antes de usar el sistema,
        cargalos como “Otras remuneraciones”. Recalcular actualiza los pendientes y respeta lo cargado a mano; los pagados no
        cambian. El aguinaldo no tiene descuento de IPS y su pago no mueve la caja.
      </p>

      {pagandoTodos ? (
        <PagarTodos
          anio={anio}
          pendientes={pendientes}
          onCerrar={() => setPagandoTodos(false)}
          onPagado={() => {
            setPagandoTodos(false)
            void cargar()
          }}
        />
      ) : null}
      {seleccionado ? (
        <DetalleAguinaldo
          aguinaldo={seleccionado}
          onCambio={reemplazar}
          onEliminado={() => {
            setAbierto(null)
            void cargar()
          }}
          onCerrar={() => setAbierto(null)}
        />
      ) : null}
    </section>
  )
}

function PagarTodos({
  anio,
  pendientes,
  onCerrar,
  onPagado,
}: {
  anio: number
  pendientes: Aguinaldo[]
  onCerrar: () => void
  onPagado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [forma, setForma] = useState<FormaPagoSueldo>('EFECTIVO')
  const [diaPago, setDiaPago] = useState(hoy())
  const monto = pendientes.reduce((suma, item) => suma + item.monto, 0)

  async function pagar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)
    try {
      await apiEnviar<Aguinaldo[]>(`/rrhh/aguinaldos/pago?anio=${anio}`, {
        method: 'POST',
        body: JSON.stringify({ fecha: diaPago, forma }),
      })
      onPagado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron registrar los pagos')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo={`Pagar aguinaldo ${anio}`} onCerrar={onCerrar}>
      <form onSubmit={(event) => void pagar(event)}>
        <Aviso mensaje={error} />
        <p className="ayuda">
          Se registra el pago de {pendientes.length === 1 ? '1 aguinaldo pendiente' : `${pendientes.length} aguinaldos pendientes`} por{' '}
          <strong>{dinero(monto)} Gs.</strong> con la misma fecha y forma de pago. Revisá antes que estén cargadas las otras
          remuneraciones de quien corresponda.
        </p>
        <CamposPago anio={anio} diaPago={diaPago} forma={forma} onDia={setDiaPago} onForma={setForma} />
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Pagar {pendientes.length}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function CamposPago({
  anio,
  diaPago,
  forma,
  onDia,
  onForma,
}: {
  anio: number
  diaPago: string
  forma: FormaPagoSueldo
  onDia: (valor: string) => void
  onForma: (valor: FormaPagoSueldo) => void
}) {
  return (
    <div className="grilla">
      <Campo etiqueta="Fecha de pago">
        <input type="date" required min={`${anio}-01-01`} max={hoy()} value={diaPago} onChange={(event) => onDia(event.target.value)} />
      </Campo>
      <Campo etiqueta="Forma de pago">
        <select value={forma} onChange={(event) => onForma(event.target.value as FormaPagoSueldo)}>
          {(Object.keys(FORMAS) as FormaPagoSueldo[]).map((valor) => (
            <option key={valor} value={valor}>
              {FORMAS[valor]}
            </option>
          ))}
        </select>
      </Campo>
    </div>
  )
}

function DetalleAguinaldo({
  aguinaldo,
  onCambio,
  onEliminado,
  onCerrar,
}: {
  aguinaldo: Aguinaldo
  onCambio: (aguinaldo: Aguinaldo) => void
  onEliminado: () => void
  onCerrar: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [otras, setOtras] = useState<number | null>(aguinaldo.otrasRemuneraciones)
  const [nota, setNota] = useState(aguinaldo.notaOtras ?? '')
  const [forma, setForma] = useState<FormaPagoSueldo>('EFECTIVO')
  const [diaPago, setDiaPago] = useState(hoy())
  const pagado = aguinaldo.fechaPago != null
  const porMes = new Map(aguinaldo.meses.map((item) => [item.mes, item.remuneraciones]))

  async function ejecutar(accion: () => Promise<void>, falla: string) {
    setGuardando(true)
    try {
      await accion()
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : falla)
    } finally {
      setGuardando(false)
    }
  }

  function guardarOtras(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ejecutar(async () => {
      onCambio(
        await apiActualizar<Aguinaldo>(`/rrhh/aguinaldos/${aguinaldo.id}/otras-remuneraciones`, {
          monto: otras ?? 0,
          nota: nota.trim() || null,
        }),
      )
    }, 'No se pudieron guardar las otras remuneraciones')
  }

  function pagar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ejecutar(async () => {
      onCambio(
        await apiEnviar<Aguinaldo>(`/rrhh/aguinaldos/${aguinaldo.id}/pago`, {
          method: 'POST',
          body: JSON.stringify({ fecha: diaPago, forma }),
        }),
      )
    }, 'No se pudo registrar el pago')
  }

  async function anularPago() {
    if (
      !(await confirmar({
        titulo: 'Anular pago',
        mensaje: `¿Anular el pago del aguinaldo de ${aguinaldo.empleado}? Vuelve a quedar pendiente.`,
        aceptar: 'Anular pago',
        peligro: true,
      }))
    ) {
      return
    }
    await ejecutar(async () => {
      onCambio(await apiEnviar<Aguinaldo>(`/rrhh/aguinaldos/${aguinaldo.id}/pago`, { method: 'DELETE' }))
    }, 'No se pudo anular el pago')
  }

  async function eliminar() {
    if (
      !(await confirmar({
        titulo: 'Quitar del aguinaldo',
        mensaje: `¿Quitar a ${aguinaldo.empleado} del aguinaldo ${aguinaldo.anio}? Si se vuelve a calcular, aparece de nuevo.`,
        aceptar: 'Quitar',
        peligro: true,
      }))
    ) {
      return
    }
    await ejecutar(async () => {
      await apiEliminar(`/rrhh/aguinaldos/${aguinaldo.id}`)
      onEliminado()
    }, 'No se pudo quitar')
  }

  return (
    <Dialogo titulo={`Aguinaldo ${aguinaldo.anio} de ${aguinaldo.empleado}`} onCerrar={onCerrar}>
      <Aviso mensaje={error} />
      <p className="ayuda">
        Período del {fecha(aguinaldo.desde)} al {fecha(aguinaldo.hasta)} · C.I. {aguinaldo.documento}
      </p>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Mes</th>
              <th className="numero">Remuneraciones</th>
              <th>Mes</th>
              <th className="numero">Remuneraciones</th>
            </tr>
          </thead>
          <tbody>
            {MESES.slice(0, 6).map((nombre, indice) => (
              <tr key={nombre}>
                <td>{nombre}</td>
                <td className="numero">{porMes.has(indice + 1) ? dinero(porMes.get(indice + 1)) : '—'}</td>
                <td>{MESES[indice + 6]}</td>
                <td className="numero">{porMes.has(indice + 7) ? dinero(porMes.get(indice + 7)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="totales cuatro">
        <div>
          <span>En el sistema</span>
          <strong>{dinero(aguinaldo.remuneraciones)}</strong>
        </div>
        <div>
          <span>Otras remuneraciones</span>
          <strong>{dinero(aguinaldo.otrasRemuneraciones)}</strong>
        </div>
        <div>
          <span>Total del año</span>
          <strong>{dinero(aguinaldo.base)}</strong>
        </div>
        <div className="total">
          <span>Aguinaldo (÷ 12)</span>
          <strong>{dinero(aguinaldo.monto)}</strong>
        </div>
      </div>

      {pagado ? (
        <p className="ayuda">
          Pagado el {fecha(aguinaldo.fechaPago)} en {FORMAS[aguinaldo.formaPago ?? 'EFECTIVO'].toLowerCase()}
          {aguinaldo.registradoPor ? ` · registrado por ${aguinaldo.registradoPor}` : ''}. Para modificarlo, anulá el pago.
        </p>
      ) : (
        <>
          <h3 className="bloque">Otras remuneraciones</h3>
          <form onSubmit={guardarOtras}>
            <div className="grilla">
              <Campo etiqueta="Monto (Gs.)">
                <Monto name="otras" valor={otras} decimales={0} onValor={setOtras} />
              </Campo>
              <Campo etiqueta="De dónde salen">
                <input maxLength={200} value={nota} placeholder="Sueldos de enero a marzo…" onChange={(event) => setNota(event.target.value)} />
              </Campo>
            </div>
            <p className="ayuda">
              Sueldos u otras remuneraciones del año que no están en las liquidaciones del sistema (por ejemplo, meses
              anteriores a empezar a usarlo).
            </p>
            <div className="dialogo-acciones">
              <button className="btn" type="submit" disabled={guardando}>
                Guardar otras remuneraciones
              </button>
            </div>
          </form>

          <h3 className="bloque">Registrar pago</h3>
          <form onSubmit={pagar}>
            <CamposPago anio={aguinaldo.anio} diaPago={diaPago} forma={forma} onDia={setDiaPago} onForma={setForma} />
            <div className="dialogo-acciones">
              <button className="btn primary" type="submit" disabled={guardando || aguinaldo.monto <= 0}>
                Pagar {dinero(aguinaldo.monto)} Gs.
              </button>
            </div>
          </form>
        </>
      )}

      <div className="dialogo-acciones">
        {pagado ? (
          <button className="btn" type="button" disabled={guardando} onClick={() => void anularPago()}>
            Anular pago
          </button>
        ) : (
          <button className="btn" type="button" disabled={guardando} onClick={() => void eliminar()}>
            Quitar
          </button>
        )}
        <button
          className="btn"
          type="button"
          onClick={() =>
            void apiAbrir(`/rrhh/aguinaldos/recibos/pdf?anio=${aguinaldo.anio}&id=${aguinaldo.id}`).catch((causa: unknown) =>
              setError(causa instanceof Error ? causa.message : 'No se pudo generar el recibo'),
            )
          }
        >
          Imprimir recibo
        </button>
        <button className="btn primary" type="button" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  )
}
