import { readFileSync } from 'node:fs'

const seed = JSON.parse(
  readFileSync(new URL('../../src/data/menuSeed.rappi.json', import.meta.url), 'utf8'),
)

const DISPLAY_SUFFIX_PATTERN =
  /\s*\((rappi|waffle|toast|kids|rc|n|pf|pan frances|pan francés)\)\s*/gi

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cleanDisplayName(value) {
  return value.replace(DISPLAY_SUFFIX_PATTERN, ' ').replace(/\s+/g, ' ').trim()
}

export const menuItemsById = new Map()

seed.categories.forEach((category, categoryIndex) => {
  const categoryName = cleanDisplayName(category.name)
  const categoryId = `cat-${categoryIndex}-${slugify(categoryName)}`

  category.items.forEach((item, itemIndex) => {
    const displayName = cleanDisplayName(item.name)
    const id = `item-${categoryIndex}-${itemIndex}-${slugify(displayName)}`
    const price = Number(item.price || 0)

    menuItemsById.set(id, {
      id,
      rappiProductId: item.id,
      categoryId,
      categoryName,
      sourceName: item.name,
      name: displayName,
      price,
      hasPrice: price > 0,
      image: item.image || '',
    })
  })
})

export function normalizeOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const error = new Error('Agrega al menos un producto.')
    error.statusCode = 400
    throw error
  }

  return rawItems.map((entry, index) => {
    const menuItem = menuItemsById.get(String(entry.id || ''))
    if (!menuItem) {
      const error = new Error('Uno de los productos ya no existe en el menu.')
      error.statusCode = 400
      throw error
    }

    const quantity = Math.max(1, Math.min(99, Number.parseInt(entry.quantity, 10) || 1))
    const note = String(entry.note || '').trim().slice(0, 240)
    const unitPriceCents = menuItem.hasPrice ? Math.round(menuItem.price * 100) : null

    return {
      ...menuItem,
      quantity,
      note,
      sortIndex: index,
      unitPriceCents,
      lineTotalCents: unitPriceCents == null ? null : unitPriceCents * quantity,
    }
  })
}
