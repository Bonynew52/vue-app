import cinnamonRollRaspberry from '../assets/menu/cinnamon_roll_raspberry.png'
import cinnamonRollTresLeches from '../assets/menu/cinnamon_roll_tres_leches.png'
import seed from './menuSeed.rappi.json'

const ITEM_IMAGE_MATCHES = [
  {
    image: cinnamonRollRaspberry,
    patterns: ['raspberry', 'frambuesa'],
  },
  {
    image: cinnamonRollTresLeches,
    patterns: ['tres leches'],
  },
]

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

function imageForItem(name) {
  const normalizedName = name.toLowerCase()
  const match = ITEM_IMAGE_MATCHES.find(({ patterns }) =>
    patterns.some((pattern) => normalizedName.includes(pattern)),
  )

  return match?.image || ''
}

export const menuSource = seed

export const menuDisclaimer =
  'Menu de referencia. Confirma disponibilidad, opciones y precios con el mesero.'

export const menuCategories = seed.categories.map((category, categoryIndex) => {
  const categoryName = cleanDisplayName(category.name)

  return {
    id: `cat-${categoryIndex}-${slugify(categoryName)}`,
    name: categoryName,
    sourceName: category.name,
    items: category.items.map((item, itemIndex) => {
      const displayName = cleanDisplayName(item.name)
      const id = `item-${categoryIndex}-${itemIndex}-${slugify(displayName)}`
      const price = Number(item.price || 0)

      return {
        id,
        categoryId: `cat-${categoryIndex}-${slugify(categoryName)}`,
        categoryName,
        sourceName: item.name,
        name: displayName,
        description: item.description || '',
        price,
        currency: item.currency || 'MXN',
        hasPrice: price > 0,
        image: imageForItem(displayName),
      }
    }),
  }
})

export const menuItemsById = Object.fromEntries(
  menuCategories.flatMap((category) => category.items.map((item) => [item.id, item])),
)

const preferredUpsells = ['Agua Natural', 'Rol De Canela', 'French Fries', 'Cortado']

export const upsellIds = preferredUpsells
  .map((name) =>
    menuCategories
      .flatMap((category) => category.items)
      .find((item) => item.name.toLowerCase() === name.toLowerCase()),
  )
  .filter(Boolean)
  .map((item) => item.id)
