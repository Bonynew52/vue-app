import catalog from './menuCatalog.generated.json'

export const menuSource = catalog

export const menuDisclaimer =
  'Menu de referencia. Confirma disponibilidad, opciones y precios con el mesero.'

export const menuDayparts = catalog.schedule.dayparts
export const menuSchedule = catalog.schedule
export const menuCatalogStats = catalog.stats

const defaultDaypartId = catalog.schedule.defaultDaypart || menuDayparts[0]?.id || 'lunch'

function minutesFromTime(value) {
  const [hours, minutes] = String(value || '00:00')
    .split(':')
    .map((part) => Number.parseInt(part, 10))
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)
}

export function resolveCurrentDaypartId(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  const match = menuDayparts.find((daypart) => {
    const start = minutesFromTime(daypart.startsAt)
    const end = minutesFromTime(daypart.endsAt)

    return minutes >= start && minutes < end
  })

  return match?.id || defaultDaypartId
}

export function getDaypartLabel(daypartId) {
  return menuDayparts.find((daypart) => daypart.id === daypartId)?.label || 'Menu'
}

// Modifier groups live at the catalog root; each item only stores their ids.
// Resolve them once so normalized items can expose the full groups + options.
const modifierGroupsById = Object.fromEntries(
  (catalog.modifierGroups || []).map((group) => [group.id, group]),
)

// Only groups that carry real, selectable options are worth surfacing as
// controls — empty groups (e.g. flagged swaps with no options) are dropped.
export function resolveModifierGroups(item) {
  return (item?.modifierGroupIds || [])
    .map((id) => modifierGroupsById[id])
    .filter((group) => group && Array.isArray(group.options) && group.options.length > 0)
}

export function itemHasModifiers(item) {
  return resolveModifierGroups(item).length > 0
}

function normalizeItem(item) {
  const modifierGroups = resolveModifierGroups(item)
  return {
    ...item,
    rappiProductId: item.imageMatch?.rappiProductId || null,
    realPrice: item.price,
    currency: catalog.currency || 'MXN',
    modifierGroups,
    hasToppings: modifierGroups.length > 0,
    requiresConfiguration: item.priceMode === 'configured' || item.hasRequiredModifiers,
    isAvailable: item.isAvailable !== false,
    image: item.image || '',
  }
}

function normalizeCategory(category) {
  return {
    ...category,
    items: category.items.map(normalizeItem),
  }
}

export const allMenuCategories = catalog.categories
  .map(normalizeCategory)
  .filter((category) => category.items.length)

export function categoriesForDaypart(daypartId) {
  return allMenuCategories
    .filter((category) => category.dayparts.includes(daypartId))
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.dayparts.includes(daypartId)),
    }))
    .filter((category) => category.items.length)
}

export const menuCategories = categoriesForDaypart(resolveCurrentDaypartId())

export const menuItemsById = Object.fromEntries(
  allMenuCategories.flatMap((category) => category.items.map((item) => [item.id, item])),
)

/* ---- Parrot routing metadata (used by the staff dashboard) ----
   Parrot is navigated Menu -> category -> item -> modifiers, so the staff
   board groups each order's lines along that path. Order items only persist a
   menuItemId + category name, so the menu label and catalog ordering are
   resolved here from the generated catalog. Legacy/unknown ids fall back to the
   id prefix (e.g. "desayunos:PFBO-000001") and the stored category name. */
const menuLabelByKey = {
  desayunos: 'Desayunos',
  comidas: 'Comidas',
  bebidas: 'Bebidas',
}
const menuKeyOrder = ['desayunos', 'comidas', 'bebidas']

export function menuLabelForKey(key) {
  if (!key) {
    return 'Otros'
  }
  return menuLabelByKey[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

export function menuKeyRank(key) {
  const index = menuKeyOrder.indexOf(key)
  return index === -1 ? menuKeyOrder.length : index
}

const categorySortById = Object.fromEntries(
  catalog.categories.map((category) => [category.id, category.sortIndex ?? 0]),
)

const orderItemMetaById = Object.fromEntries(
  allMenuCategories.flatMap((category) =>
    category.items.map((item) => [
      item.id,
      {
        menuKey: item.menuKey || null,
        menuLabel: menuLabelForKey(item.menuKey),
        categoryName: item.categoryName || category.name || '',
        categorySortIndex: categorySortById[item.categoryId] ?? category.sortIndex ?? 0,
        itemSortIndex: item.sortIndex ?? 0,
      },
    ]),
  ),
)

export function menuMetaForOrderItem(menuItemId, fallbackCategoryName = '') {
  const meta = orderItemMetaById[menuItemId]
  if (meta) {
    return meta
  }
  const prefix =
    typeof menuItemId === 'string' && menuItemId.includes(':') ? menuItemId.split(':')[0] : null
  return {
    menuKey: prefix,
    menuLabel: menuLabelForKey(prefix),
    categoryName: fallbackCategoryName || '',
    categorySortIndex: Number.MAX_SAFE_INTEGER,
    itemSortIndex: Number.MAX_SAFE_INTEGER,
  }
}

export const imageBackedItems = allMenuCategories
  .flatMap((category) => category.items)
  .filter((item) => item.image)

const preferredFeaturedNames = [
  'Cesar Salad',
  'Just a Waffle',
  'Chicken BLT',
  'American Breakfast Waffle',
  "Spicy Chick'n'Waffle",
  'Buffalo Chicken',
  'French Toast',
  'Serrano Caprese',
  'Chilaquiles con Huevo',
  'Acai Bowl',
]

export const featuredItems = preferredFeaturedNames
  .map((name) =>
    imageBackedItems.find((item) => item.name.toLowerCase().includes(name.toLowerCase())),
  )
  .filter(Boolean)

export const coverImage = featuredItems[0]?.image || imageBackedItems[0]?.image || ''

const preferredUpsells = ['Agua Natural', 'French Fries', 'Sweet Potato Fries', 'Choco']

export const upsellIds = preferredUpsells
  .map((name) =>
    allMenuCategories
      .flatMap((category) => category.items)
      .find(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() ||
          item.sourceName.toLowerCase().includes(name.toLowerCase()),
      ),
  )
  .filter(Boolean)
  .map((item) => item.id)
