import bebidasMenu from './menu/json/bebidas.json'
import catalog from './menuCatalog.generated.json'
import comidasMenu from './menu/json/comidas.json'
import desayunosMenu from './menu/json/desayunos.json'
import postresMenu from './menu/json/postres.json'

const BREAKFAST_START_MINUTES = 6 * 60
const BREAKFAST_END_MINUTES = 12 * 60 + 30
const UNCATEGORIZED = 'Sin categoria'

// The digital menu is the visual source of truth for the customer-facing
// sequence. Product JSON remains the source for SKU, modifiers, and pricing.
// Entries without a source product intentionally render with the existing
// branded placeholder until the product table is updated.
const PDF_MEAL_LAYOUTS = {
  desayunos: [
    {
      name: 'Waffles y Pan Frances',
      products: [
        ['Just a Waffle (Waffle)', 'Arma tu Waffle o Pan Frances'],
        ['Wafflete (Waffle)'],
        ['American Breakfast Waffle (Waffle)'],
        ["Spicy Chick'n'Waffle (Waffle)"],
        ["S'mores French Toast (PF)"],
      ],
    },
    {
      name: 'Toast',
      products: [
        ['Avocado Panela (Toast)'],
        ['Serrano Caprese (Toast)'],
        ['Avocado Scramble (Toast)'],
        ['Mollete con Huevo (Toast)'],
        ['Serrano Parmesano (Toast)'],
        ['Bacon Spinach (Toast)'],
      ],
    },
    {
      name: 'Egg Drop',
      products: [
        ['Simple Egg Drop (Sandwich)'],
        ['Ham N Cheese E.D. (Sandwich)'],
        ['Bacon Egg Drop (Sandwich)'],
        ['Machaca Egg Drop (Sandwich)'],
        ['Egg Drop Deluxe (Sandwich)'],
      ],
    },
    {
      name: 'Sandwich',
      products: [
        ['Pavo y Panela (Sandwich)'],
        ['The Sandwich (Sandwich)'],
        ['Grilled Cheese (Sandwich)'],
      ],
    },
    { name: 'Bowl', products: [['Acai Bowl (Bowl)']] },
    {
      name: 'Kids Menu',
      products: [['Egg Drop Kids (Kids)'], ['Sandwichito (Kids)']],
    },
    { name: 'Sides', products: [['Smash Hashbrown (Sides)'], ['Special Bacon (Sides)']] },
    {
      name: 'Chilaquiles',
      products: [
        ['Chilaquiles solos'],
        ['Chilaquiles con Pollo'],
        ['Chilaquiles con Huevo'],
        ['Chilaquiles con Brisket'],
      ],
    },
  ],
  comidas: [
    {
      name: 'Waffles y Pan Frances',
      products: [
        ['Just a Waffle (Waffle)', 'Arma tu Waffle o Pan Frances'],
        ['Wafflete (Waffle)'],
        ['American Breakfast Waffle (Waffle)'],
        ["Spicy Chick'n'Waffle (Waffle)"],
        ["S'mores French Toast (PF)"],
      ],
    },
    {
      name: 'Sandwich',
      products: [
        ['Phily Cheese Brisket (Sandwich)'],
        ['Buffalo Chicken (Sandwich)'],
        ['Chicken Jalapeño (Sandwich)'],
        ['BBQ Sandwich (Sandwich)'],
        ['Grilled Cheese (Sandwich)'],
        ['Chicken BLT (Sandwich)'],
        ['Tuna Melt (Sandwich)'],
      ],
    },
    {
      name: 'Burgers',
      products: [
        ['Belly Burger (Burger)'],
        ['Party Melt (Burger)'],
        ['Jalapeño Burger (Burger)'],
      ],
    },
    {
      name: 'Toast',
      products: [
        ['Avocado Panela (Toast)'],
        ['Serrano Caprese (Toast)'],
        ['Pizza Deluxe (Toast)'],
      ],
    },
    {
      name: 'Ensalada',
      products: [
        ['Cesar Salad (Ensalada)'],
        ['Goat Cheese Mango (Ensalada)'],
        ['Chicken Orange (Ensalada)'],
        ['Taco Salad (Ensalada)'],
        ["Buffalo Chick'n Salad (Ensalada)"],
      ],
    },
    {
      name: 'Sides',
      products: [
        ['French Fries (Sides)'],
        ['Camote Fries (Sides)'],
        ['Cream Corn (Sides)'],
        ["Mac'n Cheese (Sides)"],
      ],
    },
    {
      name: 'Sopas',
      products: [
        {
          name: 'Sopa del mes',
          description: 'Pregunta por nuestra sopa del mes.',
          sku: 'pdf-sopa-del-mes',
        },
      ],
    },
    {
      name: 'Kids Menu',
      products: [
        ['Chicken n Fries (Kids)'],
        ['Mac N Chicken (Kids)'],
        ['Pepperoni Toast (Kids)'],
        ['Kids Burger'],
      ],
    },
  ],
}

