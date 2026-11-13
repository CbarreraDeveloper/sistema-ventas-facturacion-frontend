import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAbrir, apiActualizar, apiCrear, apiEliminar, apiListar, dinero, fecha, hoy } from '../api/client'
import type { CajaSesion, ModalidadCasual, OpcionCatalogo, ServicioCasual, VendedorCasual } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, textoOpcional, valorInput } from '../components/ui'

const MODALIDADES: Record<ModalidadCasual, string> = {
  JORNADA: 'Por jornada',
  SEMANA: 'Por semana',
}

type Filtro = 'PENDIENTES' | 'PAGADOS' | 'TODOS'

function iso(dia: Date) {
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
}

function estaSemana() {
  const lunes = new Date()
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return { desde: iso(lunes), hasta: iso(domingo) }
}

function esteMes() {
  const ahora = new Date()
  return {
    desde: iso(new Date(ahora.getFullYear(), ahora.getMonth(), 1)),
    hasta: iso(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)),
  }
}

function PlanillaCasuales({ onCerrar }: { onCerrar: () => void }) {
  const [periodo, setPeriodo] = useState(estaSemana)
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)

  async function imprimir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGenerando(true)
    try {
      await apiAbrir(`/rrhh/casuales/planilla/pdf?desde=${periodo.desde}&hasta=${periodo.hasta}`)
      onCerrar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo generar la planilla')
      setGenerando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo="Planilla de vendedores casuales" onCerrar={onCerrar}>
      <form onSubmit={(event) => void imprimir(event)}>
        <Aviso mensaje={error} />
        <div className="opciones-estado">
          <button type="button" className="btn" onClick={() => setPeriodo(estaSemana())}>
            Esta semana
          </button>
          <button type="button" className="btn" onClick={() => setPeriodo(esteMes())}>
            Este mes
          </button>
        </div>
        <div className="grilla">
          <Campo etiqueta="Desde">
            <input type="date" required value={periodo.desde} onChange={(event) => setPeriodo({ ...periodo, desde: event.target.value })} />
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
        </div>
        <p className="ayuda">
          Incluye los servicios que caen en el período, pagados y pendientes, con ventas, comisión, viático, total y una
          columna para la firma de cada vendedor.
        </p>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={generando}>
            Imprimir planilla
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

export function CasualesPage() {
  const [servicios, setServicios] = useState<ServicioCasual[]>([])
  const [vendedores, setVendedores] = useState<VendedorCasual[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('PENDIENTES')
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<ServicioCasual | null | 'nuevo'>(null)
  const [pagando, setPagando] = useState<ServicioCasual | null>(null)
  const [planilla, setPlanilla] = useState(false)

  async function cargar() {
    try {
      const [lista, personas] = await Promise.all([
        apiListar<ServicioCasual[]>('/rrhh/casuales/servicios'),
        apiListar<VendedorCasual[]>('/rrhh/casuales/vendedores'),
      ])
      setServicios(lista)
      setVendedores(personas)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los vendedores casuales')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function anularPago(servicio: ServicioCasual) {
    if (
      !(await confirmar({
        titulo: 'Anular pago',
        mensaje: `¿Anular el pago de ${dinero(servicio.total)} Gs. a ${servicio.nombre}? El dinero vuelve a ingresar a la caja.`,
        aceptar: 'Anular pago',
        peligro: true,
      }))
    ) {
      return
    }
    try {
      await apiEliminar(`/rrhh/casuales/servicios/${servicio.id}/pago`)
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo anular el pago')
    }
  }

  const pendientes = servicios.filter((servicio) => !servicio.fechaPago)
  const mes = hoy().slice(0, 7)
  const pagadoMes = servicios
    .filter((servicio) => servicio.fechaPago?.startsWith(mes))
    .reduce((suma, servicio) => suma + servicio.total, 0)
  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtrados = servicios.filter((servicio) => {
    if (filtro === 'PENDIENTES' && servicio.fechaPago) {
      return false
    }
    if (filtro === 'PAGADOS' && !servicio.fechaPago) {
      return false
    }
    if (!consulta) {
      return true
    }
    return [servicio.nombre, servicio.documento].some((valor) => valor.toLocaleUpperCase('es-PY').includes(consulta))
  })
  const paginacion = usePaginacion(filtrados)

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Vendedores casuales"
        detalle="Vendedores sin legajo ni sueldo, por jornada o por semana. Cobran comisión sobre lo que venden y, si corresponde, un viático. El pago sale de la caja."
      >
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre o cédula" />
        </label>
        <label className="campo">
          <span>Mostrar</span>
          <select value={filtro} onChange={(event) => setFiltro(event.target.value as Filtro)}>
            <option value="PENDIENTES">Pendientes de pago</option>
            <option value="PAGADOS">Pagados</option>
            <option value="TODOS">Todos</option>
          </select>
        </label>
        <button type="button" className="btn" onClick={() => setPlanilla(true)}>
          Imprimir planilla
        </button>
        <button type="button" className="btn primary" onClick={() => setEditando('nuevo')}>
          Registrar servicio
        </button>
      </Barra>
      {planilla ? <PlanillaCasuales onCerrar={() => setPlanilla(false)} /> : null}
      <Aviso mensaje={error} />

      <div className="totales cuatro">
        <div>
          <span>Servicios pendientes</span>
          <strong>{pendientes.length}</strong>
        </div>
        <div>
          <span>Pagado este mes</span>
          <strong>{dinero(pagadoMes)}</strong>
        </div>
        <div>
          <span>Vendedores registrados</span>
          <strong>{vendedores.length}</strong>
        </div>
        <div className="total">
          <span>Pendiente de pago</span>
          <strong>{dinero(pendientes.reduce((suma, servicio) => suma + servicio.total, 0))}</strong>
        </div>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Período</th>
              <th>Vendedor</th>
              <th>Modalidad</th>
              <th className="numero">Vendido</th>
              <th className="numero">Comisión</th>
              <th className="numero">Viático / fijo</th>
              <th className="numero">Total</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((servicio) => (
              <tr key={servicio.id}>
                <td>{periodo(servicio)}</td>
                <td>
                  {servicio.nombre}
                  <small className="sub">CI {cedula(servicio.documento)}</small>
                </td>
                <td>{MODALIDADES[servicio.modalidad]}</td>
                <td className="numero">
                  {servicio.ventaTotal ? dinero(servicio.ventaTotal) : '—'}
                  {servicio.ventas.length ? (
                    <small className="sub">{servicio.ventas.map((linea) => `${porcentaje(linea.porcentaje)}%`).join(' · ')}</small>
                  ) : null}
                </td>
                <td className="numero">{servicio.comision ? dinero(servicio.comision) : '—'}</td>
                <td className="numero">{servicio.montoAcordado ? dinero(servicio.montoAcordado) : '—'}</td>
                <td className="numero">
                  <strong>{dinero(servicio.total)}</strong>
                </td>
                <td>
                  {servicio.fechaPago ? (
                    <span className="estado">
                      Pagado el {fecha(servicio.fechaPago)}
                      {servicio.medioPago ? ` · ${servicio.medioPago}` : ''}
                    </span>
                  ) : (
                    <span className="estado alerta">Pendiente</span>
                  )}
                </td>
                <td className="acciones">
                  {servicio.fechaPago ? (
                    <button type="button" className="btn ghost" onClick={() => void anularPago(servicio)}>
                      Anular pago
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn ghost" onClick={() => setEditando(servicio)}>
                        Editar
                      </button>
                      <button type="button" className="btn primary" onClick={() => setPagando(servicio)}>
                        Pagar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && servicios.length === 0 ? <p className="vacio">Todavía no hay servicios registrados.</p> : null}
      {listo && servicios.length > 0 && filtrados.length === 0 ? (
        <p className="vacio">Ningún servicio coincide con el filtro.</p>
      ) : null}

      {editando ? (
        <FichaServicio
          servicio={editando === 'nuevo' ? null : editando}
          vendedores={vendedores}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      ) : null}
      {pagando ? (
        <PagoServicio
          servicio={pagando}
          onCerrar={() => setPagando(null)}
          onPagado={() => {
            setPagando(null)
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

function FichaServicio({
  servicio,
  vendedores,
  onCerrar,
  onGuardado,
}: {
  servicio: ServicioCasual | null
  vendedores: VendedorCasual[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [modalidad, setModalidad] = useState<ModalidadCasual>(servicio?.modalidad ?? 'SEMANA')
  const [desde, setDesde] = useState(servicio?.desde ?? hoy())
  const [hasta, setHasta] = useState(servicio?.hasta ?? sumarDias(hoy(), 5))
  const [fijo, setFijo] = useState<number | null>(servicio?.montoAcordado || null)
  const [lineas, setLineas] = useState<LineaVenta[]>(() =>
    servicio?.ventas.length
      ? servicio.ventas.map((linea, indice) => ({ clave: indice, porcentaje: String(linea.porcentaje), venta: linea.venta }))
      : [{ clave: 0, porcentaje: '5', venta: null }],
  )
  const comisiones = lineas.map((linea) => comisionDe(linea))
  const comisionTotal = comisiones.reduce((suma, valor) => suma + valor, 0)

  function cambiarLinea(clave: number, cambio: Partial<LineaVenta>) {
    setLineas((actuales) => actuales.map((linea) => (linea.clave === clave ? { ...linea, ...cambio } : linea)))
  }

  function agregarLinea() {
    setLineas((actuales) => {
      const usados = new Set(actuales.map(tasaDe))
      const sugerido = [3, 5, 7].find((valor) => !usados.has(valor))
      return [...actuales, { clave: Math.max(-1, ...actuales.map((linea) => linea.clave)) + 1, porcentaje: sugerido ? String(sugerido) : '', venta: null }]
    })
  }

  function completarVendedor(documento: string, form: HTMLFormElement | null) {
    const limpio = documento.replace(/[\s.]/g, '').toUpperCase()
    const conocido = vendedores.find((vendedor) => vendedor.documento === limpio)
    if (!conocido || !form) {
      return
    }
    const nombre = form.elements.namedItem('nombre')
    const telefono = form.elements.namedItem('telefono')
    if (nombre instanceof HTMLInputElement) {
      nombre.value = conocido.nombre
    }
    if (telefono instanceof HTMLInputElement && conocido.telefono) {
      telefono.value = conocido.telefono
    }
  }

  function cambiarDesde(valor: string) {
    setDesde(valor)
    if (valor) {
      setHasta(sumarDias(valor, 5))
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const cargadas = lineas.filter((linea) => linea.venta)
    if (cargadas.some((linea) => tasaDe(linea) <= 0)) {
      setError('Indicá el porcentaje de comisión de cada venta')
      return
    }
    if (cargadas.length === 0 && !fijo) {
      setError('Cargá lo que vendió con su porcentaje de comisión, o un viático / monto fijo')
      return
    }
    const cuerpo = {
      documento: valorInput(form, 'documento'),
      nombre: valorInput(form, 'nombre'),
      telefono: textoOpcional(valorInput(form, 'telefono')),
      modalidad,
      desde,
      hasta: modalidad === 'SEMANA' ? hasta : desde,
      montoAcordado: fijo ?? 0,
      ventas: cargadas.map((linea) => ({ porcentaje: tasaDe(linea), venta: linea.venta })),
      observacion: textoOpcional(valorInput(form, 'observacion')),
    }
    setGuardando(true)
    try {
      if (servicio) {
        await apiActualizar<ServicioCasual>(`/rrhh/casuales/servicios/${servicio.id}`, cuerpo)
      } else {
        await apiCrear<ServicioCasual>('/rrhh/casuales/servicios', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el servicio')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!servicio) {
      return
    }
    if (
      !(await confirmar({
        titulo: 'Eliminar servicio',
        mensaje: `¿Eliminar el servicio de ${servicio.nombre} (${periodo(servicio)})?`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return
    }
    setGuardando(true)
    try {
      await apiEliminar(`/rrhh/casuales/servicios/${servicio.id}`)
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo eliminar el servicio')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={servicio ? 'Editar servicio' : 'Registrar servicio'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla">
          <Campo etiqueta="Cédula de identidad">
            <input
              name="documento"
              required
              maxLength={20}
              list="casuales-conocidos"
              placeholder="1234567"
              defaultValue={servicio?.documento ?? ''}
              onChange={(event) => completarVendedor(event.target.value, event.target.form)}
            />
          </Campo>
          <datalist id="casuales-conocidos">
            {vendedores.map((vendedor) => (
              <option key={vendedor.id} value={vendedor.documento}>
                {vendedor.nombre}
              </option>
            ))}
          </datalist>
          <Campo etiqueta="Nombre y apellido">
            <input name="nombre" required maxLength={120} defaultValue={servicio?.nombre ?? ''} />
          </Campo>
          <Campo etiqueta="Teléfono o celular">
            <input name="telefono" maxLength={40} defaultValue={servicio?.telefono ?? ''} />
          </Campo>
          <Campo etiqueta="Modalidad">
            <select value={modalidad} onChange={(event) => setModalidad(event.target.value as ModalidadCasual)}>
              {Object.entries(MODALIDADES).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta={modalidad === 'SEMANA' ? 'Desde' : 'Fecha de la jornada'}>
            <input type="date" required value={desde} onChange={(event) => cambiarDesde(event.target.value)} />
          </Campo>
          {modalidad === 'SEMANA' ? (
            <Campo etiqueta="Hasta">
              <input
                type="date"
                required
                min={desde}
                max={sumarDias(desde, 6)}
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
              />
            </Campo>
          ) : (
            <span />
          )}
        </div>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th className="numero">Comisión %</th>
                <th className="numero">Vendido (Gs.)</th>
                <th className="numero">Comisión</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea, indice) => (
                <tr key={linea.clave}>
                  <td className="numero">
                    <input
                      className="porcentaje"
                      inputMode="decimal"
                      aria-label="Porcentaje de comisión"
                      value={linea.porcentaje}
                      onChange={(event) => cambiarLinea(linea.clave, { porcentaje: event.target.value.replace(/[^\d,.]/g, '') })}
                    />
                  </td>
                  <td className="numero">
                    <Monto
                      name={`venta-${linea.clave}`}
                      valor={linea.venta}
                      decimales={0}
                      onValor={(valor) => cambiarLinea(linea.clave, { venta: valor })}
                    />
                  </td>
                  <td className="numero">{comisiones[indice] ? dinero(comisiones[indice]) : '—'}</td>
                  <td className="acciones">
                    {lineas.length > 1 ? (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setLineas((actuales) => actuales.filter((otra) => otra.clave !== linea.clave))}
                      >
                        Quitar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grilla">
          <div>
            <button type="button" className="btn ghost" onClick={agregarLinea}>
              Agregar otro porcentaje
            </button>
          </div>
          <span />
          <Campo etiqueta={modalidad === 'SEMANA' ? 'Viático o monto fijo de la semana (Gs.)' : 'Viático o monto fijo de la jornada (Gs.)'}>
            <Monto name="montoAcordado" valor={servicio?.montoAcordado || null} decimales={0} onValor={setFijo} />
          </Campo>
          <Campo etiqueta="Total a pagar">
            <strong>
              {dinero(comisionTotal + (fijo ?? 0))} Gs.
              {comisionTotal && fijo ? ` (comisión ${dinero(comisionTotal)} + viático ${dinero(fijo)})` : ''}
            </strong>
          </Campo>
          <div className="span">
            <Campo etiqueta="Observación">
              <input name="observacion" maxLength={300} placeholder="Lugar, horario, acuerdo…" defaultValue={servicio?.observacion ?? ''} />
            </Campo>
          </div>
          <p className="ayuda span">
            Si la cédula ya trabajó antes, el nombre y el teléfono se completan solos. Cargá lo vendido separado por porcentaje de
            comisión; el viático es opcional.
          </p>
        </div>
        <div className="dialogo-acciones">
          {servicio ? (
            <button className="btn peligro" type="button" disabled={guardando} onClick={() => void eliminar()}>
              Eliminar
            </button>
          ) : null}
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function PagoServicio({
  servicio,
  onCerrar,
  onPagado,
}: {
  servicio: ServicioCasual
  onCerrar: () => void
  onPagado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [caja, setCaja] = useState<CajaSesion | null | undefined>(undefined)
  const [medios, setMedios] = useState<OpcionCatalogo[]>([])
  const [medioId, setMedioId] = useState('')

  useEffect(() => {
    Promise.all([apiListar<CajaSesion | undefined>('/caja/actual'), apiListar<OpcionCatalogo[]>('/caja/medios')])
      .then(([abierta, lista]) => {
        setCaja(abierta ?? null)
        setMedios(lista)
        const efectivo = lista.find((medio) => medio.codigo === 'EFECTIVO') ?? lista[0]
        setMedioId(efectivo ? String(efectivo.id) : '')
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo leer la caja'))
  }, [])

  const medio = medios.find((opcion) => String(opcion.id) === medioId)
  const faltaEfectivo = caja != null && medio?.codigo === 'EFECTIVO' && servicio.total > caja.efectivoEsperado

  async function pagar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)
    try {
      await apiCrear<ServicioCasual>(`/rrhh/casuales/servicios/${servicio.id}/pago`, { medioPagoId: Number(medioId) })
      onPagado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo registrar el pago')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo={`Pagar a ${servicio.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={(event) => void pagar(event)}>
        <Aviso mensaje={error} />
        {caja === null ? (
          <Aviso mensaje="No tenés una caja abierta. El pago sale de la caja: abrila desde Ventas → Caja." />
        ) : null}
        <div className="grilla">
          <Campo etiqueta={MODALIDADES[servicio.modalidad]}>
            <strong>{periodo(servicio)}</strong>
          </Campo>
          <Campo etiqueta="Vendido">
            <strong>{dinero(servicio.ventaTotal)}</strong>
          </Campo>
          {servicio.ventas.map((linea) => (
            <Campo key={linea.porcentaje} etiqueta={`Comisión ${porcentaje(linea.porcentaje)}% sobre ${dinero(linea.venta)}`}>
              <strong>{dinero(linea.comision)}</strong>
            </Campo>
          ))}
          {servicio.montoAcordado ? (
            <Campo etiqueta="Viático o monto fijo">
              <strong>{dinero(servicio.montoAcordado)}</strong>
            </Campo>
          ) : null}
          <Campo etiqueta="Total a pagar">
            <strong>{dinero(servicio.total)} Gs.</strong>
          </Campo>
        </div>
        <Campo etiqueta="Medio de pago">
          <select required value={medioId} onChange={(event) => setMedioId(event.target.value)}>
            {medios.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </Campo>
        {caja ? (
          <p className={faltaEfectivo ? 'ayuda alerta' : 'ayuda'}>
            Sale de tu caja abierta. Efectivo disponible: {dinero(caja.efectivoEsperado)} Gs.
            {faltaEfectivo ? ' No alcanza para este pago.' : ''}
          </p>
        ) : null}
        {servicio.observacion ? <p className="ayuda">{servicio.observacion}</p> : null}
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando || !caja || faltaEfectivo}>
            Registrar pago
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

type LineaVenta = { clave: number; porcentaje: string; venta: number | null }

function tasaDe(linea: LineaVenta): number {
  const tasa = Number(linea.porcentaje.replace(',', '.'))
  return Number.isFinite(tasa) ? tasa : 0
}

function comisionDe(linea: LineaVenta): number {
  return linea.venta ? Math.round((linea.venta * tasaDe(linea)) / 100) : 0
}

function porcentaje(valor: number): string {
  return valor.toLocaleString('es-PY', { maximumFractionDigits: 2 })
}

function periodo(servicio: ServicioCasual): string {
  return servicio.desde === servicio.hasta ? fecha(servicio.desde) : `${fecha(servicio.desde)} al ${fecha(servicio.hasta)}`
}

function cedula(documento: string): string {
  return /^\d+$/.test(documento) ? Number(documento).toLocaleString('es-PY') : documento
}

function sumarDias(dia: string, dias: number): string {
  const [anio, mes, numero] = dia.split('-').map(Number)
  const resultado = new Date(anio, mes - 1, numero + dias)
  const dos = (valor: number) => String(valor).padStart(2, '0')
  return `${resultado.getFullYear()}-${dos(resultado.getMonth() + 1)}-${dos(resultado.getDate())}`
}
