import type { Material, Tercero } from '../api/types'

export const SIN_NOMBRE = 'SIN NOMBRE'

export function etiquetaMaterial(material: Material): string {
  return `${material.codigo} · ${material.descripcion}`
}

export function etiquetaCliente(cliente: Tercero): string {
  if (!cliente.documento) {
    return cliente.razonSocial
  }
  const documento = cliente.digitoVerificador ? `${cliente.documento}-${cliente.digitoVerificador}` : cliente.documento
  return `${cliente.razonSocial} · ${documento}`
}
