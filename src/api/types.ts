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

export type TipoMovimientoStock = 'APERTURA' | 'COMPRA' | 'VENTA' | 'REMISION' | 'DEVOLUCION' | 'AJUSTE' | 'TRANSFERENCIA'

export type MovimientoStock = {
  id: number
  fecha: string
  tipo: TipoMovimientoStock
  detalle: string | null
  entrada: number | null
  salida: number | null
  saldo: number
  usuario: string | null
}

export type ModalidadPago = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'

export type EstadoCivil = 'SOLTERO' | 'CASADO' | 'UNION_DE_HECHO' | 'DIVORCIADO' | 'VIUDO'

export type Empleado = {
  id: number
  nombres: string
  apellidos: string
  documento: string
  fechaNacimiento: string | null
  sexo: 'M' | 'F' | null
  estadoCivil: EstadoCivil | null
  nacionalidad: string | null
  hijosMenores: number | null
  profesion: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  contactoEmergencia: string | null
  telefonoEmergencia: string | null
  cargo: string
  fechaIngreso: string
  modalidadPago: ModalidadPago
  sueldoBase: number
  valorDia: number | null
  percibeComision: boolean
  usuarioId: number | null
  usuario: string | null
  aseguradoIps: boolean
  numeroIps: string | null
  banco: string | null
  numeroCuenta: string | null
  fechaEgreso: string | null
  motivoEgreso: string | null
  observacion: string | null
  activo: boolean
}

export type EmpleadoSueldo = {
  id: number
  desde: string
  modalidadPago: ModalidadPago
  sueldoBase: number
  usuario: string | null
}

export type OpcionesEmpleado = {
  cargos: string[]
  usuarios: OpcionCatalogo[]
}

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'MEDIO_DIA' | 'PERMISO' | 'REPOSO' | 'VACACIONES'

export type Asistencia = {
  id: number
  empleadoId: number
  fecha: string
  estado: EstadoAsistencia
  justificada: boolean
  horasExtra: number
  diasADescontar: number
  observacion: string | null
  registradoPor: string | null
  licenciaId: number | null
}

export type TipoLicencia = 'VACACIONES' | 'PERMISO' | 'REPOSO'

export type Licencia = {
  id: number
  empleadoId: number
  empleado: string
  cargo: string | null
  tipo: TipoLicencia
  desde: string
  hasta: string
  dias: number
  conGoce: boolean
  motivo: string | null
  registradoPor: string | null
}

export type SaldoVacaciones = {
  empleadoId: number
  empleado: string
  cargo: string | null
  fechaIngreso: string
  antiguedad: number
  diasPorAnio: number
  cuentaDesde: string
  corresponden: number
  tomadas: number
  programadas: number
  saldo: number
  proximoAniversario: string
  diasProximoAniversario: number
}

export type TipoAdelanto = 'ADELANTO' | 'PRESTAMO'

export type AdelantoCuota = {
  id: number
  numero: number
  mes: string
  monto: number
  fechaCobro: string | null
  origenCobro: 'MANUAL' | 'LIQUIDACION' | 'LIQUIDACION_FINAL' | null
}

export type Adelanto = {
  id: number
  empleadoId: number
  empleado: string
  cargo: string
  tipo: TipoAdelanto
  fecha: string
  monto: number
  cobrado: number
  saldo: number
  observacion: string | null
  cuotas: AdelantoCuota[]
  registradoPor: string | null
}

export type ConceptoViatico = 'COMBUSTIBLE' | 'COMIDA' | 'PASAJE' | 'HOSPEDAJE' | 'OTRO'

export type FormaPagoViatico = 'APARTE' | 'LIQUIDACION'

export type Viatico = {
  id: number
  empleadoId: number
  empleado: string
  cargo: string
  fecha: string
  concepto: ConceptoViatico
  detalle: string | null
  monto: number
  comprobante: string | null
  formaPago: FormaPagoViatico
  fechaPago: string | null
  registradoPor: string | null
}

export type EstadoLiquidacion = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA'

export type FormaPagoSueldo = 'EFECTIVO' | 'TRANSFERENCIA'

