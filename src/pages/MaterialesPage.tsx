import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiCrear, apiListar, cantidad, dinero, texto } from '../api/client'
import type { Material, OpcionesMaterial } from '../api/types'
import { ControlPaginacion, usePaginacion } from '../components/Paginacion'
import { Aviso, Barra, Campo, Dialogo, Monto, numeroOpcional, textoOpcional, valorInput } from '../components/ui'

const VACIO: OpcionesMaterial = { unidades: [], tasas: [], rubros: [], deposito: 'depósito principal' }

export function MaterialesPage() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [opciones, setOpciones] = useState<OpcionesMaterial>(VACIO)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [listo, setListo] = useState(false)
  const [editando, setEditando] = useState<Material | null | 'nuevo'>(null)
  const [ajustando, setAjustando] = useState<Material | null>(null)

  async function cargar() {
    try {
      const [lista, catalogo] = await Promise.all([
        apiListar<Material[]>('/productos'),
        apiListar<OpcionesMaterial>('/productos/opciones'),
      ])
      setMateriales(lista)
      setOpciones(catalogo)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron leer los materiales')
    } finally {
      setListo(true)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const consulta = busqueda.trim().toLocaleUpperCase('es-PY')
  const filtrados = materiales.filter((material) => {
    if (soloActivos && !material.activo) {
      return false
    }
    if (!consulta) {
      return true
    }
    return [material.codigo, material.codigoReferencia, material.descripcion, material.rubro].some((valor) =>
      (valor ?? '').toLocaleUpperCase('es-PY').includes(consulta),
    )
  })
  const paginacion = usePaginacion(filtrados)

  return (
    <section>
      <Barra kicker="Catálogo" titulo="Materiales" detalle="Precio de lista y existencia del depósito principal.">
        <label className="campo busqueda">
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Código o descripción" />
        </label>
        <label className="check linea">
          <input type="checkbox" checked={soloActivos} onChange={(event) => setSoloActivos(event.target.checked)} />
          Solo activos
        </label>
        <button type="button" className="btn primary" onClick={() => setEditando('nuevo')} disabled={opciones.unidades.length === 0}>
          Nuevo material
        </button>
      </Barra>
      <Aviso mensaje={error} />
      <div className="tabla-contenedor">
        <table className="tabla ancha">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Referencia</th>
              <th>Unidad</th>
              <th className="numero">IVA</th>
              <th className="numero">Costo</th>
              <th className="numero">Minorista</th>
              <th className="numero">Mayorista</th>
              <th className="numero">Especial</th>
              <th className="numero">Existencia</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paginacion.filas.map((material) => (
              <tr key={material.id} className={material.activo ? undefined : 'baja'}>
                <td>{material.codigo}</td>
                <td>{material.descripcion}</td>
                <td>{texto(material.codigoReferencia)}</td>
                <td>{material.unidad}</td>
                <td className="numero">{dinero(material.porcentajeIva)}%</td>
                <td className="numero">{dinero(material.costo)}</td>
                <td className="numero">{precio(material.precioMinorista)}</td>
                <td className="numero">{precio(material.precioMayorista)}</td>
                <td className="numero">{precio(material.precioEspecial)}</td>
                <td className="numero">{material.controlaStock ? cantidad(material.existencia) : '—'}</td>
                <td className="acciones">
                  <button type="button" className="btn ghost" onClick={() => setEditando(material)}>
                    Editar
                  </button>
                  <button type="button" className="btn ghost" disabled={!material.controlaStock} onClick={() => setAjustando(material)}>
                    Stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ControlPaginacion paginacion={paginacion} />
      {listo && filtrados.length === 0 ? <p className="vacio">No hay materiales para mostrar.</p> : null}
      {editando ? (
        <FormularioMaterial
          material={editando === 'nuevo' ? null : editando}
          opciones={opciones}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      ) : null}
      {ajustando ? (
        <FormularioStock
          material={ajustando}
          deposito={opciones.deposito || 'depósito principal'}
          onCerrar={() => setAjustando(null)}
          onGuardado={() => {
            setAjustando(null)
            void cargar()
          }}
        />
      ) : null}
    </section>
  )
}

function precio(valor: number | null): string {
  return valor == null ? '—' : dinero(valor)
}

function FormularioMaterial({
  material,
  opciones,
  onCerrar,
  onGuardado,
}: {
  material: Material | null
  opciones: OpcionesMaterial
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [controla, setControla] = useState(material?.controlaStock ?? true)
  const unidadInicial = material?.unidadMedidaId ?? opciones.unidades.find((unidad) => unidad.codigo === 'UNI')?.id
  const tasaInicial = material?.tasaIvaId ?? opciones.tasas.find((tasa) => tasa.codigo === '10')?.id

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const costo = numeroOpcional(valorInput(form, 'costo'))
    if (costo == null) {
      setError('El costo es obligatorio')
      return
    }
    const cuerpo = {
      codigo: valorInput(form, 'codigo'),
      codigoReferencia: textoOpcional(valorInput(form, 'codigoReferencia')),
      descripcion: valorInput(form, 'descripcion'),
      unidadMedidaId: Number(valorInput(form, 'unidadMedidaId')),
      tasaIvaId: Number(valorInput(form, 'tasaIvaId')),
      rubro: textoOpcional(valorInput(form, 'rubro')),
      costo,
      precioMinorista: numeroOpcional(valorInput(form, 'precioMinorista')),
      precioMayorista: numeroOpcional(valorInput(form, 'precioMayorista')),
      precioEspecial: numeroOpcional(valorInput(form, 'precioEspecial')),
      controlaStock: controla,
      activo: material ? marcado(form, 'activo') : true,
      existenciaInicial: material || !controla ? null : numeroOpcional(valorInput(form, 'existenciaInicial')) ?? 0,
    }
    setGuardando(true)
    try {
      if (material) {
        await apiActualizar(`/productos/${material.id}`, cuerpo)
      } else {
        await apiCrear('/productos', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el material')
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={material ? `Editar ${material.codigo}` : 'Nuevo material'} onCerrar={onCerrar}>
      <form className="grilla" onSubmit={(event) => void guardar(event)}>
        <div className="span">
          <Aviso mensaje={error} />
        </div>
        <Campo etiqueta="Código">
          <input name="codigo" required maxLength={20} defaultValue={material?.codigo ?? ''} />
        </Campo>
        <Campo etiqueta="Referencia">
          <input name="codigoReferencia" maxLength={30} defaultValue={material?.codigoReferencia ?? ''} />
        </Campo>
        <div className="span">
          <Campo etiqueta="Descripción">
            <input name="descripcion" required maxLength={150} defaultValue={material?.descripcion ?? ''} />
          </Campo>
        </div>
        <Campo etiqueta="Unidad">
          <select name="unidadMedidaId" required defaultValue={unidadInicial ?? ''}>
            {opciones.unidades.map((unidad) => (
              <option key={unidad.id} value={unidad.id}>
                {unidad.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="IVA">
          <select name="tasaIvaId" required defaultValue={tasaInicial ?? ''}>
            {opciones.tasas.map((tasa) => (
              <option key={tasa.id} value={tasa.id}>
                {tasa.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <div className="span">
          <Campo etiqueta="Rubro">
            <input name="rubro" list="rubros-material" maxLength={80} defaultValue={material?.rubro ?? ''} />
          </Campo>
          <datalist id="rubros-material">
            {opciones.rubros.map((rubro) => (
              <option key={rubro.id} value={rubro.nombre} />
            ))}
          </datalist>
        </div>
        <Campo etiqueta="Costo">
          <Monto name="costo" valor={material?.costo} required />
        </Campo>
        <Campo etiqueta="Minorista">
          <Monto name="precioMinorista" valor={material?.precioMinorista} />
        </Campo>
        <Campo etiqueta="Mayorista">
          <Monto name="precioMayorista" valor={material?.precioMayorista} />
        </Campo>
        <Campo etiqueta="Especial">
          <Monto name="precioEspecial" valor={material?.precioEspecial} />
        </Campo>
        {!material && controla ? (
          <Campo etiqueta="Existencia inicial">
            <Monto name="existenciaInicial" decimales={3} />
          </Campo>
        ) : null}
        <label className="check">
          <input type="checkbox" checked={controla} onChange={(event) => setControla(event.target.checked)} />
          Controla stock
        </label>
        {material ? (
          <label className="check">
            <input name="activo" type="checkbox" defaultChecked={material.activo} />
            Activo
          </label>
        ) : null}
        <div className="dialogo-acciones">
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

function FormularioStock({
  material,
  deposito,
  onCerrar,
  onGuardado,
}: {
  material: Material
  deposito: string
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [modo, setModo] = useState<'CONTEO' | 'MOVIMIENTO'>('CONTEO')

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const informada = numeroOpcional(valorInput(form, 'cantidad'))
    if (informada == null) {
      setError(modo === 'CONTEO' ? 'Indicá la existencia contada' : 'Indicá la cantidad del movimiento')
      return
    }
    setGuardando(true)
    try {
      await apiCrear(`/productos/${material.id}/stock`, {
        modo,
        cantidad: informada,
        observacion: valorInput(form, 'observacion'),
      })
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo actualizar el stock')
      setGuardando(false)
    }
  }

  return (
    <Dialogo clase="angosto" titulo={`Stock de ${material.codigo}`} onCerrar={onCerrar}>
      <form className="grilla" onSubmit={(event) => void guardar(event)}>
        <div className="span">
          <Aviso mensaje={error} />
        </div>
        <p className="span ayuda">
          {material.descripcion}. Existencia actual en {deposito}: {cantidad(material.existencia)}.
        </p>
        <div className="span dialogo-acciones">
          <button type="button" className={modo === 'CONTEO' ? 'btn primary' : 'btn'} onClick={() => setModo('CONTEO')}>
            Conteo
          </button>
          <button type="button" className={modo === 'MOVIMIENTO' ? 'btn primary' : 'btn'} onClick={() => setModo('MOVIMIENTO')}>
            Ingreso o salida
          </button>
        </div>
        {modo === 'CONTEO' ? (
          <div className="span">
            <Campo etiqueta="Existencia contada">
              <Monto key="conteo" name="cantidad" valor={material.existencia} decimales={3} required />
            </Campo>
          </div>
        ) : (
          <div className="span">
            <Campo etiqueta="Cantidad">
              <Monto key="movimiento" name="cantidad" decimales={3} required />
            </Campo>
            <p className="ayuda">Positivo ingresa mercadería. Negativo registra una salida.</p>
          </div>
        )}
        <div className="span">
          <Campo etiqueta="Motivo">
            <textarea name="observacion" required maxLength={200} rows={3} />
          </Campo>
        </div>
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            Registrar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function marcado(form: HTMLFormElement, nombre: string): boolean {
  const campo = form.elements.namedItem(nombre)
  return campo instanceof HTMLInputElement && campo.checked
}
