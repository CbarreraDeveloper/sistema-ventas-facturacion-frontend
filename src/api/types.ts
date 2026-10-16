export type Sesion = {
  token: string
  username: string
  nombre?: string
  mustChangePassword: boolean
  roles: string[]
}

export type Material = {
  id: number
  codigo: string
  codigoReferencia: string | null
  descripcion: string
  unidadMedidaId: number
  unidad: string
  tasaIvaId: number
  porcentajeIva: number
  rubro: string | null
  costo: number
  precioMinorista: number | null
  precioMayorista: number | null
  precioEspecial: number | null
  existencia: number
  controlaStock: boolean
  activo: boolean
}

export type OpcionCatalogo = {
  id: number
  codigo: string | null
  nombre: string
}

export type TasaOpcion = {
  id: number
  codigo: string
  nombre: string
  porcentaje: number
}

export type OpcionesMaterial = {
  unidades: OpcionCatalogo[]
  tasas: TasaOpcion[]
  rubros: OpcionCatalogo[]
  deposito: string
}

export type Tercero = {
  id: number
  razonSocial: string
  tipoPersona: 'FISICA' | 'JURIDICA'
  contribuyente: boolean
  documento: string | null
  digitoVerificador: string | null
  telefono: string | null
  celular: string | null
  email: string | null
  esCliente: boolean
  esProveedor: boolean
  limiteCredito: number | null
  plazoDias: number | null
}

export type Obra = {
  id: number
  terceroId: number
  nombre: string
  direccion: string | null
  ciudad: string | null
}

export type CompraLinea = {
  productoId: number | null
  codigo: string | null
  descripcion: string
  cantidad: number
  precioUnitario: number
  porcentajeIva: number
  iva: number
  total: number
}

export type Compra = {
  id: number
  fecha: string
  proveedorId: number
  proveedor: string
  proveedorDocumento: string | null
  numeroComprobante: string
  timbradoNumero: string | null
  condicion: 'CONTADO' | 'CREDITO'
  estado: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO'
  observacion: string | null
  totalExento: number
  totalGravado5: number
  totalGravado10: number
  totalIva5: number
  totalIva10: number
  total: number
  lineas: CompraLinea[]
}

export type VentaLinea = {
  productoId: number | null
  codigo: string | null
  descripcion: string
  unidad: string | null
  cantidad: number
  precioUnitario: number
  descuento: number
  porcentajeIva: number
  iva: number
  total: number
}

export type Venta = {
  id: number
  fecha: string
  clienteId: number | null
  cliente: string
  clienteDocumento: string | null
  clienteDireccion: string | null
  obraId: number | null
  obra: string | null
  condicion: 'CONTADO' | 'CREDITO'
  estado: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO'
  numeroComprobante: string
  timbradoNumero: string
  timbradoInicio: string
  timbradoFin: string
  listaPrecio: string | null
  observacion: string | null
  totalExento: number
  totalGravado5: number
  totalGravado10: number
  totalIva5: number
  totalIva10: number
  total: number
  usuario: string | null
  lineas: VentaLinea[]
}

export type PuntoVenta = {
  puntoExpedicionId: number
  codigo: string
  descripcion: string
  timbrado: string
  vigenteHasta: string
  proximoComprobante: string
  disponibles: number
}

export type VentaOpciones = {
  empresaConfigurada: boolean
  puntos: PuntoVenta[]
  listas: OpcionCatalogo[]
}

export type Empresa = {
  configurada: boolean
  razonSocial: string | null
  nombreFantasia: string | null
  ruc: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

export type Sucursal = {
  id: number
  nombre: string
  direccion: string | null
  activo: boolean
}

export type PuntoExpedicion = {
  id: number
  sucursalId: number
  sucursal: string
  establecimiento: string
  punto: string
  descripcion: string
  activo: boolean
}

export type TipoTimbrado = 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'REMISION'

export type Timbrado = {
  id: number
  puntoExpedicionId: number
  puntoExpedicion: string
  numero: string
  tipoComprobante: TipoTimbrado
  fechaInicio: string
  fechaFin: string
  numeroDesde: number
  numeroHasta: number
  proximoNumero: number
  activo: boolean
  vigente: boolean
  usado: boolean
  disponibles: number
}

export type Resumen = {
  materiales: number
  proveedores: number
  clientes: number
}

export type Usuario = {
  id: number
  nombre: string
  username: string
  roles: string[]
  mustChangePassword: boolean
  activo: boolean
}