export type TipoLineaSueldo =
  | 'SUELDO'
  | 'HORAS_EXTRA'
  | 'COMISION'
  | 'VIATICO'
  | 'OTRO_INGRESO'
  | 'AUSENCIA'
  | 'ADELANTO'
  | 'PRESTAMO'
  | 'IPS'
  | 'OTRO_DESCUENTO'

export type MovimientoSueldo = {
  liquidacionId: number
  modalidad: ModalidadPago
  desde: string
  hasta: string
  tipo: TipoLineaSueldo
  descripcion: string
  monto: number
  haber: boolean
}

export type ReporteMovimientosRrhh = {
  desde: string
  hasta: string
  tipo: TipoLineaSueldo | null
  liquidaciones: number
  funcionarios: {
    empleadoId: number
    empleado: string
    documento: string | null
    cargo: string | null
    movimientos: MovimientoSueldo[]
    haberes: number
    descuentos: number
    neto: number
  }[]
  conceptos: { tipo: TipoLineaSueldo; haber: boolean; cantidad: number; total: number }[]
  haberes: number
  descuentos: number
  neto: number
}

export type FilaPlanillaRrhh = {
  empleadoId: number | null
  empleado: string
  documento: string | null
  cargo: string | null
  recibos: number
  sueldo: number
  ausencias: number
  horasExtra: number
  viaticos: number
  comisionesOtros: number
  adelantosPrestamos: number
  ips: number
  otrosDescuentos: number
  haberes: number
  descuentos: number
  neto: number
}

export type ReportePlanillaRrhh = {
  desde: string
  hasta: string
  liquidaciones: { id: number; modalidad: ModalidadPago; desde: string; hasta: string; recibos: number; neto: number }[]
  filas: FilaPlanillaRrhh[]
  totales: FilaPlanillaRrhh
}

export type LiquidacionResumen = {
  id: number
  modalidad: ModalidadPago
  desde: string
  hasta: string
  estado: EstadoLiquidacion
  empleados: number
  pagados: number
  totalNeto: number
  confirmadaEn: string | null
  registradoPor: string | null
}

export type LineaSueldo = {
  id: number
  tipo: TipoLineaSueldo
  descripcion: string
  monto: number
  haber: boolean
  sePuedeQuitar: boolean
}

export type ReciboSueldo = {
  id: number
  empleadoId: number
  empleado: string
  documento: string
  cargo: string | null
  numeroIps: string | null
  sueldoBase: number
  valorDia: number
  haberes: number
  descuentos: number
  neto: number
  fechaPago: string | null
  formaPago: FormaPagoSueldo | null
  lineas: LineaSueldo[]
}

export type Liquidacion = {
  id: number
  modalidad: ModalidadPago
  desde: string
  hasta: string
  estado: EstadoLiquidacion
  confirmadaEn: string | null
  totalHaberes: number
  totalDescuentos: number
  totalNeto: number
  recibos: ReciboSueldo[]
}

export type Aguinaldo = {
  id: number
  anio: number
  empleadoId: number
  empleado: string
  documento: string
  cargo: string | null
  desde: string
  hasta: string
  remuneraciones: number
  otrasRemuneraciones: number
  notaOtras: string | null
  base: number
  monto: number
  fechaPago: string | null
  formaPago: FormaPagoSueldo | null
  meses: { mes: number; remuneraciones: number }[]
  registradoPor: string | null
}

export type CalculoAguinaldo = {
  aguinaldos: Aguinaldo[]
  avisos: string[]
}

export type CausaEgreso = 'DESPIDO_INJUSTIFICADO' | 'DESPIDO_JUSTIFICADO' | 'RENUNCIA' | 'MUTUO_ACUERDO'

export type ConceptoFinal =
  | 'VACACIONES_CAUSADAS'
  | 'VACACIONES_PROPORCIONALES'
  | 'AGUINALDO_PROPORCIONAL'
  | 'PREAVISO'
  | 'INDEMNIZACION'
  | 'OTRO_INGRESO'
  | 'IPS'
  | 'SALDO_ADELANTO'
  | 'OTRO_DESCUENTO'

