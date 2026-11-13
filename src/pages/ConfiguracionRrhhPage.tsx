import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiCrear, apiEliminar, apiListar, cantidad, dinero } from '../api/client'
import type { ConceptoSueldo, ConfiguracionRrhh, Jornada } from '../api/types'
import { confirmar } from '../components/Confirmacion'
import { Aviso, Barra, Campo, Dialogo, Monto, numeroOpcional } from '../components/ui'
import { CargosDialogo } from './EmpleadosPage'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const JORNADAS: { valor: Jornada; etiqueta: string }[] = [
  { valor: 'COMPLETA', etiqueta: 'Jornada completa' },
  { valor: 'MEDIA', etiqueta: 'Media jornada' },
  { valor: 'NO_LABORAL', etiqueta: 'No laboral' },
]

function pesoJornada(jornada: Jornada): number {
  return jornada === 'COMPLETA' ? 1 : jornada === 'MEDIA' ? 0.5 : 0
}

export function ConfiguracionRrhhPage() {
  const [configuracion, setConfiguracion] = useState<ConfiguracionRrhh | null>(null)
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [horas, setHoras] = useState('8')
  const [conceptos, setConceptos] = useState<ConceptoSueldo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [editando, setEditando] = useState<ConceptoSueldo | 'nuevo' | null>(null)
  const [verCargos, setVerCargos] = useState(false)

  async function cargar() {
    try {
      const [actual, lista] = await Promise.all([
        apiListar<ConfiguracionRrhh>('/rrhh/configuracion'),
        apiListar<ConceptoSueldo[]>('/rrhh/conceptos'),
      ])
      setConfiguracion(actual)
      setJornadas(actual.jornadas)
      setHoras(String(actual.horasJornada))
      setConceptos(lista)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer la configuración de RR.HH.')
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const diasPorSemana = jornadas.reduce((total, jornada) => total + pesoJornada(jornada), 0)
  const cambiado =
    configuracion !== null &&
    (jornadas.join() !== configuracion.jornadas.join() || Number(horas) !== Number(configuracion.horasJornada))

  async function guardarSemana(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOcupado(true)
    try {
      const guardada = await apiActualizar<ConfiguracionRrhh>('/rrhh/configuracion', {
        jornadas,
        horasJornada: Number(horas),
      })
      setConfiguracion(guardada)
      setJornadas(guardada.jornadas)
      setHoras(String(guardada.horasJornada))
      setError(null)
      setMensaje('Semana laboral guardada. Se aplica a lo que se cargue desde ahora y a las liquidaciones sin confirmar.')
    } catch (causa) {
      setMensaje(null)
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar la semana laboral')
    } finally {
      setOcupado(false)
    }
  }

  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true)
    try {
      await accion()
      setError(null)
      setConceptos(await apiListar<ConceptoSueldo[]>('/rrhh/conceptos'))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el concepto')
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(concepto: ConceptoSueldo) {
    if (
      await confirmar({
        titulo: 'Eliminar concepto',
        mensaje: `¿Eliminar el concepto ${concepto.nombre}? Los recibos donde ya se usó no cambian.`,
        aceptar: 'Eliminar',
        peligro: true,
      })
    ) {
      await ejecutar(() => apiEliminar(`/rrhh/conceptos/${concepto.id}`))
    }
  }

  return (
    <section>
      <Barra
        kicker="Recursos humanos"
        titulo="Configuración"
        detalle="Semana laboral, cargos y conceptos de pago y descuento. Todo el módulo de RR.HH., incluidos sueldos y liquidaciones, es solo para el rol Administrador."
      >
        <button type="button" className="btn" onClick={() => setVerCargos(true)}>
          Administrar cargos
        </button>
      </Barra>
      <Aviso mensaje={error} />

      <div className="paneles">
        <form className="panel-inicio" onSubmit={(event) => void guardarSemana(event)}>
          <div className="seccion-cabecera">
            <h3>Semana laboral</h3>
          </div>
          <p className="ayuda">
            Define qué días se trabaja. Una falta en un día de media jornada descuenta el jornal completo, las horas extra se calculan sobre las horas
            por jornada y la planilla del MTESS suma esas horas. Los días no laborales no cuentan para vacaciones ni permisos.
          </p>
          <div className="tabla-contenedor">
            <table className="tabla">
              <tbody>
                {DIAS.map((dia, indice) => (
                  <tr key={dia}>
                    <td>{dia}</td>
                    <td>
                      <select
                        value={jornadas[indice] ?? 'COMPLETA'}
                        onChange={(event) => {
                          const nuevas = [...jornadas]
                          nuevas[indice] = event.target.value as Jornada
                          setJornadas(nuevas)
                          setMensaje(null)
                        }}
                      >
                        {JORNADAS.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fila-total">
                  <td>Días por semana</td>
                  <td>{cantidad(diasPorSemana)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Campo etiqueta="Horas por jornada completa">
            <input
              type="number"
              min={1}
              max={12}
              step={0.5}
              required
              value={horas}
              onChange={(event) => {
                setHoras(event.target.value)
                setMensaje(null)
              }}
            />
          </Campo>
          {diasPorSemana === 0 ? <p className="aviso advertencia">Tiene que haber al menos un día laboral.</p> : null}
          {mensaje ? <p className="ayuda">{mensaje}</p> : null}
          <button type="submit" className="btn primary" disabled={ocupado || !cambiado || diasPorSemana === 0}>
            Guardar semana
          </button>
        </form>

        <div className="panel-inicio">
          <div className="seccion-cabecera">
            <h3>Conceptos de pago y descuento</h3>
            <button type="button" className="btn" onClick={() => setEditando('nuevo')}>
              Nuevo concepto
            </button>
          </div>
          <p className="ayuda">
            Aparecen al agregar líneas en el recibo de sueldo; el monto es una sugerencia que se puede cambiar en cada recibo.
          </p>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th className="numero">Monto sugerido</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {conceptos.map((concepto) => (
                  <tr key={concepto.id} className={concepto.activo ? undefined : 'baja'}>
                    <td>{concepto.nombre}</td>
                    <td>{concepto.haber ? 'Pago' : 'Descuento'}</td>
                    <td className="numero">{concepto.monto === null ? '—' : dinero(concepto.monto)}</td>
                    <td>
                      {concepto.activo ? <span className="estado">Activo</span> : <span className="estado anulado">Desactivado</span>}
                    </td>
                    <td className="acciones">
                      <button type="button" className="btn ghost" onClick={() => setEditando(concepto)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={ocupado}
                        onClick={() =>
                          void ejecutar(() =>
                            apiActualizar<ConceptoSueldo>(`/rrhh/conceptos/${concepto.id}`, { ...concepto, activo: !concepto.activo }),
                          )
                        }
                      >
                        {concepto.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button type="button" className="btn ghost" disabled={ocupado} onClick={() => void eliminar(concepto)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {conceptos.length === 0 ? <p className="vacio">Todavía no hay conceptos configurados.</p> : null}
        </div>
      </div>

      {editando ? (
        <FichaConcepto
          concepto={editando === 'nuevo' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(lista) => {
            setConceptos(lista)
            setEditando(null)
          }}
        />
      ) : null}
      {verCargos ? <CargosDialogo onCerrar={() => setVerCargos(false)} /> : null}
    </section>
  )
}

function FichaConcepto({
  concepto,
  onCerrar,
  onGuardado,
}: {
  concepto: ConceptoSueldo | null
  onCerrar: () => void
  onGuardado: (lista: ConceptoSueldo[]) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const datos = new FormData(event.currentTarget)
    const cuerpo = {
      nombre: String(datos.get('nombre') ?? ''),
      haber: datos.get('haber') === 'true',
      monto: numeroOpcional(String(datos.get('monto') ?? '')),
      activo: concepto?.activo ?? true,
    }
    setGuardando(true)
    try {
      if (concepto) {
        await apiActualizar<ConceptoSueldo>(`/rrhh/conceptos/${concepto.id}`, cuerpo)
      } else {
        await apiCrear<ConceptoSueldo>('/rrhh/conceptos', cuerpo)
      }
      onGuardado(await apiListar<ConceptoSueldo[]>('/rrhh/conceptos'))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el concepto')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={concepto ? 'Editar concepto' : 'Nuevo concepto'} onCerrar={onCerrar}>
      <form onSubmit={(event) => void guardar(event)}>
        <Aviso mensaje={error} />
        <div className="grilla">
          <div className="span">
            <Campo etiqueta="Nombre">
              <input name="nombre" required maxLength={80} autoFocus defaultValue={concepto?.nombre ?? ''} placeholder="Premio por asistencia" />
            </Campo>
          </div>
          <Campo etiqueta="Tipo">
            <select name="haber" defaultValue={String(concepto?.haber ?? true)}>
              <option value="true">Pago (suma al recibo)</option>
              <option value="false">Descuento (resta del recibo)</option>
            </select>
          </Campo>
          <Campo etiqueta="Monto sugerido (opcional)">
            <Monto name="monto" decimales={0} valor={concepto?.monto ?? null} />
          </Campo>
        </div>
        <div className="dialogo-acciones">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={guardando}>
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