const CATEGORY_ORDERS = {
  bebidas: [
    'Cofy (Caliente)',
    'Cofy (Helado)',
    'Cofy (Frappe)',
    'Specialty Cofy (Caliente)',
    'Specialty Cofy (Helado)',
    'Specialty Cofy (Frappe)',
    'Cofy Chillers',
    'Chillers',
    'Frappe Chillers',
    'Té Caliente',
    'Té Helado',
    'Otras Bebidas...',
  ],
  postres: ['Kuky', 'Brauny', 'Chiskay', 'Roles de Canela', 'Gelly', 'Malteadas'],
}

const PDF_CATEGORY_PLACEHOLDERS = {
  bebidas: [
    {
      categoryName: 'Specialty Cofy (Caliente)',
      name: 'Vainilla Latte sin azucar',
      description: 'Latte de vainilla sin azucar. Descripcion pendiente de confirmar en la tabla de productos.',
      sku: 'pdf-vainilla-latte-sin-azucar',
    },
  ],
}

// Breakfast and lunch are shown together. This keeps a single catalog without
// repeated categories or products while retaining each product's availability.
const PDF_COMBINED_MEAL_LAYOUT = [
  {
    name: 'Waffles y Pan Frances',
    products: [
      ['Just a Waffle (Waffle)', 'Arma tu Waffle o Pan Frances'],
      ['French Toast (Pan Frances)'],
      ['Wafflete (Waffle)'],
      ['American Breakfast Waffle (Waffle)'],
      ["Spicy Chick'n'Waffle (Waffle)"],
      ["S'mores French Toast (PF)"],
    ],
  },
  {
    name: 'Sandwich',
    products: [
      ['Phily Cheese Brisket (Sandwich)'],
      ['Buffalo Chicken (Sandwich)'],
      ['Chicken Jalapeño (Sandwich)'],
      ['BBQ Sandwich (Sandwich)'],
      ['Grilled Cheese (Sandwich)'],
      ['Chicken BLT (Sandwich)'],
      ['Tuna Melt (Sandwich)'],
      ['Pavo y Panela (Sandwich)'],
      ['The Sandwich (Sandwich)'],
    ],
  },
  {
    name: 'Burgers',
    products: [
      ['Belly Burger (Burger)'],
      ['Party Melt (Burger)'],
      ['Jalapeño Burger (Burger)'],
    ],
  },
  {
    name: 'Toast',
    products: [
      ['Avocado Panela (Toast)'],
      ['Serrano Caprese (Toast)'],
      ['Pizza Deluxe (Toast)'],
      ['Avocado Scramble (Toast)'],
      ['Mollete con Huevo (Toast)'],
      ['Serrano Parmesano (Toast)'],
      ['Bacon Spinach (Toast)'],
    ],
  },
  {
    name: 'Ensalada',
    products: [
      ['Cesar Salad (Ensalada)'],
      ['Goat Cheese Mango (Ensalada)'],
      ['Chicken Orange (Ensalada)'],
      ['Taco Salad (Ensalada)'],
      ["Buffalo Chick'n Salad (Ensalada)"],
    ],
  },
  {
    name: 'Sides',
    products: [
      ['French Fries (Sides)'],
      ['Camote Fries (Sides)'],
      ['Cream Corn (Sides)'],
      ["Mac'n Cheese (Sides)"],
      ['Smash Hashbrown (Sides)'],
      ['Special Bacon (Sides)'],
    ],
  },
  {
    name: 'Sopas',
    products: [
      {
        name: 'Sopa del mes',
        description: 'Pregunta por nuestra sopa del mes.',
        sku: 'pdf-sopa-del-mes',
      },
    ],
  },
  {
    name: 'Kids Menu',
    products: [
      ['Chicken n Fries (Kids)'],
      ['Mac N Chicken (Kids)'],
      ['Pepperoni Toast (Kids)'],
      ['Kids Burger'],
      ['Egg Drop Kids (Kids)'],
      ['Sandwichito (Kids)'],
    ],
  },
  {
    name: 'Egg Drop',
    products: [
      ['Simple Egg Drop (Sandwich)'],
      ['Ham N Cheese E.D. (Sandwich)'],
      ['Bacon Egg Drop (Sandwich)'],
      ['Machaca Egg Drop (Sandwich)'],
      ['Egg Drop Deluxe (Sandwich)'],
    ],
  },
  { name: 'Bowl', products: [['Acai Bowl (Bowl)']] },
  {
    name: 'Chilaquiles',
    products: [
      ['Chilaquiles solos'],
      ['Chilaquiles con Pollo'],
      ['Chilaquiles con Huevo'],
      ['Chilaquiles con Brisket'],
    ],
  },
]

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

