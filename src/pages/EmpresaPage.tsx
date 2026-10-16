import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiActualizar, apiCrear, apiListar, dinero, fecha, texto } from '../api/client'
import type { Empresa, PuntoExpedicion, Sucursal, Timbrado, TipoTimbrado } from '../api/types'
import { Aviso, Barra, Campo, Dialogo, textoOpcional, valorInput } from '../components/ui'

const TIPOS: { valor: TipoTimbrado; etiqueta: string }[] = [
  { valor: 'FACTURA', etiqueta: 'Factura' },
  { valor: 'NOTA_CREDITO', etiqueta: 'Nota de crédito' },
  { valor: 'NOTA_DEBITO', etiqueta: 'Nota de débito' },
  { valor: 'REMISION', etiqueta: 'Nota de remisión' },
]

function etiquetaTipo(tipo: TipoTimbrado): string {
  return TIPOS.find((item) => item.valor === tipo)?.etiqueta ?? tipo
}

export function EmpresaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [puntos, setPuntos] = useState<PuntoExpedicion[]>([])
  const [timbrados, setTimbrados] = useState<Timbrado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [sucursal, setSucursal] = useState<Sucursal | 'nueva' | null>(null)
  const [punto, setPunto] = useState<PuntoExpedicion | 'nuevo' | null>(null)
  const [timbrado, setTimbrado] = useState<Timbrado | 'nuevo' | null>(null)

  async function cargar() {
    try {
      const [datos, listaSucursales, listaPuntos, listaTimbrados] = await Promise.all([
        apiListar<Empresa>('/empresa'),
        apiListar<Sucursal[]>('/empresa/sucursales'),
        apiListar<PuntoExpedicion[]>('/empresa/puntos'),
        apiListar<Timbrado[]>('/empresa/timbrados'),
      ])
      setEmpresa(datos)
      setSucursales(listaSucursales)
      setPuntos(listaPuntos)
      setTimbrados(listaTimbrados)
      setError(null)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo leer la configuración')
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function guardarEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setGuardando(true)
    setAviso(null)
    try {
      setEmpresa(
        await apiActualizar<Empresa>('/empresa', {
          razonSocial: valorInput(form, 'razonSocial'),
          nombreFantasia: textoOpcional(valorInput(form, 'nombreFantasia')),
          ruc: valorCrudo(form, 'ruc'),
          telefono: textoOpcional(valorCrudo(form, 'telefono')),
          email: textoOpcional(valorCrudo(form, 'email')),
          direccion: textoOpcional(valorInput(form, 'direccion')),
        }),
      )
      setError(null)
      setAviso('Datos de la empresa guardados.')
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron guardar los datos')
    } finally {
      setGuardando(false)
    }
  }

  const refrescar = () => {
    setSucursal(null)
    setPunto(null)
    setTimbrado(null)
    void cargar()
  }

  return (
    <section>
      <Barra kicker="Configuración" titulo="Empresa" detalle="Datos que salen impresos en las facturas y numeración autorizada por la DNIT." />
      <Aviso mensaje={error} />

      <div className="seccion ficha">
        <div className="seccion-cabecera">
          <div>
            <h3>Datos fiscales</h3>
            <p>{empresa?.configurada ? 'Así figura el emisor en los comprobantes.' : 'Todavía no se cargaron los datos de la empresa.'}</p>
          </div>
        </div>
        {empresa ? (
          <form key={empresa.ruc ?? 'nueva'} className="grilla" onSubmit={(event) => void guardarEmpresa(event)}>
            <Campo etiqueta="Razón social">
              <input name="razonSocial" required maxLength={150} defaultValue={empresa.razonSocial ?? ''} />
            </Campo>
            <Campo etiqueta="Nombre de fantasía">
              <input name="nombreFantasia" maxLength={150} defaultValue={empresa.nombreFantasia ?? ''} />
            </Campo>
            <Campo etiqueta="RUC con dígito verificador">
              <input name="ruc" required placeholder="80000000-1" maxLength={10} defaultValue={empresa.ruc ?? ''} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input name="telefono" maxLength={40} defaultValue={empresa.telefono ?? ''} />
            </Campo>
            <Campo etiqueta="Correo">
              <input name="email" type="email" maxLength={120} defaultValue={empresa.email ?? ''} />
            </Campo>
            <Campo etiqueta="Dirección">
              <input name="direccion" maxLength={200} defaultValue={empresa.direccion ?? ''} />
            </Campo>
            <div className="dialogo-acciones">
              {aviso ? <span className="ayuda">{aviso}</span> : null}
              <button className="btn primary" type="submit" disabled={guardando}>
                Guardar datos
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="seccion">
        <div className="seccion-cabecera">
          <div>
            <h3>Sucursales</h3>
            <p>Cada sucursal tiene sus establecimientos y depósitos.</p>
          </div>
          <button type="button" className="btn" onClick={() => setSucursal('nueva')}>
            Nueva sucursal
          </button>
        </div>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sucursales.map((item) => (
                <tr key={item.id} className={item.activo ? undefined : 'baja'}>
                  <td>{item.nombre}</td>
                  <td>{texto(item.direccion)}</td>
                  <td>{item.activo ? 'Activa' : 'Baja'}</td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => setSucursal(item)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="seccion">
        <div className="seccion-cabecera">
          <div>
            <h3>Puntos de expedición</h3>
            <p>Establecimiento y punto que van al inicio del número de factura, por ejemplo 001-001.</p>
          </div>
          <button type="button" className="btn" onClick={() => setPunto('nuevo')} disabled={sucursales.length === 0}>
            Nuevo punto
          </button>
        </div>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {puntos.map((item) => (
                <tr key={item.id} className={item.activo ? undefined : 'baja'}>
                  <td>
                    {item.establecimiento}-{item.punto}
                  </td>
                  <td>{item.descripcion}</td>
                  <td>{item.sucursal}</td>
                  <td>{item.activo ? 'Activo' : 'Baja'}</td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => setPunto(item)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {puntos.length === 0 ? <p className="vacio">Cargá al menos un punto de expedición para poder facturar.</p> : null}
      </div>

      <div className="seccion">
        <div className="seccion-cabecera">
          <div>
            <h3>Timbrados</h3>
            <p>Número autorizado, vigencia y rango de comprobantes de cada talonario.</p>
          </div>
          <button type="button" className="btn" onClick={() => setTimbrado('nuevo')} disabled={puntos.length === 0}>
            Nuevo timbrado
          </button>
        </div>
        <div className="tabla-contenedor">
          <table className="tabla ancha">
            <thead>
              <tr>
                <th>Timbrado</th>
                <th>Comprobante</th>
                <th>Punto</th>
                <th className="fecha">Desde</th>
                <th className="fecha">Hasta</th>
                <th className="numero">Rango</th>
                <th className="numero">Próximo</th>
                <th className="numero">Disponibles</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {timbrados.map((item) => (
                <tr key={item.id} className={item.activo ? undefined : 'baja'}>
                  <td>{item.numero}</td>
                  <td>{etiquetaTipo(item.tipoComprobante)}</td>
                  <td>{item.puntoExpedicion}</td>
                  <td className="fecha">{fecha(item.fechaInicio)}</td>
                  <td className="fecha">{fecha(item.fechaFin)}</td>
                  <td className="numero">
                    {dinero(item.numeroDesde)} a {dinero(item.numeroHasta)}
                  </td>
                  <td className="numero">{item.proximoNumero > item.numeroHasta ? '—' : dinero(item.proximoNumero)}</td>
                  <td className="numero">{dinero(item.disponibles)}</td>
                  <td>
                    <EstadoTimbrado timbrado={item} />
                  </td>
                  <td className="acciones">
                    <button type="button" className="btn ghost" onClick={() => setTimbrado(item)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {timbrados.length === 0 ? <p className="vacio">Todavía no hay timbrados cargados.</p> : null}
      </div>

      {sucursal ? (
        <FormularioSucursal sucursal={sucursal === 'nueva' ? null : sucursal} onCerrar={() => setSucursal(null)} onGuardado={refrescar} />
      ) : null}
      {punto ? (
        <FormularioPunto
          punto={punto === 'nuevo' ? null : punto}
          sucursales={sucursales.filter((item) => item.activo || (punto !== 'nuevo' && item.id === punto.sucursalId))}
          onCerrar={() => setPunto(null)}
          onGuardado={refrescar}
        />
      ) : null}
      {timbrado ? (
        <FormularioTimbrado
          timbrado={timbrado === 'nuevo' ? null : timbrado}
          puntos={puntos.filter((item) => item.activo || (timbrado !== 'nuevo' && item.id === timbrado.puntoExpedicionId))}
          onCerrar={() => setTimbrado(null)}
          onGuardado={refrescar}
        />
      ) : null}
    </section>
  )
}

function EstadoTimbrado({ timbrado }: { timbrado: Timbrado }) {
  if (!timbrado.activo) {
    return <span className="estado anulado">Baja</span>
  }
  if (timbrado.vigente) {
    return <span className="estado">Vigente</span>
  }
  return <span className="estado alerta">{timbrado.disponibles === 0 ? 'Agotado' : 'Fuera de vigencia'}</span>
}

function FormularioSucursal({
  sucursal,
  onCerrar,
  onGuardado,
}: {
  sucursal: Sucursal | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const cuerpo = {
      nombre: valorInput(form, 'nombre'),
      direccion: textoOpcional(valorInput(form, 'direccion')),
      activo: sucursal ? marcado(form, 'activo') : true,
    }
    try {
      if (sucursal) {
        await apiActualizar(`/empresa/sucursales/${sucursal.id}`, cuerpo)
      } else {
        await apiCrear('/empresa/sucursales', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar la sucursal')
    }
  }

  return (
    <Dialogo clase="angosto" titulo={sucursal ? 'Editar sucursal' : 'Nueva sucursal'} onCerrar={onCerrar}>
      <form className="grilla" onSubmit={(event) => void guardar(event)}>
        <div className="span">
          <Aviso mensaje={error} />
        </div>
        <div className="span">
          <Campo etiqueta="Nombre">
            <input name="nombre" required maxLength={120} defaultValue={sucursal?.nombre ?? ''} />
          </Campo>
        </div>
        <div className="span">
          <Campo etiqueta="Dirección">
            <input name="direccion" maxLength={200} defaultValue={sucursal?.direccion ?? ''} />
          </Campo>
        </div>
        {sucursal ? (
          <label className="check">
            <input name="activo" type="checkbox" defaultChecked={sucursal.activo} />
            Activa
          </label>
        ) : null}
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function FormularioPunto({
  punto,
  sucursales,
  onCerrar,
  onGuardado,
}: {
  punto: PuntoExpedicion | null
  sucursales: Sucursal[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const cuerpo = {
      sucursalId: Number(valorInput(form, 'sucursalId')),
      establecimiento: valorCrudo(form, 'establecimiento'),
      punto: valorCrudo(form, 'punto'),
      descripcion: valorInput(form, 'descripcion'),
      activo: punto ? marcado(form, 'activo') : true,
    }
    try {
      if (punto) {
        await apiActualizar(`/empresa/puntos/${punto.id}`, cuerpo)
      } else {
        await apiCrear('/empresa/puntos', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el punto')
    }
  }

  return (
    <Dialogo clase="angosto" titulo={punto ? 'Editar punto de expedición' : 'Nuevo punto de expedición'} onCerrar={onCerrar}>
      <form className="grilla" onSubmit={(event) => void guardar(event)}>
        <div className="span">
          <Aviso mensaje={error} />
        </div>
        <Campo etiqueta="Establecimiento">
          <input name="establecimiento" required inputMode="numeric" maxLength={3} placeholder="001" defaultValue={punto?.establecimiento ?? ''} />
        </Campo>
        <Campo etiqueta="Punto">
          <input name="punto" required inputMode="numeric" maxLength={3} placeholder="001" defaultValue={punto?.punto ?? ''} />
        </Campo>
        <div className="span">
          <Campo etiqueta="Descripción">
            <input name="descripcion" required maxLength={80} placeholder="Caja mostrador" defaultValue={punto?.descripcion ?? ''} />
          </Campo>
        </div>
        <div className="span">
          <Campo etiqueta="Sucursal">
            <select name="sucursalId" required defaultValue={punto?.sucursalId ?? sucursales[0]?.id ?? ''}>
              {sucursales.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        {punto ? (
          <label className="check">
            <input name="activo" type="checkbox" defaultChecked={punto.activo} />
            Activo
          </label>
        ) : null}
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function FormularioTimbrado({
  timbrado,
  puntos,
  onCerrar,
  onGuardado,
}: {
  timbrado: Timbrado | null
  puntos: PuntoExpedicion[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const bloqueado = timbrado?.usado ?? false

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const desde = Number(valorCrudo(form, 'numeroDesde'))
    const proximo = valorCrudo(form, 'proximoNumero')
    const cuerpo = {
      puntoExpedicionId: Number(valorInput(form, 'puntoExpedicionId')),
      numero: valorCrudo(form, 'numero'),
      tipoComprobante: valorInput(form, 'tipoComprobante'),
      fechaInicio: valorInput(form, 'fechaInicio'),
      fechaFin: valorInput(form, 'fechaFin'),
      numeroDesde: desde,
      numeroHasta: Number(valorCrudo(form, 'numeroHasta')),
      proximoNumero: proximo ? Number(proximo) : desde,
      activo: timbrado ? marcado(form, 'activo') : true,
    }
    try {
      if (timbrado) {
        await apiActualizar(`/empresa/timbrados/${timbrado.id}`, cuerpo)
      } else {
        await apiCrear('/empresa/timbrados', cuerpo)
      }
      onGuardado()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el timbrado')
    }
  }

  return (
    <Dialogo titulo={timbrado ? `Timbrado ${timbrado.numero}` : 'Nuevo timbrado'} onCerrar={onCerrar}>
      <form className="grilla" onSubmit={(event) => void guardar(event)}>
        <div className="span">
          <Aviso mensaje={error} />
          {bloqueado ? (
            <p className="ayuda">Este timbrado ya emitió comprobantes. Se puede extender la vigencia, el último número o darlo de baja.</p>
          ) : null}
        </div>
        <Campo etiqueta="Número de timbrado">
          <input name="numero" required inputMode="numeric" maxLength={8} placeholder="12345678" disabled={bloqueado} defaultValue={timbrado?.numero ?? ''} />
        </Campo>
        <Campo etiqueta="Comprobante">
          <select name="tipoComprobante" disabled={bloqueado} defaultValue={timbrado?.tipoComprobante ?? 'FACTURA'}>
            {TIPOS.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Punto de expedición">
          <select name="puntoExpedicionId" required disabled={bloqueado} defaultValue={timbrado?.puntoExpedicionId ?? puntos[0]?.id ?? ''}>
            {puntos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.establecimiento}-{item.punto} · {item.descripcion}
              </option>
            ))}
          </select>
        </Campo>
        <div />
        <Campo etiqueta="Vigencia desde">
          <input name="fechaInicio" type="date" required defaultValue={timbrado?.fechaInicio ?? ''} />
        </Campo>
        <Campo etiqueta="Vigencia hasta">
          <input name="fechaFin" type="date" required defaultValue={timbrado?.fechaFin ?? ''} />
        </Campo>
        <Campo etiqueta="Primer número">
          <input name="numeroDesde" type="number" min={1} required disabled={bloqueado} defaultValue={timbrado?.numeroDesde ?? 1} />
        </Campo>
        <Campo etiqueta="Último número">
          <input name="numeroHasta" type="number" min={1} max={9999999} required defaultValue={timbrado?.numeroHasta ?? ''} />
        </Campo>
        <Campo etiqueta="Próximo número a usar">
          <input name="proximoNumero" type="number" min={1} defaultValue={timbrado?.proximoNumero ?? ''} placeholder="Igual al primero" />
        </Campo>
        <p className="ayuda">Si el talonario ya se empezó a usar a mano, poné el número de la próxima factura en blanco.</p>
        {timbrado ? (
          <label className="check">
            <input name="activo" type="checkbox" defaultChecked={timbrado.activo} />
            Activo
          </label>
        ) : null}
        <div className="dialogo-acciones">
          <button className="btn" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

function valorCrudo(form: HTMLFormElement, nombre: string): string {
  const campo = form.elements.namedItem(nombre)
  if (campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement) {
    return campo.value.trim()
  }
  return ''
}

function marcado(form: HTMLFormElement, nombre: string): boolean {
  const campo = form.elements.namedItem(nombre)
  return campo instanceof HTMLInputElement && campo.checked
}