export type LiquidacionFinal = {
  id: number
  empleadoId: number
  empleado: string
  documento: string
  cargo: string | null
  numeroIps: string | null
  fechaIngreso: string
  fechaEgreso: string
  antiguedad: string
  causa: CausaEgreso
  causaEtiqueta: string
  motivo: string | null
  preavisoOtorgado: boolean
  salarioPromedio: number
  salarioDiarioAcordado: number | null
  salarioDiario: number
  diasVacacionesAcordados: number | null
  otrasRemuneraciones: number
  notaOtras: string | null
  haberes: number
  descuentos: number
  neto: number
  fechaPago: string | null
  formaPago: FormaPagoSueldo | null
  lineas: {
    id: number
    concepto: ConceptoFinal
    descripcion: string
    dias: number | null
    monto: number
    haber: boolean
    manual: boolean
  }[]
  avisos: string[]
  registradoPor: string | null
}

export type ModalidadCasual = 'JORNADA' | 'SEMANA'

export type VendedorCasual = {
  id: number
  nombre: string
  documento: string
  telefono: string | null
  servicios: number
  ultimoServicio: string | null
}

export type ServicioCasual = {
  id: number
  vendedorId: number
  nombre: string
  documento: string
  telefono: string | null
  modalidad: ModalidadCasual
  desde: string
  hasta: string
  montoAcordado: number
  ventas: VentaComision[]
  ventaTotal: number
  comision: number
  total: number
  fechaPago: string | null
  medioPago: string | null
  observacion: string | null
  registradoPor: string | null
}

export type VentaComision = {
  porcentaje: number
  venta: number
  comision: number
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
  comision?: ComisionVenta | null
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
  comisionistas: OpcionCatalogo[]
}

export type ComisionVenta = {
  empleadoId: number
  empleado: string
  porcentaje: number
  base: number
  monto: number
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

export type Cargo = {
  id: number
  nombre: string
  activo: boolean
  empleados: number
  categoriaMtess: CategoriaMtess
}

export type ReporteTablaRrhh = {
  titulo: string
  detalle: string
  desde: string
  hasta: string
  columnas: { titulo: string; tipo: 'TEXTO' | 'FECHA' | 'MONTO' | 'CANTIDAD' | 'PORCENTAJE' }[]
  filas: (string | number | null)[][]
  totales: (string | number | null)[] | null
  avisos: string[]
}

export type Jornada = 'COMPLETA' | 'MEDIA' | 'NO_LABORAL'

export type ConfiguracionRrhh = {
  jornadas: Jornada[]
  horasJornada: number
  diasPorSemana: number
}

export type ConceptoSueldo = {
  id: number
  nombre: string
  haber: boolean
  monto: number | null
  activo: boolean
}

export type CategoriaMtess = 'JEFE' | 'EMPLEADO' | 'OBRERO'

export type DatosMtess = {
  numeroPatronal: string | null
  horarioTrabajo: string | null
}

export type PlanillaMtess = {
  anio: number
  numeroPatronal: string | null
  empleados: {
    empleadoId: number
    empleado: string
    documento: string
    cargo: string
    categoria: CategoriaMtess
    menor: boolean
    sexo: 'M' | 'F' | null
    fechaEntrada: string
    fechaSalida: string | null
    importeUnitario: number
    horas: number
    salarios: number
    horasExtra: number
    extras: number
    aguinaldo: number
    beneficios: number
    vacaciones: number
    totalGeneral: number
  }[]
  resumen: {
    orden: number
    concepto: string
    supJefesVarones: number
    supJefesMujeres: number
    empleadosVarones: number
    empleadosMujeres: number
    obrerosVarones: number
    obrerosMujeres: number
    menoresVarones: number
    menoresMujeres: number
  }[]
  avisos: string[]
}

export type EstadoComision = 'PENDIENTE' | 'EN_LIQUIDACION' | 'LIQUIDADA'

export type Comision = {
  id: number
  empleadoId: number
  empleado: string
  cargo: string
  usuario: string | null
  desde: string
  hasta: string
  ventas: number
  notasCredito: number
  calculada: number
  ajuste: number
  motivoAjuste: string | null
  total: number
  estado: EstadoComision
  fechaLiquidada: string | null
  detalles: { rubro: string; porcentaje: number; ventas: number; notasCredito: number; comision: number }[]
  registradoPor: string | null
}

export type CalculoComisiones = {
  comisiones: Comision[]
  avisos: string[]
}

export type TasasComision = {
  general: number | null
  rubros: { rubroId: number; rubro: string; porcentaje: number | null }[]
}