function productToItem(
  product,
  menuId,
  categoryName,
  categoryIndex,
  itemIndex,
  sourceMenuId = menuId,
  availability = [sourceMenuId],
) {
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
    image: imageForProduct(product, sourceMenuId),
    isAvailable: true,
    isPopular: false,
    hasToppings: product.modifierGroups?.length > 0,
    modifierGroups: product.modifierGroups || [],
    availability,
  }
}

function buildCombinedMealCategories(categoryOffset = 0) {
  const sourcesByName = new Map()
  const availabilityBySku = new Map()

  for (const menu of [desayunosMenu, comidasMenu]) {
    for (const product of menu.products) {
      if (!product.categories?.length) continue
      if (!sourcesByName.has(product.name)) sourcesByName.set(product.name, [])
      sourcesByName.get(product.name).push({ product, menuId: menu.id })
      if (!availabilityBySku.has(product.sku)) availabilityBySku.set(product.sku, new Set())
      availabilityBySku.get(product.sku).add(menu.id)
    }
  }

  const renderedSkus = new Set()
  return PDF_COMBINED_MEAL_LAYOUT.map((section, categoryIndex) => {
    const finalCategoryIndex = categoryOffset + categoryIndex
    const items = section.products.flatMap((entry) => {
      if (!Array.isArray(entry)) return [entry]
      const [sourceName, displayName] = entry
      const source = (sourcesByName.get(sourceName) || [])[0]
      if (!source || renderedSkus.has(source.product.sku)) return []
      renderedSkus.add(source.product.sku)
      return [{ ...source, displayName }]
    }).map((entry, itemIndex) => {
      if (entry.product) {
        const item = productToItem(
          entry.product,
          'comidas',
          section.name,
          finalCategoryIndex,
          itemIndex,
          entry.menuId,
          [...(availabilityBySku.get(entry.product.sku) || [])],
        )
        if (entry.displayName) item.name = entry.displayName
        return item
      }
      return placeholderToItem(entry, 'comidas', section.name, finalCategoryIndex, itemIndex)
    })

    return {
      id: `cat-comidas-${finalCategoryIndex}-${slugify(section.name)}`,
      name: section.name,
      sourceName: section.name,
      menuId: 'comidas',
      items,
    }
  })
}

