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
  direccion: string | null
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
  plazoDias: number | null
  vencimiento: string | null
  saldo: number
  medioPago: string | null
  referenciaPago: string | null
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
  clienteTelefono: string | null
  plazoDias: number | null
  notaRemision: string | null
  presupuestoId: number | null
  presupuestoNumero: string | null
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
  pagos: PagoLinea[]
}

export type PagoLinea = {
  medio: string
  monto: number
  referencia: string | null
}

export type EstadoPresupuesto = 'PENDIENTE' | 'VENCIDO' | 'FACTURADO' | 'ANULADO'

export type Presupuesto = {
  id: number
  numero: string
  fecha: string
  validezDias: number
  validoHasta: string
  estado: EstadoPresupuesto
  clienteId: number | null
  cliente: string
  clienteNombre: string | null
  clienteDocumento: string | null
  clienteTelefono: string | null
  clienteDireccion: string | null
  obraId: number | null
  obra: string | null
  condicion: 'CONTADO' | 'CREDITO'
  plazoDias: number | null
  listaPrecio: string | null
  listaPrecioNombre: string | null
  observacion: string | null
  totalExento: number
  totalGravado5: number
  totalGravado10: number
  totalIva5: number
  totalIva10: number
  total: number
  usuario: string | null
  facturaId: number | null
  facturaNumero: string | null
  lineas: VentaLinea[]
}

export type SaldoCliente = {
  clienteId: number
  cliente: string
  documento: string | null
  limiteCredito: number | null
  saldo: number
  vencido: number
  facturas: number
  diasAtraso: number
}

export type FacturaPendiente = {
  id: number
  numeroComprobante: string
  fecha: string
  vencimiento: string | null
  obra: string | null
  total: number
  cobrado: number
  acreditado: number
  saldo: number
  diasAtraso: number
}

export type MovimientoCuenta = {
  fecha: string
  tipo: 'FACTURA' | 'RECIBO' | 'NOTA_CREDITO' | 'COMPRA' | 'ORDEN_PAGO'
  id: number
  numero: string
  detalle: string
  debe: number
  haber: number
  saldo: number
}

export type Recibo = {
  id: number
  numero: string
  fecha: string
  clienteId: number
  cliente: string
  clienteDocumento: string | null
  total: number
  estado: 'CONFIRMADO' | 'ANULADO'
  observacion: string | null
  usuario: string | null
  aplicaciones: { comprobanteId: number; numeroComprobante: string; monto: number }[]
  pagos: PagoLinea[]
}

export type EstadoCuenta = {
  clienteId: number
  cliente: string
  documento: string | null
  telefono: string | null
  limiteCredito: number | null
  plazoDias: number | null
  saldo: number
  vencido: number
  disponible: number | null
  pendientes: FacturaPendiente[]
  movimientos: MovimientoCuenta[]
  recibos: Recibo[]
}

export type SaldoProveedor = {
  proveedorId: number
  proveedor: string
  documento: string | null
  saldo: number
  vencido: number
  compras: number
  diasAtraso: number
}

export type CompraPendiente = {
  id: number
  numeroComprobante: string
  fecha: string
  vencimiento: string | null
  total: number
  pagado: number
  saldo: number
  diasAtraso: number
}

export type OrdenPago = {
  id: number
  numero: string
  fecha: string
  proveedorId: number
  proveedor: string
  proveedorDocumento: string | null
  total: number
  estado: 'CONFIRMADO' | 'ANULADO'
  observacion: string | null
  usuario: string | null
  aplicaciones: { comprobanteId: number; numeroComprobante: string; monto: number }[]
  pagos: PagoLinea[]
}

export type EstadoProveedor = {
  proveedorId: number
  proveedor: string
  documento: string | null
  telefono: string | null
  plazoDias: number | null
  saldo: number
  vencido: number
  pendientes: CompraPendiente[]
  movimientos: MovimientoCuenta[]
  ordenes: OrdenPago[]
}

export type TipoMovimientoCaja = 'INGRESO' | 'EGRESO'

export type CajaMovimiento = {
  id: number
  fecha: string
  tipo: TipoMovimientoCaja
  medio: string
  monto: number
  concepto: string
  comprobanteId: number | null
  usuario: string | null
}

export type CajaTotalMedio = {
  codigo: string
  medio: string
  ingresos: number
  egresos: number
  saldo: number
}

export type CajaSesion = {
  id: number
  sucursal: string
  usuario: string
  abiertaEn: string
  cerradaEn: string | null
  estado: 'ABIERTA' | 'CERRADA'
  montoApertura: number
  efectivoEsperado: number
  montoCierre: number | null
  diferencia: number | null
  totalIngresos: number
  totalEgresos: number
  observacion: string | null
  totales: CajaTotalMedio[]
  movimientos: CajaMovimiento[]
}

export type PuntoVenta = {
  puntoExpedicionId: number
  codigo: string
  descripcion: string
  timbrado: string
  vigenteHasta: string
  proximoComprobante: string | null
  proximoNumero: number | null
  prefijo: string
  numeroDesde: number
  numeroHasta: number
  disponibles: number
}

export type VentaOpciones = {
  empresaConfigurada: boolean
  puntos: PuntoVenta[]
  listas: OpcionCatalogo[]
  medios: OpcionCatalogo[]
  cajaAbierta: boolean
}

