const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

export function formatMXN(value) {
  return mxnFormatter.format(value || 0)
}

export function formatMenuPrice(item) {
  return item?.hasPrice ? formatMXN(item.price) : 'Precio en tienda'
}
