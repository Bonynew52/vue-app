import fs from 'node:fs/promises'
import path from 'node:path'
import ExcelJS from 'exceljs'

const ROOT = process.cwd()
const SOURCE_DIR = path.join(ROOT, 'data', 'source-menus')
const RAPPI_SEED_PATH = path.join(ROOT, 'src', 'data', 'menuSeed.rappi.json')
const RAPPI_SNAPSHOT_PATH = path.join(
  SOURCE_DIR,
  'rappi-belly-monster-madero-2026-06-04.json',
)
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'menuCatalog.generated.json')
const CONVEX_SEED_PATH = path.join(ROOT, 'convex', 'seed', 'menuCatalog.generated.json')

const SOURCE_MENUS = [
  {
    key: 'bebidas',
    file: 'bebidas-2026-06-03.xlsx',
    label: 'Bebidas',
    dayparts: ['breakfast', 'lunch'],
    categoryOffset: 0,
  },
  {
    key: 'desayunos',
    file: 'desayunos-2026-06-03.xlsx',
    label: 'Desayunos',
    dayparts: ['breakfast'],
    categoryOffset: 1000,
  },
  {
    key: 'comidas',
    file: 'comidas-2026-06-03.xlsx',
    label: 'Comida',
    dayparts: ['lunch'],
    categoryOffset: 2000,
  },
  {
    key: 'postres',
    file: 'reposteria-2026-06-12.xlsx',
    label: 'Postres',
    dayparts: ['breakfast', 'lunch'],
    categoryOffset: 3000,
  },
]

const DAYPARTS = [
  {
    id: 'breakfast',
    label: 'Desayuno',
    startsAt: '08:00',
    endsAt: '12:30',
    menuKeys: ['bebidas', 'desayunos', 'postres'],
  },
  {
    id: 'lunch',
    label: 'Comida',
    startsAt: '12:30',
    endsAt: '22:00',
    menuKeys: ['bebidas', 'comidas', 'postres'],
  },
]

const BUSINESS_HOURS = [
  { day: 'monday', label: 'Lunes', closed: true, opensAt: null, closesAt: null },
  { day: 'tuesday', label: 'Martes', closed: false, opensAt: '08:00', closesAt: '22:00' },
  { day: 'wednesday', label: 'Miércoles', closed: false, opensAt: '08:00', closesAt: '22:00' },
  { day: 'thursday', label: 'Jueves', closed: false, opensAt: '08:00', closesAt: '22:00' },
  { day: 'friday', label: 'Viernes', closed: false, opensAt: '08:00', closesAt: '22:00' },
  { day: 'saturday', label: 'Sábado', closed: false, opensAt: '08:00', closesAt: '22:00' },
  { day: 'sunday', label: 'Domingo', closed: false, opensAt: '08:00', closesAt: '21:00' },
]

const CATEGORY_ALIASES = new Map([
  ['Waffles y Pan Frances', 'Waffles y Pan Frances'],
  ['Bowl (Desayuno)', 'Bowls'],
  ['Toast (Desayuno)', 'Toast'],
  ['Sandwiches (Desayuno)', 'Sandwiches'],
  ['Kids Menu (Desayuno)', 'Kids Menu'],
  ['Sides (Desayuno)', 'Sides'],
  ['Toast (Comida)', 'Toast'],
  ['Sandwiches (Comida)', 'Sandwiches'],
  ['Burgers (Comida)', 'Burgers'],
  ['Ensaladas (Comida)', 'Ensaladas'],
  ['Sides (Comida)', 'Sides'],
  ['Kids Menu (Comida)', 'Kids Menu'],
  ['Sopas (Comida)', 'Sopas'],
])

