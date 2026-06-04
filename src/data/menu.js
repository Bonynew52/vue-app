import bebidasMenu from './menu/json/bebidas.json'
import catalog from './menuCatalog.generated.json'
import comidasMenu from './menu/json/comidas.json'
import desayunosMenu from './menu/json/desayunos.json'
import coverFallback from '../assets/campaigns/jucy lucy.png'

const BREAKFAST_START_MINUTES = 6 * 60
const BREAKFAST_END_MINUTES = 12 * 60 + 30
const UNCATEGORIZED = 'Sin categoria'

const DISPLAY_SUFFIX_PATTERN =
  /\s*\((rappi|waffle|toast|kids|rc|n|pf|pan frances|pan frances|desayuno|comida)\)\s*/gi

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cleanDisplayName(value) {
  return String(value || '').replace(DISPLAY_SUFFIX_PATTERN, ' ').replace(/\s+/g, ' ').trim()
}

const catalogImageByMenuSku = new Map(
  (catalog.categories || [])
    .flatMap((category) => category.items || [])
    .filter((item) => item.menuKey && item.sku && item.image)
    .map((item) => [`${item.menuKey}:${item.sku}`, item.image]),
)

function imageForProduct(product, menuId) {
  return product.image || catalogImageByMenuSku.get(`${menuId}:${product.sku}`) || ''
}

function currentMenuPeriod(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()

  return minutes >= BREAKFAST_START_MINUTES && minutes <= BREAKFAST_END_MINUTES
    ? 'desayunos'
    : 'comidas'
}

function normalizeCategoryName(categoryName, menuId) {
  const cleanName = cleanDisplayName(categoryName || UNCATEGORIZED)

  if (cleanName === UNCATEGORIZED) {
    if (menuId === 'bebidas') {
      return 'Otras bebidas'
    }

    return menuId === 'desayunos' ? 'Otros desayunos' : 'Otros platillos'
  }

  return cleanName
}

function productToItem(product, menuId, categoryName, categoryIndex, itemIndex) {
  const displayName = cleanDisplayName(product.name)
  const price = Number(product.price || 0)
  const id = `item-${menuId}-${categoryIndex}-${itemIndex}-${slugify(product.sku || displayName)}`

  return {
    id,
    rappiProductId: product.sku || id,
    sku: product.sku || '',
    categoryId: `cat-${menuId}-${categoryIndex}-${slugify(categoryName)}`,
    categoryName,
    menuId,
    sourceName: product.name || displayName,
    name: displayName,
    description: product.description || '',
    price,
    realPrice: price,
    currency: 'MXN',
    hasPrice: price > 0,
    image: imageForProduct(product, menuId),
    isAvailable: true,
    isPopular: false,
    hasToppings: product.modifierGroups?.length > 0,
    modifierGroups: product.modifierGroups || [],
  }
}

function buildCategories(menu, categoryOffset = 0) {
  const groupedProducts = new Map()

  menu.products.forEach((product) => {
    const sourceCategories = product.categories?.length ? product.categories : [UNCATEGORIZED]

    sourceCategories.forEach((sourceCategory) => {
      const categoryName = normalizeCategoryName(sourceCategory, menu.id)
      if (!groupedProducts.has(categoryName)) {
        groupedProducts.set(categoryName, [])
      }

      groupedProducts.get(categoryName).push(product)
    })
  })

  const categoryEntries = Array.from(groupedProducts.entries())

  if (menu.id === 'desayunos') {
    const categoryOrder = ['Waffles y Pan Frances', 'Chilaquiles', 'Sandwiches', 'Toast', 'Bowl', 'Kids Menu', 'Sides']
    categoryEntries.sort(([nameA], [nameB]) => {
      const indexA = categoryOrder.indexOf(nameA)
      const indexB = categoryOrder.indexOf(nameB)

      if (indexA === -1 && indexB === -1) {
        return 0
      }

      if (indexA === -1) {
        return 1
      }

      if (indexB === -1) {
        return -1
      }

      return indexA - indexB
    })
  }

  return categoryEntries.map(([categoryName, products], categoryIndex) => {
    const finalCategoryIndex = categoryOffset + categoryIndex

    return {
      id: `cat-${menu.id}-${finalCategoryIndex}-${slugify(categoryName)}`,
      name: categoryName,
      sourceName: categoryName,
      menuId: menu.id,
      items: products.map((product, itemIndex) =>
        productToItem(product, menu.id, categoryName, finalCategoryIndex, itemIndex),
      ),
    }
  })
}

function buildActiveMenuCategories() {
  const mealMenu = currentMenuPeriod() === 'desayunos' ? desayunosMenu : comidasMenu
  const mealCategories = buildCategories(mealMenu, 0)
  const beverageCategories = buildCategories(bebidasMenu, mealCategories.length)

  return [...mealCategories, ...beverageCategories]
}

export const menuSource = {
  activeMeal: currentMenuPeriod(),
  menus: {
    bebidas: bebidasMenu,
    comidas: comidasMenu,
    desayunos: desayunosMenu,
  },
}

export const menuDisclaimer =
  'Menu de referencia. Confirma disponibilidad, opciones y precios con el mesero.'

export const menuCategories = buildActiveMenuCategories()

export const menuItemsById = Object.fromEntries(
  menuCategories.flatMap((category) => category.items.map((item) => [item.id, item])),
)

const menuLabels = {
  desayunos: 'Desayunos',
  comidas: 'Comidas',
  bebidas: 'Bebidas',
  postres: 'Postres',
  otros: 'Otros',
}

const menuRanks = {
  desayunos: 10,
  comidas: 20,
  bebidas: 30,
  postres: 40,
  otros: 99,
}

export function menuKeyRank(menuKey) {
  return menuRanks[menuKey] ?? menuRanks.otros
}

function menuKeyFromCategoryName(categoryName) {
  const normalized = slugify(categoryName)

  if (/(cofy|chiller|bebida|te|frappe|latte)/.test(normalized)) {
    return 'bebidas'
  }

  if (/(postre|cookie|tiramisu|crumble)/.test(normalized)) {
    return 'postres'
  }

  return menuSource.activeMeal || 'comidas'
}

export function menuMetaForOrderItem(menuItemId, fallbackCategoryName = '') {
  const item = menuItemsById[menuItemId]
  const categoryName = item?.categoryName || fallbackCategoryName || 'Sin categoria'
  const menuKey = item?.categoryId ? item.menuId : menuKeyFromCategoryName(categoryName)
  const category = menuCategories.find((entry) => entry.name === categoryName && entry.menuId === menuKey)

  return {
    menuKey,
    menuLabel: menuLabels[menuKey] || menuLabels.otros,
    categoryName,
    categorySortIndex: category ? menuCategories.indexOf(category) : 999,
  }
}

export const imageBackedItems = menuCategories
  .flatMap((category) => category.items)
  .filter((item) => item.image)

export const featuredItems = []

export const coverImage = imageBackedItems[0]?.image || coverFallback

export const upsellIds = []
