<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useConvexMutation, useConvexQuery } from 'convex-vue'
import { api } from '../../convex/_generated/api'
import { useCart } from '../composables/useCart'
import { coverImage, featuredItems, menuCategories, menuSource } from '../data/menu'
import { formatMenuPrice, formatMXN } from '../utils/formatPrice'
import mascot from '../assets/brand/mascot.svg'

const route = useRoute()

const props = defineProps({
  mode: { type: String, default: '' },
  prefillName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
})

// Fixed for the lifetime of the view: '/ordenar' mounts the table flow,
// '/recoger' mounts this component in pickup mode (via PickupView).
const mode = props.mode || route.meta.orderMode || 'table'
const isPickup = mode === 'pickup'

const tableId = computed(() => {
  const raw = route.query.mesa
  const value = Array.isArray(raw) ? raw[0] : raw
  return value != null ? String(value).trim() : ''
})
const hasTable = computed(() => tableId.value.length > 0)
const tableLabel = computed(() => (hasTable.value ? `Mesa ${tableId.value}` : 'Sin mesa'))
const contextLabel = computed(() => (isPickup ? 'Pick&Go' : tableLabel.value))
const hasConvex = Boolean(import.meta.env.VITE_CONVEX_URL)

function lastOrderStorageKey(value) {
  return `belly-monster-last-order:${value || 'sin-mesa'}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && window.localStorage
}

function readLastOrderId(value) {
  if (!canUseStorage()) {
    return null
  }
  return window.localStorage.getItem(lastOrderStorageKey(value)) || null
}

// Mode-namespaced cart keys: table ids come straight from the `?mesa=` query,
// so without the `mesa-` prefix a table literally named "pickup-mode" would
// share sessionStorage with the /recoger cart.
const cart = useCart(isPickup ? 'pickup-mode' : tableId.value ? `mesa-${tableId.value}` : '')
const createOrderMutation = hasConvex
  ? useConvexMutation(isPickup ? api.orders.createPickup : api.orders.create)
  : null

/* ---- Menu groups (Comidas|Desayunos / Bebidas / Postres) ---- */
const mealGroupId = menuSource.activeMeal
const activeMenuGroup = ref('meal')
const activeCategory = ref('')
const menuGroups = computed(() => {
  const mealLabel = menuSource.activeMeal === 'desayunos' ? 'Desayunos' : 'Comidas'

  return [
    {
      id: 'meal',
      name: mealLabel,
      categories: menuCategories.filter((category) => category.menuId === mealGroupId),
    },
    {
      id: 'bebidas',
      name: 'Bebidas',
      categories: menuCategories.filter((category) => category.menuId === 'bebidas'),
    },
    {
      id: 'postres',
      name: 'Postres',
      categories: [],
      isPlaceholder: true,
    },
  ]
})
const activeMenuGroupData = computed(
  () => menuGroups.value.find((group) => group.id === activeMenuGroup.value) || menuGroups.value[0],
)

function normalizeMenuText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function beverageSubgroupForCategory(category) {
  const name = normalizeMenuText(category.name)

  if (/(cofy|coffee|cafe|latte|frappe)/.test(name)) {
    return 'cofy'
  }

  if (/(refresher|refresh|chiller|limonada|soda|smoothie|te|tea)/.test(name)) {
    return 'refreshers'
  }

  return 'otros'
}

function mealSubgroupForCategory(category) {
  const name = normalizeMenuText(category.name)

  if (/(kids|side|sides)/.test(name)) {
    return 'extras'
  }

  if (/(toast|ensalada|salad)/.test(name)) {
    return 'ligeros'
  }

  return 'fuertes'
}

// Subgroups survive as ordering, not as a third chip rail: the original
// design had exactly one category row, so cofy → refreshers → otros (and
// fuertes → ligeros → extras) become the order of that single row.
const beverageSubgroupRank = { cofy: 0, refreshers: 1, otros: 2 }
const mealSubgroupRank = { fuertes: 0, ligeros: 1, extras: 2 }

const visibleCategories = computed(() => {
  const categories = [...(activeMenuGroupData.value?.categories || [])]

  if (activeMenuGroup.value === 'bebidas') {
    categories.sort(
      (a, b) =>
        beverageSubgroupRank[beverageSubgroupForCategory(a)] -
        beverageSubgroupRank[beverageSubgroupForCategory(b)],
    )
  } else if (activeMenuGroup.value === 'meal') {
    categories.sort(
      (a, b) =>
        mealSubgroupRank[mealSubgroupForCategory(a)] - mealSubgroupRank[mealSubgroupForCategory(b)],
    )
  }

  return categories
})
const groupItemCount = computed(() =>
  visibleCategories.value.reduce((total, category) => total + category.items.length, 0),
)

// Everything orderable right now (active meal menu + beverages), so search
// finds a latte even while the Comidas group is selected.
const allItems = computed(() => menuCategories.flatMap((category) => category.items))

/* Broken/missing remote images fall back to the mascot, never a fake remote placeholder. */
const failedImages = reactive({})
function onImageError(id) {
  failedImages[id] = true
}
function showImage(item) {
  return Boolean(item.image) && !failedImages[item.id]
}

const coverFailed = ref(false)

/* ---- Modifiers / sub-products ----
   In the new data model a product's `modifierGroups` is a list of group
   NAMES that reference the per-menu modifier catalog in menuSource.menus,
   so resolve them here into the {id, name, min, max, options[]} shape the
   sheet works with. Options use `additionalPrice` (pesos). */
const modifierCatalogs = (() => {
  const catalogs = {}
  Object.entries(menuSource.menus).forEach(([menuId, menu]) => {
    const byName = new Map()
    ;(menu.modifierGroups || []).forEach((group) => {
      if (group?.name && !byName.has(group.name)) {
        byName.set(group.name, group)
      }
    })
    catalogs[menuId] = byName
  })
  return catalogs
})()

const resolvedGroupsCache = new Map()
function itemGroups(item) {
  if (!item) {
    return []
  }
  if (resolvedGroupsCache.has(item.id)) {
    return resolvedGroupsCache.get(item.id)
  }
  const catalog = modifierCatalogs[item.menuId] || new Map()
  const refs = Array.isArray(item.modifierGroups) ? item.modifierGroups : []
  const groups = refs
    .map((ref) => (typeof ref === 'string' ? catalog.get(ref) : ref))
    .filter((group) => group && Array.isArray(group.options) && group.options.length > 0)
    .map((group, groupIndex) => {
      const groupId = `${item.id}::g${groupIndex}`
      const seen = new Set()
      const options = group.options
        .filter((option) => {
          // The exported catalog repeats some options verbatim; dedupe them.
          const key = `${option.name}::${Number(option.additionalPrice) || 0}`
          if (seen.has(key)) {
            return false
          }
          seen.add(key)
          return true
        })
        .map((option, optionIndex) => ({
          id: `${groupId}-o${optionIndex}`,
          name: option.name,
          priceDelta: Number(option.additionalPrice) || 0,
        }))
      return {
        id: groupId,
        name: group.name,
        min: Number(group.min) || 0,
        max: Number(group.max) || 0,
        options,
      }
    })
  resolvedGroupsCache.set(item.id, groups)
  return groups
}
function hasModifiers(item) {
  return itemGroups(item).length > 0
}

/* An item with no base price (e.g. a latte priced entirely by size) needs a
   priced option chosen even when the exported group min is 0, otherwise it
   would add at $0. Size pickers (group.min >= 1) are required by definition. */
function decorateGroup(group, item) {
  const baseMin = Number(group.min) || 0
  const pricedOptions = group.options.some((option) => Number(option.priceDelta) > 0)
  const zeroBase = !item.hasPrice
  const min = baseMin >= 1 ? baseMin : zeroBase && pricedOptions ? 1 : 0
  const max = Number(group.max) || group.options.length
  return {
    ...group,
    min,
    max,
    required: min >= 1,
    multiple: max > 1,
  }
}

/* Opens the configuration sheet for anything that needs a choice. */
function requiresChoice(item) {
  return itemGroups(item).some((group) => {
    if ((Number(group.min) || 0) >= 1) {
      return true
    }
    return !item.hasPrice && group.options.some((option) => Number(option.priceDelta) > 0)
  })
}

/* ---- Search ---- */
const query = ref('')
const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const isSearching = computed(() => normalizedQuery.value.length > 0)
const searchResults = computed(() => {
  if (!isSearching.value) {
    return []
  }
  const q = normalizedQuery.value
  return allItems.value.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)),
  )
})

/* ---- Category nav + scroll spy ---- */
const sectionEls = {}
const chipEls = {}
const setSectionRef = (id) => (el) => {
  if (el) {
    sectionEls[id] = el
  } else {
    delete sectionEls[id]
  }
}
const setChipRef = (id) => (el) => {
  if (el) {
    chipEls[id] = el
  } else {
    delete chipEls[id]
  }
}
const categoryRail = ref(null)

let observer = null
function setupObserver() {
  if (observer) {
    observer.disconnect()
  }
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) {
        activeCategory.value = visible[0].target.dataset.catId
      }
    },
    { rootMargin: '-150px 0px -62% 0px', threshold: 0 },
  )
  Object.values(sectionEls).forEach((el) => observer.observe(el))
}
onMounted(setupObserver)

/* When the group changes the sections swap out, so rewire the scroll spy. */
watch(activeMenuGroup, () => {
  nextTick(setupObserver)
})
watch(isSearching, (searching) => {
  if (!searching) {
    nextTick(setupObserver)
  }
})

watch(activeCategory, (id) => {
  const chip = chipEls[id]
  const rail = categoryRail.value
  // Only auto-center the active chip while the row actually scrolls
  // horizontally (desktop). On mobile the chips wrap in normal flow, where
  // scrollIntoView would hijack the page's vertical scroll.
  if (chip && rail && rail.scrollWidth > rail.clientWidth) {
    chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }
})

watch(
  visibleCategories,
  (categories) => {
    activeCategory.value = categories[0]?.id || ''
    query.value = ''
  },
  { immediate: true },
)

function selectMenuGroup(id) {
  activeMenuGroup.value = id
  nextTick(() => {
    const sticky = document.querySelector('.sticky')
    sticky?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function goToCategory(id) {
  activeCategory.value = id
  const el = sectionEls[id]
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/* Desktop-only affordances for the chip rows: drag-to-scroll and wheel
   scrolling. On ≤640px viewports the rows wrap instead of scrolling (see
   docs/mobile-safari-menu-crash.md), so these become no-ops there. */
const railDrag = {
  el: null,
  pointerId: null,
  startX: 0,
  startScrollLeft: 0,
  moved: false,
}

function startRailDrag(event) {
  if (event.button != null && event.button !== 0) {
    return
  }

  railDrag.el = event.currentTarget
  railDrag.pointerId = event.pointerId
  railDrag.startX = event.clientX
  railDrag.startScrollLeft = event.currentTarget.scrollLeft
  railDrag.moved = false
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveRailDrag(event) {
  if (!railDrag.el || railDrag.pointerId !== event.pointerId) {
    return
  }

  const deltaX = event.clientX - railDrag.startX
  if (Math.abs(deltaX) > 4) {
    railDrag.moved = true
    railDrag.el.scrollLeft = railDrag.startScrollLeft - deltaX
    event.preventDefault()
  }
}

function endRailDrag(event) {
  if (!railDrag.el || railDrag.pointerId !== event.pointerId) {
    return
  }

  railDrag.el.releasePointerCapture?.(event.pointerId)
  railDrag.el = null
  railDrag.pointerId = null
}

function scrollRailWithWheel(event) {
  const rail = event.currentTarget
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY

  if (!delta || rail.scrollWidth <= rail.clientWidth) {
    return
  }

  rail.scrollLeft += delta
  event.preventDefault()
}

/* ---- Sheets / scroll lock ---- */
const activeItem = ref(null)
const sheetQty = ref(1)
const sheetNote = ref('')
const showCart = ref(false)
const showConfirmation = ref(false)

const anySheetOpen = computed(
  () => Boolean(activeItem.value) || showCart.value || showConfirmation.value,
)
watch(anySheetOpen, (open) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})
onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

/* ---- Item detail sheet ---- */
// group.id -> optionId (single) | optionId[] (multi)
const sheetSelections = reactive({})

const sheetGroups = computed(() => {
  const item = activeItem.value
  if (!item) {
    return []
  }
  return itemGroups(item).map((group) => decorateGroup(group, item))
})

function resetSelections(item) {
  Object.keys(sheetSelections).forEach((key) => delete sheetSelections[key])
  if (!item) {
    return
  }
  sheetGroups.value.forEach((group) => {
    sheetSelections[group.id] = group.multiple ? [] : ''
  })
}

function isOptionOn(group, option) {
  const selected = sheetSelections[group.id]
  return group.multiple
    ? Array.isArray(selected) && selected.includes(option.id)
    : selected === option.id
}

function chooseSingle(group, option) {
  // Optional single-choice groups can be cleared by tapping the active option.
  if (sheetSelections[group.id] === option.id && !group.required) {
    sheetSelections[group.id] = ''
  } else {
    sheetSelections[group.id] = option.id
  }
}

function toggleMulti(group, option) {
  const current = Array.isArray(sheetSelections[group.id]) ? [...sheetSelections[group.id]] : []
  const index = current.indexOf(option.id)
  if (index >= 0) {
    current.splice(index, 1)
  } else if (current.length < group.max) {
    current.push(option.id)
  }
  sheetSelections[group.id] = current
}

function optionAtCap(group, option) {
  if (!group.multiple || isOptionOn(group, option)) {
    return false
  }
  const selected = sheetSelections[group.id]
  return Array.isArray(selected) && selected.length >= group.max
}

const selectedModifiers = computed(() => {
  const result = []
  sheetGroups.value.forEach((group, groupIndex) => {
    const selected = sheetSelections[group.id]
    const ids = group.multiple
      ? Array.isArray(selected)
        ? selected
        : []
      : selected
        ? [selected]
        : []
    ids.forEach((optionId, optionIndex) => {
      const option = group.options.find((candidate) => candidate.id === optionId)
      if (option) {
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: Number(option.priceDelta) || 0,
          sortIndex: groupIndex * 100 + optionIndex,
        })
      }
    })
  })
  return result
})

const modifiersTotal = computed(() =>
  selectedModifiers.value.reduce((total, modifier) => total + modifier.priceDelta, 0),
)
const sheetHasPrice = computed(
  () => Boolean(activeItem.value?.hasPrice) || modifiersTotal.value > 0,
)
const sheetUnitPrice = computed(
  () => (activeItem.value?.hasPrice ? Number(activeItem.value.price || 0) : 0) + modifiersTotal.value,
)
const unmetGroups = computed(() =>
  sheetGroups.value.filter((group) => {
    const selected = sheetSelections[group.id]
    const count = group.multiple
      ? Array.isArray(selected)
        ? selected.length
        : 0
      : selected
        ? 1
        : 0
    return group.required && count < Math.max(1, group.min)
  }),
)
const canAddItem = computed(() => unmetGroups.value.length === 0)
const addButtonLabel = computed(() => {
  if (sheetGroups.value.length && !canAddItem.value) {
    return 'Elige opciones'
  }
  return editingExisting.value ? 'Actualizar' : 'Agregar'
})

// Variant lines make "editing" ambiguous, so only no-modifier items reopen in
// edit mode; configured items always start a fresh selection.
const editingExisting = computed(() => {
  const item = activeItem.value
  if (!item || hasModifiers(item)) {
    return false
  }
  return cart.quantityFor(item.id) > 0
})

function openItem(item) {
  activeItem.value = item
  if (hasModifiers(item)) {
    sheetQty.value = 1
    sheetNote.value = ''
  } else {
    const inCart = cart.quantityFor(item.id)
    sheetQty.value = inCart > 0 ? inCart : 1
    sheetNote.value = cart.noteFor(item.id)
  }
  resetSelections(item)
}
function closeItem() {
  activeItem.value = null
}
function bumpSheet(delta) {
  sheetQty.value = Math.max(1, sheetQty.value + delta)
}
function confirmItem() {
  const item = activeItem.value
  if (!item) {
    return
  }
  if (hasModifiers(item)) {
    if (!canAddItem.value) {
      return
    }
    cart.add(item, {
      quantity: sheetQty.value,
      note: sheetNote.value.trim(),
      modifiers: selectedModifiers.value,
      price: sheetUnitPrice.value,
      hasPrice: sheetHasPrice.value,
    })
    closeItem()
    return
  }
  if (editingExisting.value) {
    cart.setQuantity(item.id, sheetQty.value)
    cart.setNote(item.id, sheetNote.value.trim())
  } else {
    cart.add(item, { quantity: sheetQty.value, note: sheetNote.value.trim() })
  }
  closeItem()
}

function quickAdd(item) {
  if (requiresChoice(item) || hasModifiers(item)) {
    openItem(item)
    return
  }
  cart.add(item, { quantity: 1 })
}

/* ---- Order submit ---- */
const customerName = ref(props.prefillName || '')
// Staff call Pick&Go customers to hand off the order, but most Clerk
// sign-ups (email/Google) carry no phone. When the profile has none, capture
// one in the cart sheet so the staff affordance has a number to dial.
const needsPhoneInput = computed(() => isPickup && !props.customerPhone)
const phoneInput = ref('')
const nameError = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

watch(customerName, () => {
  if (nameError.value) {
    nameError.value = ''
  }
})

// Prefill the diner's name from Clerk once it loads, but never overwrite what
// they typed.
watch(
  () => props.prefillName,
  (value) => {
    if (value && !customerName.value.trim()) {
      customerName.value = value
    }
  },
)
const submittedOrder = ref(null)
const submittedOrderId = ref(isPickup ? null : readLastOrderId(tableId.value))
const liveSubmittedOrder =
  hasConvex && !isPickup
    ? useConvexQuery(api.orders.get, () => ({
        orderId: submittedOrderId.value,
      }))
    : { data: ref(null) }
// Pickup orders belong to the signed-in Clerk user, so the live status comes
// from the identity-gated `mine` query instead of a localStorage order id.
const myOrdersQuery = hasConvex && isPickup ? useConvexQuery(api.orders.mine, {}) : { data: ref(null) }
const activePickupOrder = computed(() => {
  const orders = myOrdersQuery.data.value || []
  return orders.find((order) => order.status !== 'served' && order.status !== 'cancelled') || null
})
const visibleSubmittedOrder = computed(() => {
  if (!isPickup) {
    return liveSubmittedOrder.data.value || submittedOrder.value
  }
  if (activePickupOrder.value) {
    return activePickupOrder.value
  }
  const local = submittedOrder.value
  if (!local) {
    return null
  }
  // Keep the just-submitted snapshot until the live list confirms it (or shows
  // it was closed by staff).
  const live = (myOrdersQuery.data.value || []).find((order) => order.id === local.id)
  return live ? null : local
})
const submittedOrderItems = computed(() => visibleSubmittedOrder.value?.items || [])

watch(tableId, (value) => {
  if (isPickup) {
    return
  }
  submittedOrder.value = null
  submittedOrderId.value = readLastOrderId(value)
})

watch(submittedOrderId, (value) => {
  if (isPickup || !canUseStorage()) {
    return
  }
  const key = lastOrderStorageKey(tableId.value)
  if (value) {
    window.localStorage.setItem(key, value)
  } else {
    window.localStorage.removeItem(key)
  }
})

async function submitOrder() {
  if (cart.isEmpty.value || isSubmitting.value) {
    return
  }

  const trimmedName = customerName.value.trim()
  if (!trimmedName) {
    nameError.value = 'Agrega tu nombre para identificar el pedido.'
    return
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    if (!createOrderMutation) {
      throw new Error(
        'Modo local sin VITE_CONVEX_URL: puedes preparar la pagina, pero no enviar pedidos desde este entorno.',
      )
    }

    const items = cart.entries.value.map((entry, index) => {
      const unitPriceCents = entry.hasPrice ? Math.round(Number(entry.price || 0) * 100) : null
      return {
        menuItemId: entry.menuItemId || entry.id,
        name: entry.name,
        sourceName: entry.sourceName || entry.name,
        categoryName: entry.categoryName || '',
        quantity: entry.quantity,
        unitPriceCents,
        lineTotalCents: unitPriceCents == null ? null : unitPriceCents * entry.quantity,
        modifiers: (entry.modifiers || []).map((modifier, modifierIndex) => ({
          groupId: modifier.groupId || '',
          groupName: modifier.groupName || '',
          optionId: modifier.optionId || '',
          optionName: modifier.optionName || '',
          priceDeltaCents: Math.max(0, Math.round(Number(modifier.priceDelta || 0) * 100)),
          sortIndex: Number.isFinite(modifier.sortIndex) ? modifier.sortIndex : modifierIndex,
        })),
        note: entry.note || '',
        imageUrl: entry.image || '',
        sortIndex: index,
      }
    })

    const pickupPhone = (props.customerPhone || phoneInput.value).trim()
    const order = await createOrderMutation.mutate(
      isPickup
        ? {
            customerName: trimmedName,
            ...(pickupPhone ? { customerPhone: pickupPhone } : {}),
            items,
          }
        : {
            tableId: tableId.value,
            customerName: trimmedName,
            items,
          },
    )

    submittedOrder.value = order
    submittedOrderId.value = order.id
    showCart.value = false
    showConfirmation.value = true
    cart.clear()
  } catch (error) {
    submitError.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

function clearOrder() {
  cart.clear()
  showConfirmation.value = false
  showCart.value = false
}

function closeConfirmation() {
  showConfirmation.value = false
}

/* ---- helpers ---- */
function priceLabel(item) {
  return formatMenuPrice(item)
}

/* Fulfillment labels come straight from the backend fields. */
function isReady(item) {
  return item.fulfillmentType === 'counter' && item.pickupStatus === 'ready'
}

function fulfillmentLabel(item) {
  if (item.fulfillmentType === 'counter') {
    return item.pickupStatus === 'ready' ? 'Listo para recoger' : 'Recoges en barra'
  }
  return isPickup ? 'Para recoger' : 'Se lleva a mesa'
}

</script>

<template>
  <main class="order" :aria-label="isPickup ? 'Ordenar para recoger' : 'Ordenar en mesa'">
    <!-- Cover -->
    <header class="cover">
      <img
        v-if="coverImage && !coverFailed"
        class="cover__img"
        :src="coverImage"
        alt=""
        @error="coverFailed = true"
      />
      <div class="cover__scrim"></div>
      <div class="cover__top">
        <RouterLink class="round-btn" :to="{ name: 'home' }" aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </RouterLink>
        <span class="cover__table">{{ contextLabel }}</span>
      </div>
    </header>

    <!-- Identity -->
    <section class="identity">
      <span class="identity__logo">
        <img :src="mascot" alt="" />
      </span>
      <div class="identity__text">
        <h1 class="identity__name">Belly Monster Bites</h1>
        <ul class="identity__meta">
          <li>{{ isPickup ? 'Pide y pasa a recoger' : 'Servicio en mesa' }}</li>
          <li v-if="isPickup" class="is-strong">Pick&amp;Go</li>
          <li v-else-if="hasTable" class="is-strong">{{ tableLabel }}</li>
          <li v-else class="is-warn">Escanea el QR de tu mesa</li>
          <li>{{ isPickup ? 'Pagas al recoger' : 'Pagas al final' }}</li>
        </ul>
      </div>
    </section>

    <!-- Currently orderable menu -->
    <section class="daypart" aria-label="Menú disponible ahora" aria-live="polite">
      <span class="daypart__eyebrow">Disponible ahora</span>
      <p class="daypart__meta">
        <span class="daypart__now">{{ activeMenuGroupData.name }}</span>
        <span class="daypart__count">{{ groupItemCount }} productos</span>
      </p>
    </section>

    <section v-if="visibleSubmittedOrder" class="active-order" aria-live="polite">
      <header class="active-order__head">
        <div>
          <span>Tu pedido</span>
          <strong>#{{ visibleSubmittedOrder.shortCode }}</strong>
          <span v-if="visibleSubmittedOrder.customerName" class="active-order__name-tag">
            {{ visibleSubmittedOrder.customerName }} · {{ contextLabel }}
          </span>
        </div>
        <button type="button" @click="showConfirmation = true">Ver detalle</button>
      </header>

      <ul class="active-order__items">
        <li
          v-for="item in submittedOrderItems"
          :key="item.id"
          :class="{ 'is-ready': isReady(item) }"
        >
          <span class="active-order__qty">{{ item.quantity }}</span>
          <span class="active-order__body">
            <span class="active-order__name">{{ item.name }}</span>
            <span
              v-for="modifier in item.modifiers || []"
              :key="modifier.optionId"
              class="active-order__mod"
            >
              {{ modifier.optionName }}
            </span>
          </span>
          <span class="active-order__fulfillment">{{ fulfillmentLabel(item) }}</span>
        </li>
      </ul>

      <footer class="active-order__foot">
        <span>{{ visibleSubmittedOrder.itemCount }} artículo{{ visibleSubmittedOrder.itemCount === 1 ? '' : 's' }}</span>
        <strong>
          {{ formatMXN(visibleSubmittedOrder.subtotalCents / 100)
          }}<template v-if="visibleSubmittedOrder.hasUnpriced">+</template>
        </strong>
      </footer>
    </section>

    <!-- Sticky: search + menu group chips. The category row lives just below
         so it can wrap (and scroll away) on small screens without bloating
         the sticky header. -->
    <div class="sticky">
      <div class="search">
        <svg class="search__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          v-model="query"
          class="search__input"
          type="search"
          inputmode="search"
          placeholder="Buscar en el menú"
          aria-label="Buscar en el menú"
        />
        <button
          v-if="isSearching"
          class="search__clear"
          type="button"
          aria-label="Limpiar búsqueda"
          @click="query = ''"
        >
          ×
        </button>
      </div>

      <nav
        v-show="!isSearching"
        class="groups"
        aria-label="Bloques del menú"
        @pointerdown="startRailDrag"
        @pointermove="moveRailDrag"
        @pointerup="endRailDrag"
        @pointercancel="endRailDrag"
        @wheel="scrollRailWithWheel"
      >
        <button
          v-for="group in menuGroups"
          :key="group.id"
          class="groups__chip"
          :class="{ 'is-active': activeMenuGroup === group.id }"
          type="button"
          @click="selectMenuGroup(group.id)"
        >
          {{ group.name }}
        </button>
      </nav>
    </div>

    <nav
      v-show="!isSearching && visibleCategories.length"
      ref="categoryRail"
      class="cats"
      aria-label="Categorías del menú"
      @pointerdown="startRailDrag"
      @pointermove="moveRailDrag"
      @pointerup="endRailDrag"
      @pointercancel="endRailDrag"
      @wheel="scrollRailWithWheel"
    >
      <button
        v-for="category in visibleCategories"
        :key="category.id"
        :ref="setChipRef(category.id)"
        class="cats__chip"
        :class="{ 'is-active': activeCategory === category.id }"
        type="button"
        @click="goToCategory(category.id)"
      >
        {{ category.name }}
      </button>
    </nav>

    <!-- Search results -->
    <section v-if="isSearching" class="results">
      <h2 class="section__title">
        {{ searchResults.length }} resultado{{ searchResults.length === 1 ? '' : 's' }}
      </h2>
      <p v-if="searchResults.length === 0" class="empty-hint">
        Nada coincide con “{{ query }}”. Prueba con otra palabra.
      </p>
      <ul class="rows">
        <li v-for="item in searchResults" :key="item.id">
          <button class="row" type="button" @click="openItem(item)">
            <span class="row__body">
              <span class="row__name">{{ item.name }}</span>
              <span v-if="item.description" class="row__desc">{{ item.description }}</span>
              <span class="row__tags">
                <span class="row__price" :class="{ 'is-soft': !item.hasPrice }">
                  {{ priceLabel(item) }}
                </span>
                <span v-if="hasModifiers(item)" class="row__opt">Por opciones</span>
              </span>
            </span>
            <span class="row__media">
              <img
                v-if="showImage(item)"
                :src="item.image"
                alt=""
                loading="lazy"
                @error="onImageError(item.id)"
              />
              <span v-else class="row__placeholder"><img :src="mascot" alt="" /></span>
              <span
                class="row__add"
                :class="{ 'is-in': cart.quantityForMenuItem(item.id) > 0 }"
                @click.stop="quickAdd(item)"
                role="button"
                :aria-label="`Agregar ${item.name}`"
              >
                <template v-if="cart.quantityForMenuItem(item.id) > 0">{{ cart.quantityForMenuItem(item.id) }}</template>
                <template v-else>+</template>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- Menu: vertical section list for the active group -->
    <template v-else>
      <!-- Featured rail -->
      <section v-if="featuredItems.length" class="featured">
        <h2 class="section__title">Más pedidos</h2>
        <div class="featured__rail">
          <button
            v-for="item in featuredItems"
            :key="item.id"
            class="fcard"
            type="button"
            @click="openItem(item)"
          >
            <span class="fcard__media">
              <img
                v-if="showImage(item)"
                :src="item.image"
                alt=""
                loading="lazy"
                @error="onImageError(item.id)"
              />
              <span v-else class="row__placeholder"><img :src="mascot" alt="" /></span>
              <span
                class="fcard__add"
                :class="{ 'is-in': cart.quantityForMenuItem(item.id) > 0 }"
                @click.stop="quickAdd(item)"
                role="button"
                :aria-label="`Agregar ${item.name}`"
              >
                <template v-if="cart.quantityForMenuItem(item.id) > 0">{{ cart.quantityForMenuItem(item.id) }}</template>
                <template v-else>+</template>
              </span>
            </span>
            <span class="fcard__price" :class="{ 'is-soft': !item.hasPrice }">{{ priceLabel(item) }}</span>
            <span class="fcard__name">{{ item.name }}</span>
          </button>
        </div>
      </section>

      <section
        v-for="category in visibleCategories"
        :key="category.id"
        :ref="setSectionRef(category.id)"
        :data-cat-id="category.id"
        class="menu-section"
      >
        <h2 class="section__title">{{ category.name }}</h2>
        <ul class="rows">
          <li v-for="item in category.items" :key="item.id">
            <button class="row" type="button" @click="openItem(item)">
              <span class="row__body">
                <span class="row__name">{{ item.name }}</span>
                <span v-if="item.description" class="row__desc">{{ item.description }}</span>
                <span class="row__tags">
                  <span class="row__price" :class="{ 'is-soft': !item.hasPrice }">
                    {{ priceLabel(item) }}
                  </span>
                  <span v-if="hasModifiers(item)" class="row__opt">Por opciones</span>
                </span>
              </span>
              <span class="row__media">
                <img
                  v-if="showImage(item)"
                  :src="item.image"
                  alt=""
                  loading="lazy"
                  @error="onImageError(item.id)"
                />
                <span v-else class="row__placeholder"><img :src="mascot" alt="" /></span>
                <span
                  class="row__add"
                  :class="{ 'is-in': cart.quantityForMenuItem(item.id) > 0 }"
                  @click.stop="quickAdd(item)"
                  role="button"
                  :aria-label="`Agregar ${item.name}`"
                >
                  <template v-if="cart.quantityForMenuItem(item.id) > 0">{{ cart.quantityForMenuItem(item.id) }}</template>
                  <template v-else>+</template>
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <section v-if="!visibleCategories.length" class="menu-section menu-section--empty">
        <h2 class="section__title">{{ activeMenuGroupData.name }}</h2>
        <p class="empty-hint">
          Esta sección está provisional. Cuando agregues el archivo o productos de
          {{ activeMenuGroupData.name.toLowerCase() }}, aparecerán aquí.
        </p>
      </section>

      <p class="foot-note">
        Menú de referencia. Confirma disponibilidad y precios
        {{ isPickup ? 'al recoger tu pedido' : 'con tu mesero' }}.
      </p>
    </template>

    <!-- Floating cart bar -->
    <Transition name="rise">
      <button
        v-if="!cart.isEmpty.value && !anySheetOpen"
        class="cartbar"
        type="button"
        @click="showCart = true"
      >
        <span class="cartbar__count">{{ cart.count.value }}</span>
        <span class="cartbar__label">Ver pedido</span>
        <span class="cartbar__total">
          {{ formatMXN(cart.estimatedTotal.value) }}<small v-if="cart.hasUnpriced.value">+</small>
        </span>
      </button>
    </Transition>

    <!-- Item detail sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="activeItem" class="sheet-root" @click.self="closeItem">
          <div class="sheet sheet--item" role="dialog" aria-modal="true">
            <button class="sheet__close" type="button" aria-label="Cerrar" @click="closeItem">×</button>
            <div class="sheet__scroll">
              <div v-if="showImage(activeItem)" class="isheet__photo">
                <img :src="activeItem.image" alt="" @error="onImageError(activeItem.id)" />
              </div>
              <div class="isheet__head">
                <h3 class="isheet__name">{{ activeItem.name }}</h3>
                <span class="isheet__price" :class="{ 'is-soft': !activeItem.hasPrice }">
                  {{ priceLabel(activeItem) }}
                </span>
              </div>
              <p v-if="activeItem.description" class="isheet__desc">
                {{ activeItem.description }}
              </p>
              <div v-if="sheetGroups.length" class="isheet__groups">
                <section v-for="group in sheetGroups" :key="group.id" class="optgroup">
                  <header class="optgroup__head">
                    <span class="optgroup__name">{{ group.name }}</span>
                    <span class="optgroup__hint" :class="{ 'is-req': group.required }">
                      {{
                        group.required
                          ? 'Obligatorio'
                          : group.multiple
                            ? `Hasta ${group.max}`
                            : 'Opcional'
                      }}
                    </span>
                  </header>
                  <ul class="optgroup__list">
                    <li v-for="option in group.options" :key="option.id">
                      <button
                        type="button"
                        class="optcard"
                        :class="{
                          'is-on': isOptionOn(group, option),
                          'is-multi': group.multiple,
                          'is-disabled': optionAtCap(group, option),
                        }"
                        :aria-pressed="isOptionOn(group, option)"
                        @click="group.multiple ? toggleMulti(group, option) : chooseSingle(group, option)"
                      >
                        <span class="optcard__mark" aria-hidden="true"></span>
                        <span class="optcard__name">{{ option.name }}</span>
                        <span v-if="option.priceDelta" class="optcard__delta">
                          +{{ formatMXN(option.priceDelta) }}
                        </span>
                      </button>
                    </li>
                  </ul>
                </section>
              </div>
              <label class="isheet__field">
                <span>Nota para la cocina</span>
                <textarea
                  v-model="sheetNote"
                  rows="2"
                  placeholder="Ej. sin cebolla, leche deslactosada, término…"
                ></textarea>
              </label>
            </div>
            <div class="sheet__foot">
              <div class="stepper" role="group" aria-label="Cantidad">
                <button type="button" aria-label="Quitar uno" @click="bumpSheet(-1)">−</button>
                <span>{{ sheetQty }}</span>
                <button type="button" aria-label="Agregar uno" @click="bumpSheet(1)">+</button>
              </div>
              <button
                class="btn-primary"
                type="button"
                :disabled="sheetGroups.length > 0 && !canAddItem"
                @click="confirmItem"
              >
                <span>{{ addButtonLabel }}</span>
                <span v-if="sheetHasPrice" class="btn-primary__amt">
                  {{ formatMXN(sheetUnitPrice * sheetQty) }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cart / review sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showCart" class="sheet-root" @click.self="showCart = false">
          <div class="sheet sheet--cart" role="dialog" aria-modal="true">
            <div class="sheet__grab"></div>
            <div class="csheet__top">
              <h3>Tu pedido</h3>
              <span class="csheet__table">{{ contextLabel }}</span>
            </div>
            <button class="sheet__close" type="button" aria-label="Cerrar" @click="showCart = false">×</button>

            <div class="sheet__scroll">
              <ul class="cart-list">
                <li v-for="entry in cart.entries.value" :key="entry.id" class="cart-line">
                  <span class="cart-line__media">
                    <img
                      v-if="showImage(entry)"
                      :src="entry.image"
                      alt=""
                      loading="lazy"
                      @error="onImageError(entry.id)"
                    />
                    <span v-else class="row__placeholder"><img :src="mascot" alt="" /></span>
                  </span>
                  <div class="cart-line__body">
                    <span class="cart-line__name">{{ entry.name }}</span>
                    <ul v-if="entry.modifiers && entry.modifiers.length" class="cart-line__mods">
                      <li v-for="modifier in entry.modifiers" :key="modifier.optionId">
                        <span class="cart-line__mod-name">{{ modifier.optionName }}</span>
                        <span v-if="modifier.priceDelta" class="cart-line__mod-delta">
                          +{{ formatMXN(modifier.priceDelta) }}
                        </span>
                      </li>
                    </ul>
                    <span class="cart-line__price" :class="{ 'is-soft': !entry.hasPrice }">
                      {{ entry.hasPrice ? formatMXN(entry.price * entry.quantity) : priceLabel(entry) }}
                    </span>
                    <span v-if="entry.note" class="cart-line__note">“{{ entry.note }}”</span>
                  </div>
                  <div class="stepper stepper--sm" role="group" aria-label="Cantidad">
                    <button type="button" aria-label="Quitar uno" @click="cart.decrement(entry.id)">−</button>
                    <span>{{ entry.quantity }}</span>
                    <button type="button" aria-label="Agregar uno" @click="cart.increment(entry.id)">+</button>
                  </div>
                </li>
              </ul>
            </div>

            <div class="sheet__foot sheet__foot--col">
              <div class="totals">
                <span>Subtotal estimado</span>
                <span class="totals__amt">{{ formatMXN(cart.estimatedTotal.value) }}</span>
              </div>
              <p v-if="cart.hasUnpriced.value" class="totals__hint">
                Algunos productos dependen de <strong>opciones o disponibilidad</strong>; el total final
                {{ isPickup ? 'se confirma al recoger' : 'lo confirma tu mesero' }}.
              </p>
              <label class="name-field" :class="{ 'is-error': nameError }">
                <span class="name-field__label">¿A nombre de quién?</span>
                <input
                  v-model="customerName"
                  class="name-field__input"
                  type="text"
                  inputmode="text"
                  autocomplete="name"
                  maxlength="80"
                  enterkeyhint="done"
                  placeholder="Tu nombre"
                  aria-label="Tu nombre para el pedido"
                  @keydown.enter.prevent="submitOrder"
                />
              </label>
              <label v-if="needsPhoneInput" class="name-field">
                <span class="name-field__label">Teléfono (para avisarte)</span>
                <input
                  v-model="phoneInput"
                  class="name-field__input"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel"
                  maxlength="20"
                  enterkeyhint="done"
                  placeholder="Tu celular o WhatsApp"
                  aria-label="Tu teléfono para avisarte del pedido"
                  @keydown.enter.prevent="submitOrder"
                />
              </label>
              <p v-if="nameError" class="totals__hint totals__hint--error">
                {{ nameError }}
              </p>
              <p v-if="submitError" class="totals__hint totals__hint--error">
                {{ submitError }}
              </p>
              <button
                class="btn-primary btn-primary--full"
                type="button"
                :disabled="isSubmitting"
                @click="submitOrder"
              >
                {{ isSubmitting ? 'Enviando...' : 'Enviar pedido' }}
              </button>
              <button class="btn-text" type="button" @click="clearOrder">Vaciar pedido</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirmation sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showConfirmation" class="sheet-root" @click.self="closeConfirmation">
          <div class="sheet sheet--done" role="dialog" aria-modal="true" aria-label="Pedido enviado">
            <div class="sheet__grab"></div>
            <button class="sheet__close" type="button" aria-label="Cerrar" @click="closeConfirmation">×</button>
            <div class="sheet__scroll">
              <div class="done">
                <span class="done__check" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M5 13l4 4 10-11" /></svg>
                </span>
                <h3 class="done__title">Pedido enviado</h3>
                <p v-if="visibleSubmittedOrder" class="done__line">
                  <strong v-if="visibleSubmittedOrder.customerName">{{ visibleSubmittedOrder.customerName }}</strong>
                  <template v-if="visibleSubmittedOrder.customerName"> · </template>{{ contextLabel }} ·
                  {{ visibleSubmittedOrder.itemCount }} artículo{{ visibleSubmittedOrder.itemCount === 1 ? '' : 's' }}
                </p>

                <div v-if="visibleSubmittedOrder" class="done__code">
                  <span>{{ isPickup ? 'Muestra este código al recoger' : 'Código de pedido' }}</span>
                  <strong>#{{ visibleSubmittedOrder.shortCode }}</strong>
                </div>

                <ul v-if="submittedOrderItems.length" class="done__items">
                  <li
                    v-for="item in submittedOrderItems"
                    :key="item.id"
                    :class="{ 'is-ready': isReady(item) }"
                  >
                    <span class="done__qty">{{ item.quantity }}</span>
                    <span class="done__body">
                      <span class="done__name">{{ item.name }}</span>
                      <span
                        v-for="modifier in item.modifiers || []"
                        :key="modifier.optionId"
                        class="done__mod"
                      >
                        {{ modifier.optionName }}
                      </span>
                    </span>
                    <span class="done__fulfillment">{{ fulfillmentLabel(item) }}</span>
                  </li>
                </ul>

                <div v-if="visibleSubmittedOrder" class="done__total">
                  <span>Subtotal estimado</span>
                  <strong>
                    {{ formatMXN(visibleSubmittedOrder.subtotalCents / 100)
                    }}<template v-if="visibleSubmittedOrder.hasUnpriced">+</template>
                  </strong>
                </div>
              </div>
            </div>
            <div class="sheet__foot sheet__foot--col">
              <button class="btn-primary btn-primary--full" type="button" @click="closeConfirmation">
                Seguir pidiendo
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped>
.order {
  --ink: #2a1c14;
  --muted: #8b7a6d;
  --cream: #fff8ef;
  --surface: #ffffff;
  --brown: #6f4e37;
  --accent: #1f9d57;
  --accent-press: #18854a;
  --line: #efe5d8;
  --radius: 18px;

  position: relative;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  min-height: 100svh;
  padding-bottom: calc(120px + env(safe-area-inset-bottom));
  background: var(--cream);
  color: var(--ink);
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

/* ---- Cover ---- */
.cover {
  position: relative;
  height: 210px;
  overflow: hidden;
}
.cover__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cover__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgb(0 0 0 / 28%) 0%, transparent 34%, transparent 70%, var(--cream) 100%);
}
.cover__top {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
}
.round-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 2px 10px rgb(0 0 0 / 18%);
  color: var(--ink);
  cursor: pointer;
}
.round-btn svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.cover__table {
  padding: 7px 14px;
  border-radius: 999px;
  background: rgb(42 28 20 / 82%);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.2px;
  backdrop-filter: blur(4px);
}

/* ---- Identity ---- */
.identity {
  position: relative;
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: -34px;
  padding: 0 18px 14px;
}
.identity__logo {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 6px 18px rgb(42 28 20 / 16%);
  overflow: hidden;
}
.identity__logo img {
  width: 60%;
  height: 60%;
  object-fit: contain;
}
.identity__text {
  padding-top: 30px;
  min-width: 0;
}
.identity__name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.05;
}
.identity__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.identity__meta li {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--muted);
  padding: 3px 9px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--line);
}
.identity__meta li.is-strong {
  color: #fff;
  background: var(--brown);
  border-color: var(--brown);
}
.identity__meta li.is-warn {
  color: #b4541f;
  background: #fff1e6;
  border-color: #f6d8c2;
}

/* ---- Disponible ahora (passive label) ---- */
.daypart {
  margin: 0 16px 14px;
}
.daypart__eyebrow {
  display: block;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}
.daypart__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 8px 2px 0;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--muted);
}
.daypart__now {
  color: var(--ink);
  font-weight: 900;
}
.daypart__hours::before,
.daypart__count::before {
  content: '·';
  margin-right: 10px;
  color: var(--line);
}

/* ---- Active order status ---- */
.active-order {
  margin: 0 16px 14px;
  padding: 14px;
  border: 1px solid rgb(111 78 55 / 22%);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 20px rgb(42 28 20 / 8%);
}
.active-order__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.active-order__head div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.active-order__head span {
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.active-order__head strong {
  color: var(--brown);
  font-size: 1.55rem;
  font-weight: 950;
  line-height: 1;
}
.active-order__head .active-order__name-tag {
  margin-top: 4px;
  color: var(--ink);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}
.active-order__head button {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 12px;
  border: 0;
  border-radius: 12px;
  background: var(--brown);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 900;
}
.active-order__items {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.active-order__items li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 2px 9px;
  align-items: center;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fffaf3;
}
.active-order__items li.is-ready {
  border-color: rgb(31 157 87 / 28%);
  background: rgb(31 157 87 / 8%);
}
.active-order__qty {
  display: grid;
  grid-row: span 2;
  place-items: center;
  min-width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #f0e7da;
  color: var(--brown);
  font-size: 0.86rem;
  font-weight: 900;
}
.active-order__body,
.done__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.active-order__name {
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 900;
  line-height: 1.18;
}
.active-order__mod,
.done__mod {
  padding-left: 9px;
  border-left: 2px solid var(--line);
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.25;
}
.active-order__fulfillment {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;
}
.active-order__items li.is-ready .active-order__fulfillment {
  color: var(--accent);
}
.active-order__foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 800;
}
.active-order__foot strong {
  color: var(--ink);
  font-size: 1.05rem;
  font-weight: 950;
}

/* ---- Sticky search + group chips, category row below ---- */
/* Heights here are deliberately fixed so .cats can stick right under the
   .sticky bar on desktop: 8 + 42 + 8 + 36 + 8 = 102px. */
.sticky {
  position: sticky;
  top: 0;
  z-index: 6;
  background: var(--cream);
  padding: 8px 0 0;
}
.search {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 16px 8px;
}
.search__icon {
  position: absolute;
  left: 13px;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
}
.search__input {
  width: 100%;
  height: 42px;
  padding: 0 38px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  font-size: 0.95rem;
  color: var(--ink);
  outline: none;
}
.search__input:focus {
  border-color: var(--brown);
}
.search__clear {
  position: absolute;
  right: 8px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: #efe5d8;
  color: var(--ink);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.groups {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 16px 8px;
  scrollbar-width: none;
  cursor: grab;
  user-select: none;
}
.groups::-webkit-scrollbar {
  display: none;
}
.groups__chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.groups__chip.is-active {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}
.cats {
  position: sticky;
  top: 102px;
  z-index: 5;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 16px 8px;
  background: var(--cream);
  box-shadow: 0 8px 12px -10px rgb(42 28 20 / 28%);
  scrollbar-width: none;
  cursor: grab;
  user-select: none;
}
.cats::-webkit-scrollbar {
  display: none;
}
.cats__chip {
  flex: 0 0 auto;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.cats__chip.is-active {
  background: var(--brown);
  border-color: var(--brown);
  color: #fff;
}

/* ---- Sections ---- */
.section__title {
  margin: 18px 16px 10px;
  font-size: 1.18rem;
  font-weight: 900;
  letter-spacing: 0;
}
/* Larger catalog: keep offscreen sections cheap for iOS WebKit (see
   docs/mobile-safari-menu-crash.md). content-visibility skips paint/layout
   for sections the user hasn't scrolled to yet. */
.menu-section {
  scroll-margin-top: 158px;
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}

/* ---- Featured rail (renders only when featuredItems has entries) ---- */
.featured__rail {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 2px 16px 6px;
  scrollbar-width: none;
}
.featured__rail::-webkit-scrollbar {
  display: none;
}
.fcard {
  flex: 0 0 auto;
  width: 150px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.fcard__media {
  position: relative;
  display: block;
  width: 150px;
  height: 150px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #f0e7da;
}
.fcard__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fcard__price {
  display: block;
  margin: 8px 2px 2px;
  font-size: 0.95rem;
  font-weight: 900;
}
.fcard__name {
  display: block;
  margin: 0 2px;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}

/* ---- List rows ---- */
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rows > li {
  border-bottom: 1px solid var(--line);
}
.rows > li:last-child {
  border-bottom: 0;
}
.row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.row__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
}
.row__name {
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.2;
}
.row__desc {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.row__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin-top: 2px;
}
.row__price {
  font-size: 0.92rem;
  font-weight: 800;
}
.row__price.is-soft,
.fcard__price.is-soft,
.isheet__price.is-soft,
.cart-line__price.is-soft {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
}
.row__opt {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3ece1;
  color: var(--brown);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}
.row__media {
  position: relative;
  flex: 0 0 auto;
  width: 96px;
  height: 96px;
}
.row__media img,
.row__placeholder {
  width: 96px;
  height: 96px;
  border-radius: 14px;
  object-fit: cover;
  display: block;
  background: #f0e7da;
}
.row__placeholder {
  display: grid;
  place-items: center;
}
.row__placeholder img {
  width: 48px;
  height: 48px;
  opacity: 0.55;
  border-radius: 0;
  background: transparent;
}
.row__add,
.fcard__add {
  position: absolute;
  right: -6px;
  bottom: -6px;
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 3px 10px rgb(31 157 87 / 38%);
  border: 2px solid var(--cream);
  cursor: pointer;
}
.fcard__add {
  right: 8px;
  bottom: 8px;
  border-color: #fff;
}
.row__add.is-in,
.fcard__add.is-in {
  font-size: 0.92rem;
}

/* ---- Mobile: no horizontal scroll rails (see
   docs/mobile-safari-menu-crash.md). Chip rows wrap in normal flow and the
   category block scrolls away instead of sticking. ---- */
@media (max-width: 640px) {
  .groups,
  .cats {
    flex-wrap: wrap;
    overflow-x: visible;
    cursor: default;
  }
  .cats {
    position: static;
    box-shadow: none;
  }
  .featured__rail {
    flex-wrap: wrap;
    overflow-x: visible;
  }
  .menu-section {
    scroll-margin-top: 112px;
  }
}

/* ---- Misc ---- */
.empty-hint,
.foot-note {
  margin: 12px 16px;
  font-size: 0.84rem;
  color: var(--muted);
}
.foot-note {
  margin-top: 24px;
  text-align: center;
}

/* ---- Floating cart bar ---- */
.cartbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(14px + env(safe-area-inset-bottom));
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(488px, calc(100vw - 28px));
  padding: 12px 18px;
  border: 0;
  border-radius: 16px;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 12px 30px rgb(31 157 87 / 40%);
  cursor: pointer;
}
.cartbar__count {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 7px;
  border-radius: 8px;
  background: rgb(255 255 255 / 22%);
  font-size: 0.9rem;
  font-weight: 800;
}
.cartbar__label {
  font-size: 1rem;
  font-weight: 800;
}
.cartbar__total {
  margin-left: auto;
  font-size: 1rem;
  font-weight: 900;
}
.cartbar__total small {
  font-weight: 800;
}

/* ---- Sheets ---- */
.sheet-root {
  --ink: #2a1c14;
  --muted: #8b7a6d;
  --cream: #fff8ef;
  --surface: #ffffff;
  --brown: #6f4e37;
  --accent: #1f9d57;
  --accent-press: #18854a;
  --line: #eadfce;
  --orange: #d86f00;

  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: rgb(20 12 8 / 46%);
}
.sheet {
  position: relative;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  max-height: 92svh;
  display: flex;
  flex-direction: column;
  background: var(--cream);
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -10px 40px rgb(0 0 0 / 24%);
}
.sheet__grab {
  width: 40px;
  height: 4px;
  margin: 8px auto 0;
  border-radius: 999px;
  background: #d8cabb;
}
.sheet__close {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 2px 8px rgb(0 0 0 / 14%);
  font-size: 1.35rem;
  line-height: 1;
  color: var(--ink);
  cursor: pointer;
}
.sheet__scroll {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.sheet__foot {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--cream);
}
.sheet__foot--col {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

/* Item sheet */
.isheet__photo {
  width: 100%;
  height: 220px;
  background: #f0e7da;
}
.isheet__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.isheet__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 0;
}
.isheet__name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0;
}
.isheet__price {
  flex: 0 0 auto;
  font-size: 1.05rem;
  font-weight: 900;
}
.isheet__desc {
  margin: 8px 16px 0;
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.4;
}
/* Modifier / sub-product controls */
.isheet__groups {
  margin: 14px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.optgroup {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fffaf3;
  padding: 12px 12px 8px;
}
.optgroup__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 2px;
}
.optgroup__name {
  font-size: 0.88rem;
  font-weight: 900;
  color: var(--ink);
}
.optgroup__hint {
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--muted);
}
.optgroup__hint.is-req {
  color: var(--orange);
}
.optgroup__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.optcard {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.optcard.is-on {
  border-color: var(--accent);
  background: rgb(31 157 87 / 8%);
}
.optcard.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.optcard__mark {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 2px solid #d6c8b8;
  border-radius: 50%;
  background: #fff;
  transition: border-color 0.15s, background-color 0.15s;
}
.optcard.is-multi .optcard__mark {
  border-radius: 7px;
}
.optcard.is-on .optcard__mark {
  border-color: var(--accent);
  background: var(--accent);
}
.optcard.is-on .optcard__mark::after {
  content: '';
  width: 9px;
  height: 5px;
  margin-top: -2px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg);
}
.optcard__name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}
.optcard__delta {
  flex: 0 0 auto;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--brown);
}
.isheet__field {
  display: block;
  margin: 16px 16px 18px;
}
.isheet__field span {
  display: block;
  margin-bottom: 6px;
  font-size: 0.82rem;
  font-weight: 800;
}
.isheet__field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  font: inherit;
  font-size: 0.9rem;
  color: var(--ink);
  resize: none;
  outline: none;
}
.isheet__field textarea:focus {
  border-color: var(--brown);
}

/* Stepper */
.stepper {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
}
.stepper button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: #f0e7da;
  color: var(--ink);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}
.stepper span {
  min-width: 18px;
  text-align: center;
  font-weight: 800;
}
.stepper--sm {
  gap: 10px;
  padding: 4px 8px;
}
.stepper--sm button {
  width: 26px;
  height: 26px;
  font-size: 1.1rem;
}

/* Buttons */
.btn-primary {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 50px;
  padding: 0 18px;
  border: 0;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
}
.btn-primary:active {
  background: var(--accent-press);
}
.btn-primary:disabled {
  cursor: progress;
  opacity: 0.68;
}
.btn-primary--full {
  width: 100%;
}
.btn-primary__amt {
  font-weight: 900;
}
.btn-text {
  width: 100%;
  padding: 6px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

/* Cart sheet */
.csheet__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 6px;
}
.csheet__top h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 900;
}
.csheet__table {
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--brown);
  color: #fff;
  font-size: 0.76rem;
  font-weight: 800;
}
.cart-list {
  margin: 0;
  padding: 0 16px;
  list-style: none;
}
.cart-line {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.cart-line:last-child {
  border-bottom: 0;
}
.cart-line__media img,
.cart-line__media .row__placeholder {
  width: 52px;
  height: 52px;
  border-radius: 12px;
}
.cart-line__media .row__placeholder img {
  width: 28px;
  height: 28px;
}
.cart-line__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cart-line__name {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.2;
}
.cart-line__mods {
  margin: 3px 0 1px;
  padding: 0 0 0 10px;
  border-left: 2px solid var(--line);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.cart-line__mods li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
  line-height: 1.3;
}
.cart-line__mod-delta {
  flex: 0 0 auto;
  color: var(--brown);
  font-weight: 800;
}
.cart-line__price {
  font-size: 0.88rem;
  font-weight: 800;
}
.cart-line__note {
  font-size: 0.78rem;
  color: var(--muted);
  font-style: italic;
}
.totals {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.totals__amt {
  font-size: 1.3rem;
  font-weight: 900;
}
.totals__hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.35;
}
.totals__hint--error {
  color: #b42a2a;
  font-weight: 800;
}
.name-field {
  display: block;
}
.name-field__label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--ink);
}
.name-field__input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  font: inherit;
  font-size: 0.95rem;
  color: var(--ink);
  outline: none;
}
.name-field__input:focus {
  border-color: var(--brown);
}
.name-field.is-error .name-field__input {
  border-color: #b42a2a;
}

/* Confirmation sheet */
.done {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 20px 4px;
  text-align: center;
}
.done__check {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 8px 22px rgb(31 157 87 / 36%);
}
.done__check svg {
  width: 34px;
  height: 34px;
  fill: none;
  stroke: #fff;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: done-tick 0.4s 0.08s ease forwards;
}
@keyframes done-tick {
  to {
    stroke-dashoffset: 0;
  }
}
.done__title {
  margin: 14px 0 2px;
  font-size: 1.35rem;
  font-weight: 950;
  letter-spacing: 0;
}
.done__line {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 700;
}
.done__line strong {
  color: var(--ink);
  font-weight: 900;
}
.done__code {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  margin: 18px 0 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
}
.done__code span {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;
}
.done__code strong {
  font-size: 2.4rem;
  font-weight: 950;
  line-height: 1.05;
  letter-spacing: 0.5px;
}
.done__items {
  display: grid;
  gap: 8px;
  width: 100%;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}
.done__items li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 2px 9px;
  align-items: center;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}
.done__items li.is-ready {
  border-color: rgb(31 157 87 / 28%);
  background: rgb(31 157 87 / 8%);
}
.done__qty {
  display: grid;
  grid-row: span 2;
  place-items: center;
  min-width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #f0e7da;
  color: var(--brown);
  font-size: 0.86rem;
  font-weight: 900;
}
.done__name {
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 900;
  line-height: 1.18;
}
.done__fulfillment {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;
}
.done__items li.is-ready .done__fulfillment {
  color: var(--accent);
}
.done__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  margin-top: 12px;
  font-weight: 900;
}
.done__total span {
  color: var(--muted);
  font-weight: 800;
}
.done__total strong {
  font-size: 1.15rem;
}
@media (prefers-reduced-motion: reduce) {
  .done__check svg {
    animation: none;
    stroke-dashoffset: 0;
  }
}

/* ---- Transitions ---- */
.rise-enter-active,
.rise-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.rise-enter-from,
.rise-leave-to {
  transform: translate(-50%, 18px);
  opacity: 0;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.24s ease;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .rise-enter-active,
  .rise-leave-active,
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet,
  .sheet-leave-active .sheet {
    transition: none;
  }
}
</style>
