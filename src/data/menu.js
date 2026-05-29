import seed from './menuSeed.rappi.json'

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
        rappiProductId: item.id,
        categoryId: `cat-${categoryIndex}-${slugify(categoryName)}`,
        categoryName,
        sourceName: item.name,
        name: displayName,
        description: item.description || '',
        price,
        realPrice: Number(item.realPrice || price),
        currency: item.currency || 'MXN',
        hasPrice: price > 0,
        image: item.image || '',
        isAvailable: item.isAvailable !== false,
        isPopular: Boolean(item.isPopular),
        hasToppings: Boolean(item.hasToppings),
      }
    }),
  }
})

export const menuItemsById = Object.fromEntries(
  menuCategories.flatMap((category) => category.items.map((item) => [item.id, item])),
)

// Every item that has a real Rappi product photo, in menu order.
export const imageBackedItems = menuCategories
  .flatMap((category) => category.items)
  .filter((item) => item.image)

const preferredFeaturedNames = [
  'Cesar Salad',
  'Just A Waffle',
  'Chicken Blt',
  'American Breakfast Waffle',
  "Spicy Chick'n'waffle",
  'Sandwich Buffalo Chicken',
  'French Toast',
  'Serrano Caprese',
  'Rol De Chocolate',
  'Rol De Canela',
]

// Rappi does not currently mark popular items in the public data, so this rail
// uses visible, priced food items that match the reference screenshot shape.
export const featuredItems = preferredFeaturedNames
  .map((name) =>
    imageBackedItems.find((item) => item.name.toLowerCase().includes(name.toLowerCase())),
  )
  .filter(Boolean)

export const coverImage = seed.backgroundImage || featuredItems[0]?.image || imageBackedItems[0]?.image || ''

const preferredUpsells = ['Agua Natural', 'Rol De Canela', 'French Fries', 'Cortado']

export const upsellIds = preferredUpsells
  .map((name) =>
    menuCategories
      .flatMap((category) => category.items)
      .find((item) => item.name.toLowerCase() === name.toLowerCase()),
  )
  .filter(Boolean)
  .map((item) => item.id)
