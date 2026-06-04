const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

export function formatMXN(value) {
  return mxnFormatter.format(value || 0)
}

export function formatMenuPrice(item) {
  if (item?.hasPrice) {
    return formatMXN(item.price)
  }
  if (item?.priceMode === 'configured' || item?.requiresConfiguration) {
    return 'Precio por opciones'
  }
  return 'Precio en tienda'
}