const DISPLAY_SUFFIX_PATTERN =
  /\s*\((rappi|waffle|toast|kids|rc|n|pf|pan frances|pan francés|sandwich|burger|ensalada|bowl|sides|comida|desayuno)\)\s*/gi

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function slugify(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cleanDisplayName(value) {
  return String(value || '').replace(DISPLAY_SUFFIX_PATTERN, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeName(value) {
  const replacements = new Map([
    ['capuccino', 'capuchino'],
    ['waffles', 'waffle'],
    ['burgers', 'burger'],
    ['sandwiches', 'sandwich'],
    ['ensaladas', 'ensalada'],
  ])

  return stripAccents(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' y ')
    .replace(/'/g, '')
    .replace(/\b\(rappi\)\b/g, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => replacements.get(token) || token)
    .join(' ')
}

function relaxedName(value) {
  const drop = new Set([
    'waffle',
    'sandwich',
    'toast',
    'burger',
    'ensalada',
    'bowl',
    'pan',
    'frances',
    'desayuno',
    'comida',
    'abril',
    'julio',
    'pf',
    'kids',
    'sides',
    'rc',
    'n',
  ])

  return normalizeName(value)
    .split(' ')
    .filter((token) => !drop.has(token))
    .join(' ')
}

function withAliasesForExcel(name) {
  const keys = new Set([normalizeName(name), relaxedName(name)].filter(Boolean))
  const normalized = normalizeName(name)

  for (const style of ['caliente', 'helado', 'frappe']) {
    if (normalized.endsWith(` ${style}`)) {
      keys.add(normalized.slice(0, -style.length - 1))
    }
  }

  if (normalized.includes('mintha menta')) {
    keys.add(normalized.replace('mintha menta', 'mintha'))
  }
  if (normalized.includes('mango roiboos')) {
    keys.add(normalized.replace('mango roiboos', 'mango'))
  }
  if (normalized.includes('sencha te verde')) {
    keys.add(normalized.replace('sencha te verde', 'sencha'))
  }
  if (normalized.includes('capuchino capuchino')) {
    keys.add(normalized.replace('capuchino capuchino', 'capuchino'))
  }

  return keys
}

function withAliasesForRappi(name, category) {
  const candidates = new Set([name])
  const normalized = normalizeName(name)
  const categoryKey = normalizeName(category)

  if (categoryKey.includes('caliente') && !normalized.split(' ').includes('caliente')) {
    candidates.add(`${name} Caliente`)
  }
  if (categoryKey.includes('helado') && !normalized.split(' ').includes('helado')) {
    candidates.add(`${name} Helado`)
  }
  if (categoryKey.includes('frappe')) {
    const base = name.replace(/^frappe\s+(de\s+)?/i, '')
    candidates.add(`${base} Frappe`)
    candidates.add(base)
  }

  for (const [prefix, style] of [
    ['helado de ', 'Helado'],
    ['helado ', 'Helado'],
    ['frappe de ', 'Frappe'],
    ['frappe ', 'Frappe'],
  ]) {
    if (normalized.startsWith(normalizeName(prefix))) {
      const base = name.replace(new RegExp(`^${prefix}`, 'i'), '')
      candidates.add(`${base} ${style}`)
      candidates.add(base)
    }
  }

  if (normalized.startsWith('limonada')) {
    const rest = name.replace(/^limonada\s*/i, '').trim()
    const aliases = new Map([
      ['', 'Lemonade'],
      ['arnie', 'Arnie Limonada Te Negro'],
      ['rosa', 'Rosa Limonada Fresa'],
      ['mango', 'Mango Lemonade'],
      ['matcha', 'Matcha Lemonade'],
      ['blackberry basil', 'Blackberry Basil Lemonade'],
      ['peach tea lemonade', 'Peach Tea Lemonade Durazno'],
    ])
    if (rest) {
      candidates.add(rest)
    }
    candidates.add(aliases.get(normalizeName(rest)) || `${rest} Lemonade`)
  }

  if (normalized.startsWith('te helado') || normalized.startsWith('te caliente')) {
    const style = normalized.startsWith('te caliente') ? 'caliente' : 'helado'
    const rest = name.replace(/^t[ée]\s+(helado|caliente)\s*/i, '').trim()
    const teaAliases = new Map([
      ['mintha', 'Mintha Menta'],
      ['mango', 'Mango Roiboos'],
    ])
    const expanded = teaAliases.get(normalizeName(rest)) || rest
    candidates.add(`${rest} ${style}`)
    candidates.add(`${rest} Te Negro ${style}`)
    candidates.add(`${expanded} ${style}`)
    candidates.add(`${expanded} Te Negro ${style}`)
    candidates.add(rest)
  }

  const directAliases = new Map([
    [normalizeName('Leche Milky'), 'Milky Leche'],
    [normalizeName('Sweet Potato Fries'), 'Camote Fries'],
    [normalizeName('Sweet Potato Fries sides'), 'Camote Fries'],
    [normalizeName('Sandwich Buffalo Chicken'), 'Buffalo Chicken Sandwich'],
    [normalizeName('Sandwich Phily Cheese Brisket'), 'Phily Cheese Brisket Sandwich'],
    [normalizeName('Sandwich Chicken Jalapeño'), 'Chicken Jalapeño Sandwich'],
    [normalizeName('Helado de Capuchino'), 'Capuchino Capuchino Helado'],
  ])

  if (directAliases.has(normalized)) {
    candidates.add(directAliases.get(normalized))
  }

  const keys = new Set()
  for (const candidate of candidates) {
    keys.add(normalizeName(candidate))
    keys.add(relaxedName(candidate))
  }
  return new Set([...keys].filter(Boolean))
}

function plainCellValue(value) {
  if (value == null) {
    return null
  }
  if (typeof value === 'object') {
    if ('result' in value) {
      return plainCellValue(value.result)
    }
    if ('text' in value) {
      return value.text
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('')
    }
  }
  return value
}

async function readSheet(filePath, sheetName) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.getWorksheet(sheetName)
  if (!worksheet) {
    throw new Error(`Missing sheet "${sheetName}" in ${filePath}`)
  }

  const seenHeaders = new Map()
  const headers = []
  const headerRow = worksheet.getRow(1)
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const rawHeader = String(plainCellValue(headerRow.getCell(column).value) || '').trim()
    if (!rawHeader) {
      headers.push(null)
      continue
    }
    const seenCount = seenHeaders.get(rawHeader) || 0
    seenHeaders.set(rawHeader, seenCount + 1)
    headers.push(seenCount === 0 ? rawHeader : `${rawHeader}_${seenCount}`)
  }

  const rows = []
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const record = {}
    let hasValue = false

    for (let column = 1; column <= headers.length; column += 1) {
      const header = headers[column - 1]
      if (!header) {
        continue
      }
      const value = plainCellValue(row.getCell(column).value)
      record[header] = value == null || value === '' ? null : value
      hasValue ||= record[header] != null
    }

    if (hasValue) {
      rows.push(record)
    }
  }

  return rows
}

function numberOrNull(value) {
  if (value == null || value === '') {
    return null
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function parseModifierGroups(menuKey, rows) {
  const groups = []
  let current = null
  let blockIndex = -1

  for (const row of rows) {
    if (row.Nombre) {
      blockIndex += 1
      const name = String(row.Nombre).trim()
      current = {
        id: `${menuKey}:modifier:${blockIndex}:${slugify(name)}`,
        menuKey,
        name,
        selectionType: row['Tipo de selección'] || 'SIN_DEFINIR',
        valueRequirement: row['Tipo de valor requerido'] || 'USAR_RANGO_ENTRE_MIN_MAX',
        min: numberOrNull(row.Minimo) ?? 0,
        max: numberOrNull(row.Maximo) ?? 0,
        options: [],
      }
      groups.push(current)
    }

    if (!current || !row.Opciones) {
      continue
    }

    current.options.push({
      id: `${current.id}:option:${current.options.length}:${slugify(row.Opciones)}`,
      name: String(row.Opciones).trim(),
      priceDelta: numberOrNull(row['Precio adicional']) ?? 0,
      repetitions: numberOrNull(row['Repeticiones por opción']) ?? 1,
    })
  }

  const groupsByName = new Map()
  for (const group of groups) {
    if (!groupsByName.has(group.name)) {
      groupsByName.set(group.name, [])
    }
    groupsByName.get(group.name).push(group)
  }

  return { groups, groupsByName }
}

function productModifierNames(row) {
  return Object.entries(row)
    .filter(([key, value]) => key.startsWith('Grupo modificador') && value)
    .map(([, value]) => String(value).trim())
}

function firstOptionPrice(group) {
  return Number(group?.options?.[0]?.priceDelta ?? Number.NaN)
}

function findGroupByFirstPrice(groups, price) {
  return groups.find((group) => firstOptionPrice(group) === price) || groups[0]
}

function resolveModifierGroup(row, modifierName, groups) {
  if (groups.length <= 1) {
    return groups[0] ? [groups[0].id] : []
  }

  const menuKey = String(row.__menuKey || '')
  const sku = String(row.SKU || '')
  const productName = normalizeName(row.Nombre)
  const categoryName = normalizeName(row.Categorías)
  const groupName = normalizeName(modifierName)
  const isSpecialtyCofy = menuKey === 'bebidas' && (sku.startsWith('BSC-') || categoryName.includes('specialty'))
  const isAmericano = productName.includes('daily cofy') || productName.includes('americano')

  if (menuKey === 'bebidas' && groupName === normalizeName('Caliente (Tamaño)')) {
    if (isAmericano) {
      return [findGroupByFirstPrice(groups, 46).id]
    }
    if (isSpecialtyCofy) {
      return [findGroupByFirstPrice(groups, 80).id]
    }
    return [findGroupByFirstPrice(groups, 68).id]
  }

  if (menuKey === 'bebidas' && groupName === normalizeName('Helado (Tamaño)')) {
    if (isAmericano) {
      return [findGroupByFirstPrice(groups, 46).id]
    }
    if (isSpecialtyCofy) {
      return [findGroupByFirstPrice(groups, 80).id]
    }
    return [findGroupByFirstPrice(groups, 68).id]
  }

  if (menuKey === 'bebidas' && groupName === normalizeName('Frappe (Tamaño)')) {
    return [findGroupByFirstPrice(groups, isSpecialtyCofy ? 83 : 71).id]
  }

  return [groups[0].id]
}

function categoryLabel(sourceName) {
  return CATEGORY_ALIASES.get(sourceName) || sourceName
}

function fulfillmentTypeFor(menuKey, categoryName, name) {
  const key = normalizeName(`${menuKey} ${categoryName} ${name}`)
  const counterTokens = [
    'bebidas',
    'cofy',
    'chiller',
    'frappe',
    'te helado',
    'te caliente',
    'latte',
    'americano',
    'capuchino',
    'espresso',
    'limonada',
    'agua',
    'refresco',
    'jugo',
    'rol de',
    'reposteria',
  ]

  return counterTokens.some((token) => key.includes(token)) ? 'counter' : 'table'
}

function categoryPreferenceScore(rappiCategory, excelMenuKey, excelCategory) {
  const r = normalizeName(rappiCategory)
  const e = normalizeName(excelCategory)
  let score = 0

  if (excelMenuKey === 'bebidas' && ['cofy', 'chillers', 'bebidas', 'te'].some((token) => r.includes(token))) {
    score += 3
  }
  if (excelMenuKey === 'comidas' && r.includes('rappi')) {
    score += 2
  }
  for (const token of ['caliente', 'helado', 'frappe', 'chillers', 'te', 'toast', 'sandwich', 'ensalada', 'sides', 'kids', 'waffle']) {
    if (r.includes(token) && e.includes(token)) {
      score += 1
    }
  }

  return score
}

function normalizeRappiImageUrl(value) {
  const image = String(value || '').trim()
  if (!image) {
    return ''
  }
  if (/^https?:\/\//i.test(image)) {
    return image
  }

  return `https://images.rappi.com.mx/products/${image}?d=300x300&e=webp&q=75`
}

function buildRappiImageIndex(rappiSeed) {
  const products = []

  for (const category of rappiSeed.categories || []) {
    for (const item of category.items || []) {
      const imageUrl = normalizeRappiImageUrl(item.image || item.imageRaw)
      if (!imageUrl) {
        continue
      }

      const product = {
        id: item.id,
        name: item.name,
        categoryName: category.name,
        description: item.description || '',
        imageUrl,
        keys: withAliasesForRappi(item.name, category.name),
      }
      products.push(product)
    }
  }

  const byKey = new Map()
  for (const product of products) {
    for (const key of product.keys) {
      if (!byKey.has(key)) {
        byKey.set(key, [])
      }
      byKey.get(key).push(product)
    }
  }

  return { products, byKey }
}

function matchRappiImage(item, rappiIndex) {
  const candidates = []
  for (const key of item.matchKeys) {
    for (const product of rappiIndex.byKey.get(key) || []) {
      candidates.push({ product, method: 'rule-exact' })
    }
  }

  if (candidates.length === 0) {
    for (const product of rappiIndex.products) {
      let best = 0
      for (const left of item.matchKeys) {
        for (const right of product.keys) {
          const score = similarity(left, right)
          if (score > best) {
            best = score
          }
        }
      }

      if (best >= 0.9) {
        candidates.push({ product, method: `fuzzy:${best.toFixed(2)}` })
      }
    }
  }

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((a, b) => {
    const categoryDelta =
      categoryPreferenceScore(b.product.categoryName, item.menuKey, item.sourceCategoryName) -
      categoryPreferenceScore(a.product.categoryName, item.menuKey, item.sourceCategoryName)
    if (categoryDelta !== 0) {
      return categoryDelta
    }

    return (
      Math.max(...[...b.product.keys].map((key) => Math.max(...[...item.matchKeys].map((left) => similarity(left, key))))) -
      Math.max(...[...a.product.keys].map((key) => Math.max(...[...item.matchKeys].map((left) => similarity(left, key)))))
    )
  })

  const match = candidates[0]
  return {
    url: match.product.imageUrl,
    source: 'rappi',
    method: match.method,
    rappiProductId: match.product.id,
    rappiName: match.product.name,
    rappiCategoryName: match.product.categoryName,
  }
}

function similarity(left, right) {
  if (left === right) {
    return 1
  }

  const a = left || ''
  const b = right || ''
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
    }
  }

  const maxLength = Math.max(a.length, b.length, 1)
  return 1 - matrix[a.length][b.length] / maxLength
}

async function buildCatalogItems(sourceMenu, modifierGroupsByName) {
  const filePath = path.join(SOURCE_DIR, sourceMenu.file)
  const productRows = await readSheet(filePath, 'Productos')
  const pricesByName = new Map(
    (await readSheet(filePath, 'Precios por menú')).map((row) => [
      String(row.Artículos || '').trim(),
      numberOrNull(row['Precio en menu']),
    ]),
  )

  const categoryOrder = new Map()
  const categories = []
  const items = []

  for (const row of productRows) {
    if (!row.Nombre || !row.Categorías) {
      continue
    }

    const sourceName = String(row.Nombre).trim()
    const sourceCategoryName = String(row.Categorías).trim()
    const displayCategoryName = categoryLabel(sourceCategoryName)
    const categorySlug = `${sourceMenu.key}:${slugify(displayCategoryName)}`
    const modifierNames = productModifierNames(row)
    const rowWithMenu = { ...row, __menuKey: sourceMenu.key }
    const modifierGroupIds = modifierNames.flatMap((name) =>
      resolveModifierGroup(rowWithMenu, name, modifierGroupsByName.get(name) || []),
    )
    const allModifierGroups = [...modifierGroupsByName.values()].flat()
    const rawPrice = numberOrNull(row.Precio) ?? pricesByName.get(sourceName) ?? 0
    const sku = row.SKU ? String(row.SKU).trim() : ''

    if (!categoryOrder.has(categorySlug)) {
      categoryOrder.set(categorySlug, categories.length)
      categories.push({
        id: categorySlug,
        menuKey: sourceMenu.key,
        name: displayCategoryName,
        sourceName: sourceCategoryName,
        dayparts: sourceMenu.dayparts,
        sortIndex: sourceMenu.categoryOffset + categories.length,
      })
    }

    const categoryIndex = categoryOrder.get(categorySlug)
    const itemIndex = items.filter((item) => item.categoryId === categorySlug).length
    const displayName = cleanDisplayName(sourceName)
    const item = {
      id: `${sourceMenu.key}:${sku || slugify(sourceName)}`,
      menuKey: sourceMenu.key,
      sourceMenuName: sourceMenu.label,
      categoryId: categorySlug,
      categoryName: displayCategoryName,
      sourceCategoryName,
      dayparts: sourceMenu.dayparts,
      name: displayName,
      sourceName,
      description: row['Descripción (opcional)'] ? String(row['Descripción (opcional)']).trim() : '',
      sku,
      price: rawPrice,
      priceCents: Math.round(rawPrice * 100),
      hasPrice: rawPrice > 0,
      priceMode: rawPrice > 0 ? 'fixed' : modifierGroupIds.length > 0 ? 'configured' : 'store',
      typeOfSale: row['Tipo de venta'] || 'Precio Fijo',
      modifierGroupNames: modifierNames,
      modifierGroupIds,
      hasRequiredModifiers: modifierGroupIds.some((id) =>
        allModifierGroups.some((group) => group.id === id && group.min > 0),
      ),
      fulfillmentType: fulfillmentTypeFor(sourceMenu.key, sourceCategoryName, sourceName),
      image: '',
      imageSource: null,
      imageMatch: null,
      isAvailable: true,
      isPopular: false,
      sortIndex: sourceMenu.categoryOffset * 100 + categoryIndex * 100 + itemIndex,
      matchKeys: withAliasesForExcel(sourceName),
    }

    items.push(item)
  }

  return { categories, items }
}

function isCatchAllBeverageCategory(category) {
  return normalizeName(category.sourceName || category.name).startsWith('otras bebidas')
}

// Order the rail so the current daypart's food categories lead and shared
// beverage categories follow. Food menus (desayunos/comidas) are daypart-specific,
// so a single global order of [food..., bebidas...] yields desayunos-first for
// breakfast and comidas-first for lunch. The 'Otras Bebidas...' catch-all is
// pushed to the end of the beverage group instead of leading it. Relative order
// is otherwise preserved.
function orderCategoriesForRail(hydratedCategories) {
  const food = hydratedCategories.filter((category) => category.menuKey !== 'bebidas')
  const beverages = hydratedCategories.filter((category) => category.menuKey === 'bebidas')
  const beverageMains = beverages.filter((category) => !isCatchAllBeverageCategory(category))
  const beverageCatchAll = beverages.filter(isCatchAllBeverageCategory)

  return [...food, ...beverageMains, ...beverageCatchAll]
}

async function main() {
  const rappiSeed = JSON.parse(
    await fs.readFile(
      await fs
        .access(RAPPI_SNAPSHOT_PATH)
        .then(() => RAPPI_SNAPSHOT_PATH)
        .catch(() => RAPPI_SEED_PATH),
      'utf8',
    ),
  )
  const rappiIndex = buildRappiImageIndex(rappiSeed)
  const modifierGroups = []
  const categories = []
  const items = []

  for (const sourceMenu of SOURCE_MENUS) {
    const filePath = path.join(SOURCE_DIR, sourceMenu.file)
    const { groups, groupsByName } = parseModifierGroups(
      sourceMenu.key,
      await readSheet(filePath, 'Modificadores'),
    )
    const parsed = await buildCatalogItems(sourceMenu, groupsByName)
    modifierGroups.push(...groups)
    categories.push(...parsed.categories)
    items.push(...parsed.items)
  }

  for (const item of items) {
    const match = matchRappiImage(item, rappiIndex)
    if (match) {
      item.image = match.url
      item.imageSource = match.source
      item.imageMatch = {
        method: match.method,
        rappiProductId: match.rappiProductId,
        rappiName: match.rappiName,
        rappiCategoryName: match.rappiCategoryName,
      }
    }
    delete item.matchKeys
  }

  const itemsByCategory = new Map()
  for (const item of items) {
    if (!itemsByCategory.has(item.categoryId)) {
      itemsByCategory.set(item.categoryId, [])
    }
    itemsByCategory.get(item.categoryId).push(item)
  }

  const hydratedCategories = orderCategoriesForRail(
    categories.map((category) => ({
      ...category,
      items: (itemsByCategory.get(category.id) || []).sort((a, b) => a.sortIndex - b.sortIndex),
    })),
  )

  const stats = {
    itemCount: items.length,
    categoryCount: hydratedCategories.length,
    modifierGroupCount: modifierGroups.length,
    imageMatchedCount: items.filter((item) => item.image).length,
    imageMissingCount: items.filter((item) => !item.image).length,
    imageMissingByMenu: Object.fromEntries(
      SOURCE_MENUS.map((menu) => [
        menu.key,
        items.filter((item) => item.menuKey === menu.key && !item.image).length,
      ]),
    ),
  }

  const catalog = {
    version: '2026-06-03-parrot-excel-rappi-images-v1',
    generatedAt: new Date().toISOString(),
    restaurantName: 'Belly Monster Bites',
    currency: 'MXN',
    sourceFiles: SOURCE_MENUS.map((menu) => ({
      menuKey: menu.key,
      file: `data/source-menus/${menu.file}`,
      dayparts: menu.dayparts,
    })),
    imageSource: {
      kind: 'rappi',
      source: rappiSeed.source,
      extractedAt: rappiSeed.extractedAt,
      note: 'Rappi is used only for product image enrichment; Excel/Parrot remains canonical for menu data.',
    },
    schedule: {
      defaultDaypart: 'lunch',
      switchAt: '12:30',
      businessHours: BUSINESS_HOURS,
      transcriptNotes: [
        'Menu rotation is at 12:30 based on the direct day/night menu question.',
        'Employee shift change is separate and happens at 15:30.',
        'Public physical-hours listings checked on 2026-06-04 show 08:00 opening, 22:00 close Tuesday-Saturday, 21:00 close Sunday, and Monday closed; Rappi delivery hours differ.',
      ],
      dayparts: DAYPARTS,
    },
    categories: hydratedCategories,
    modifierGroups,
    stats,
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.mkdir(path.dirname(CONVEX_SEED_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`)
  await fs.writeFile(CONVEX_SEED_PATH, `${JSON.stringify(catalog, null, 2)}\n`)

  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`)
  console.log(`Wrote ${path.relative(ROOT, CONVEX_SEED_PATH)}`)
  console.log(JSON.stringify(stats, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