function placeholderToItem(product, menuId, categoryName, categoryIndex, itemIndex) {
  const id = `item-${menuId}-${categoryIndex}-${itemIndex}-${slugify(product.sku || product.name)}`

  return {
    id,
    rappiProductId: product.sku || id,
    sku: product.sku || '',
    categoryId: `cat-${menuId}-${categoryIndex}-${slugify(categoryName)}`,
    categoryName,
    menuId,
    sourceName: product.name,
    name: product.name,
    description: product.description,
    price: 0,
    realPrice: 0,
    currency: 'MXN',
    hasPrice: false,
    image: '',
    isAvailable: true,
    isPopular: false,
    hasToppings: false,
    modifierGroups: [],
    isPlaceholder: true,
  }
}

function buildPdfMealCategories(menu, categoryOffset = 0) {
  const layout = PDF_MEAL_LAYOUTS[menu.id]
  if (!layout) return null

  const productsByName = new Map(menu.products.map((product) => [product.name, product]))

  return layout.map((section, categoryIndex) => {
    const finalCategoryIndex = categoryOffset + categoryIndex
    const items = section.products.map((entry, itemIndex) => {
      if (Array.isArray(entry)) {
        const [sourceName, displayName] = entry
        const product = productsByName.get(sourceName)
        if (!product) {
          return placeholderToItem(
            {
              name: displayName || sourceName,
              description: 'Descripcion pendiente de confirmar en la tabla de productos.',
              sku: `pdf-${slugify(sourceName)}`,
            },
            menu.id,
            section.name,
            finalCategoryIndex,
            itemIndex,
          )
        }
        const item = productToItem(product, menu.id, section.name, finalCategoryIndex, itemIndex)
        if (displayName) item.name = displayName
        return item
      }

      return placeholderToItem(entry, menu.id, section.name, finalCategoryIndex, itemIndex)
    })

    return {
      id: `cat-${menu.id}-${finalCategoryIndex}-${slugify(section.name)}`,
      name: section.name,
      sourceName: section.name,
      menuId: menu.id,
      items,
    }
  })
}

function buildCategories(menu, categoryOffset = 0) {
  const pdfCategories = buildPdfMealCategories(menu, categoryOffset)
  if (pdfCategories) return pdfCategories

  const groupedProducts = new Map()

  menu.products.forEach((product) => {
    const sourceCategories = product.categories?.length ? product.categories : []

    sourceCategories.forEach((sourceCategory) => {
      const categoryName = normalizeCategoryName(sourceCategory, menu.id)
      if (!groupedProducts.has(categoryName)) {
        groupedProducts.set(categoryName, [])
      }

      groupedProducts.get(categoryName).push(product)
    })
  })

  const categoryEntries = Array.from(groupedProducts.entries())
  for (const placeholder of PDF_CATEGORY_PLACEHOLDERS[menu.id] || []) {
    if (!groupedProducts.has(placeholder.categoryName)) {
      groupedProducts.set(placeholder.categoryName, [])
      categoryEntries.push([placeholder.categoryName, groupedProducts.get(placeholder.categoryName)])
    }
    groupedProducts.get(placeholder.categoryName).push({ ...placeholder, isPlaceholder: true })
  }

  const categoryOrder = CATEGORY_ORDERS[menu.id]
  if (categoryOrder) {
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
        product.isPlaceholder
          ? placeholderToItem(product, menu.id, categoryName, finalCategoryIndex, itemIndex)
          : productToItem(product, menu.id, categoryName, finalCategoryIndex, itemIndex),
      ),
    }
  })
}

function buildActiveMenuCategories() {
  const mealCategories = buildCombinedMealCategories(0)
  const beverageCategories = buildCategories(bebidasMenu, mealCategories.length)
  const dessertCategories = buildCategories(postresMenu, mealCategories.length + beverageCategories.length)

  return [...mealCategories, ...beverageCategories, ...dessertCategories]
}

export const menuSource = {
  activeMeal: currentMenuPeriod(),
  menus: {
    bebidas: bebidasMenu,
    comidas: comidasMenu,
    desayunos: desayunosMenu,
    postres: postresMenu,
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

export const coverImage = '/menu/banner-menu-digital.png'

export const upsellIds = []