export type Empresa = {
  configurada: boolean
  razonSocial: string | null
  nombreFantasia: string | null
  ruc: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  actividades: string | null
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

export type MasVendido = {
  codigo: string
  descripcion: string
  unidad: string | null
  cantidad: number
  importe: number
}

export type ReporteVentas = {
  desde: string
  hasta: string
  facturas: number
  anuladas: number
  contado: number
  credito: number
  notasCredito: number
  neto: number
  iva10: number
  iva5: number
  promedio: number
  dias: { fecha: string; facturas: number; contado: number; credito: number; notasCredito: number; neto: number }[]
  vendedores: { usuario: string; facturas: number; facturado: number; notasCredito: number; neto: number }[]
}

export type ProductoVendido = {
  codigo: string
  descripcion: string
  rubro: string | null
  unidad: string | null
  cantidad: number
  importe: number
  costoUnitario: number
  costo: number
  utilidad: number
  margen: number
}

export type ReporteProductos = {
  desde: string
  hasta: string
  importe: number
  costo: number
  utilidad: number
  margen: number
  lineas: ProductoVendido[]
}

export type LineaLibroIva = {
  id: number
  fecha: string
  tipo: string
  numero: string
  timbrado: string | null
  ruc: string | null
  razonSocial: string
  condicion: 'CONTADO' | 'CREDITO'
  estado: string
  gravado10: number
  iva10: number
  gravado5: number
  iva5: number
  exento: number
  total: number
}

export type LibroIva = {
  desde: string
  hasta: string
  gravado10: number
  iva10: number
  gravado5: number
  iva5: number
  exento: number
  total: number
  lineas: LineaLibroIva[]
}

export type LineaStock = {
  codigo: string
  descripcion: string
  rubro: string | null
  unidad: string
  existencia: number
  costo: number
  valorizado: number
}

export type ReporteStock = {
  productos: number
  sinStock: number
  valorizado: number
  lineas: LineaStock[]
}

export type DeudaCliente = {
  clienteId: number
  cliente: string
  documento: string | null
  facturas: number
  vencimientoMasAntiguo: string
  saldo: number
  porVencer: number
  hasta30: number
  hasta60: number
  hasta90: number
  mas90: number
}

export type ReporteCobranzas = {
  corte: string
  saldo: number
  porVencer: number
  hasta30: number
  hasta60: number
  hasta90: number
  mas90: number
  clientes: DeudaCliente[]
}

export type FilaCaja = { nombre: string; ingresos: number; egresos: number; neto: number }

export type ReporteCaja = {
  desde: string
  hasta: string
  ingresos: number
  egresos: number
  neto: number
  medios: FilaCaja[]
  origenes: FilaCaja[]
}

export type Usuario = {
  id: number
  nombre: string
  username: string
  roles: string[]
  mustChangePassword: boolean
  activo: boolean
  conectado: boolean
  ultimaActividad: string | null
}

export type MotivoTraslado = 'VENTA' | 'CONSIGNACION' | 'DEVOLUCION' | 'TRASLADO_ENTRE_LOCALES' | 'EXHIBICION' | 'OTRO'

export type RemisionLinea = {
  productoId: number | null
  codigo: string | null
  descripcion: string
  unidad: string | null
  cantidad: number
}

export type Remision = {
  id: number
  numeroComprobante: string
  fecha: string
  estado: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO'
  timbradoNumero: string
  clienteId: number | null
  cliente: string
  clienteDocumento: string | null
  clienteDireccion: string | null
  obraId: number | null
  obra: string | null
  facturaId: number | null
  facturaNumero: string | null
  motivo: MotivoTraslado
  fechaInicioTraslado: string
  fechaFinTraslado: string | null
  puntoPartida: string
  puntoLlegada: string
  transportistaNombre: string | null
  transportistaRuc: string | null
  vehiculoMarca: string | null
  vehiculoChapa: string
  conductorNombre: string
  conductorDocumento: string
  conductorDireccion: string | null
  observacion: string | null
  usuario: string | null
  lineas: RemisionLinea[]
}

export type RemisionOpciones = {
  empresaConfigurada: boolean
  puntoPartida: string | null
  puntos: PuntoVenta[]
}

export type MotivoCredito = 'DEVOLUCION' | 'DESCUENTO' | 'BONIFICACION' | 'AJUSTE_PRECIO'

export type NotaCredito = {
  id: number
  numeroComprobante: string
  fecha: string
  estado: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO'
  timbradoNumero: string
  clienteId: number | null
  cliente: string
  clienteDocumento: string | null
  facturaId: number
  facturaNumero: string
  facturaFecha: string
  condicion: 'CONTADO' | 'CREDITO'
  motivo: MotivoCredito
  totalExento: number
  totalGravado5: number
  totalGravado10: number
  totalIva5: number
  totalIva10: number
  total: number
  aplicado: number
  reintegro: number
  observacion: string | null
  usuario: string | null
  lineas: VentaLinea[]
}

export type CreditoLinea = {
  detalleId: number
  codigo: string | null
  descripcion: string
  unidad: string | null
  porcentajeIva: number
  cantidad: number
  total: number
  devuelto: number
  acreditado: number
  cantidadDisponible: number
  montoDisponible: number
}

export type CreditoDisponible = {
  facturaId: number
  facturaNumero: string
  fecha: string
  cliente: string
  condicion: 'CONTADO' | 'CREDITO'
  total: number
  acreditado: number
  saldoCuenta: number
  lineas: CreditoLinea[]
}

export type NotaCreditoOpciones = {
  empresaConfigurada: boolean
  cajaAbierta: boolean
  puntos: PuntoVenta[]
  medios: OpcionCatalogo[]
}

export type EntregaPendiente = {
  productoId: number
  codigo: string
  descripcion: string
  unidad: string
  facturado: number
  remitido: number
  pendiente: number
}
