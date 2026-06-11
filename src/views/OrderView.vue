<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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

const mealGroupId = menuSource.activeMeal
const activeMenuGroup = ref('meal')
const activeMenuSubgroup = ref('')
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

  if (/(sandwich|burger|sopa|bowl|chilaquil|waffle|pan frances)/.test(name)) {
    return 'fuertes'
  }

  return 'fuertes'
}

const menuSubgroups = computed(() => {
  if (activeMenuGroup.value === 'bebidas') {
    return [
      { id: 'cofy', name: 'Cofy' },
      { id: 'refreshers', name: 'Refreshers' },
      { id: 'otros', name: 'Otros' },
    ]
  }

  if (activeMenuGroup.value === 'postres') {
    return [{ id: 'postres-placeholder', name: 'Placeholder' }]
  }

  return [
    { id: 'fuertes', name: menuSource.activeMeal === 'desayunos' ? 'Desayunos fuertes' : 'Comidas fuertes' },
    { id: 'ligeros', name: 'Ligeros' },
    { id: 'extras', name: 'Extras' },
  ]
})
const visibleCategories = computed(() => {
  const categories = activeMenuGroupData.value?.categories || []

  if (activeMenuGroup.value === 'bebidas') {
    return categories.filter((category) => beverageSubgroupForCategory(category) === activeMenuSubgroup.value)
  }

  if (activeMenuGroup.value === 'meal') {
    return categories.filter((category) => mealSubgroupForCategory(category) === activeMenuSubgroup.value)
  }

  return categories
})
const selectedCategory = computed(
  () =>
    visibleCategories.value.find((category) => category.id === activeCategory.value) ||
    visibleCategories.value[0] ||
    null,
)
const allItems = computed(() => visibleCategories.value.flatMap((category) => category.items))
const currentMenuItems = computed(() => selectedCategory.value?.items || [])
const menuGroupRail = ref(null)
const subgroupRail = ref(null)
const categoryRail = ref(null)
const railDrag = {
  el: null,
  pointerId: null,
  startX: 0,
  startScrollLeft: 0,
  moved: false,
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

/* ---- Group + category nav ---- */
const sectionEls = {}
const chipEls = {}
const setSectionRef = (id) => (el) => {
  if (el) {
    sectionEls[id] = el
  }
}
const setChipRef = (id) => (el) => {
  if (el) {
    chipEls[id] = el
  }
}

let observer = null
watch(activeCategory, (id) => {
  const chip = chipEls[id]
  if (chip) {
    chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }
})

watch(
  menuSubgroups,
  (subgroups) => {
    if (!subgroups.some((subgroup) => subgroup.id === activeMenuSubgroup.value)) {
      activeMenuSubgroup.value = subgroups[0]?.id || ''
    }
  },
  { immediate: true },
)

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

function selectMenuSubgroup(id) {
  activeMenuSubgroup.value = id
}

function goToCategory(id) {
  activeCategory.value = id
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
const editingExisting = computed(
  () => Boolean(activeItem.value) && cart.quantityFor(activeItem.value.id) > 0,
)

function openItem(item) {
  activeItem.value = item
  const inCart = cart.quantityFor(item.id)
  sheetQty.value = inCart > 0 ? inCart : 1
  sheetNote.value = cart.noteFor(item.id)
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
  if (editingExisting.value) {
    cart.setQuantity(item.id, sheetQty.value)
    cart.setNote(item.id, sheetNote.value.trim())
  } else {
    cart.add(item, { quantity: sheetQty.value, note: sheetNote.value.trim() })
  }
  closeItem()
}

/* Quick-add straight from the list, no sheet. */
function quickAdd(item) {
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
        menuItemId: entry.id,
        name: entry.name,
        sourceName: entry.sourceName || entry.name,
        categoryName: entry.categoryName || '',
        quantity: entry.quantity,
        unitPriceCents,
        lineTotalCents: unitPriceCents == null ? null : unitPriceCents * entry.quantity,
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
      <img class="cover__img" :src="coverImage" alt="" />
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
          <span class="active-order__name">{{ item.name }}</span>
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

    <!-- Sticky: search + category nav -->
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
        ref="menuGroupRail"
        class="menu-groups"
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
          class="menu-groups__button"
          :class="{ 'is-active': activeMenuGroup === group.id }"
          type="button"
          @click="selectMenuGroup(group.id)"
        >
          {{ group.name }}
        </button>
      </nav>

      <nav
        v-show="!isSearching && menuSubgroups.length"
        ref="subgroupRail"
        class="subgroups"
        aria-label="Subsecciones del menú"
        @pointerdown="startRailDrag"
        @pointermove="moveRailDrag"
        @pointerup="endRailDrag"
        @pointercancel="endRailDrag"
        @wheel="scrollRailWithWheel"
      >
        <button
          v-for="subgroup in menuSubgroups"
          :key="subgroup.id"
          class="subgroups__chip"
          :class="{ 'is-active': activeMenuSubgroup === subgroup.id }"
          type="button"
          @click="selectMenuSubgroup(subgroup.id)"
        >
          {{ subgroup.name }}
        </button>
      </nav>

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
    </div>

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
              <span class="row__price" :class="{ 'is-soft': !item.hasPrice }">
                {{ priceLabel(item) }}
              </span>
            </span>
            <span class="row__media">
              <img v-if="item.image" :src="item.image" alt="" loading="lazy" />
              <span v-else class="row__placeholder"><img :src="mascot" alt="" /></span>
              <span
                class="row__add"
                :class="{ 'is-in': cart.quantityFor(item.id) > 0 }"
                @click.stop="quickAdd(item)"
                role="button"
                :aria-label="`Agregar ${item.name}`"
              >
                <template v-if="cart.quantityFor(item.id) > 0">{{ cart.quantityFor(item.id) }}</template>
                <template v-else>+</template>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- Menu -->
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
              <img :src="item.image" alt="" loading="lazy" />
              <span
                class="fcard__add"
                :class="{ 'is-in': cart.quantityFor(item.id) > 0 }"
                @click.stop="quickAdd(item)"
                role="button"
                :aria-label="`Agregar ${item.name}`"
              >
                <template v-if="cart.quantityFor(item.id) > 0">{{ cart.quantityFor(item.id) }}</template>
                <template v-else>+</template>
              </span>
            </span>
            <span class="fcard__price">{{ priceLabel(item) }}</span>
            <span class="fcard__name">{{ item.name }}</span>
          </button>
        </div>
      </section>

      <!-- Category sections -->
      <section
        v-if="selectedCategory"
        :key="selectedCategory.id"
        :ref="setSectionRef(selectedCategory.id)"
        :data-cat-id="selectedCategory.id"
        class="menu-section"
      >
        <h2 class="section__title">{{ selectedCategory.name }}</h2>
        <ul class="rows">
          <li v-for="item in currentMenuItems" :key="item.id">
            <button class="row" type="button" @click="openItem(item)">
              <span class="row__body">
                <span class="row__name">{{ item.name }}</span>
                <span v-if="item.description" class="row__desc">{{ item.description }}</span>
                <span class="row__price" :class="{ 'is-soft': !item.hasPrice }">
                  {{ priceLabel(item) }}
                </span>
              </span>
              <span class="row__media">
                <img v-if="item.image" :src="item.image" alt="" loading="lazy" />
                <span v-else class="row__placeholder"><img :src="mascot" alt="" /></span>
                <span
                  class="row__add"
                  :class="{ 'is-in': cart.quantityFor(item.id) > 0 }"
                  @click.stop="quickAdd(item)"
                  role="button"
                  :aria-label="`Agregar ${item.name}`"
                >
                  <template v-if="cart.quantityFor(item.id) > 0">{{ cart.quantityFor(item.id) }}</template>
                  <template v-else>+</template>
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>
      <section v-else class="menu-section menu-section--empty">
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
              <div v-if="activeItem.image" class="isheet__photo">
                <img :src="activeItem.image" alt="" />
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
              <button class="btn-primary" type="button" @click="confirmItem">
                <span>{{ editingExisting ? 'Actualizar' : 'Agregar' }}</span>
                <span v-if="activeItem.hasPrice" class="btn-primary__amt">
                  {{ formatMXN(activeItem.price * sheetQty) }}
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
                    <img v-if="entry.image" :src="entry.image" alt="" loading="lazy" />
                    <span v-else class="row__placeholder"><img :src="mascot" alt="" /></span>
                  </span>
                  <div class="cart-line__body">
                    <span class="cart-line__name">{{ entry.name }}</span>
                    <span class="cart-line__price" :class="{ 'is-soft': !entry.hasPrice }">
                      {{ entry.hasPrice ? formatMXN(entry.price * entry.quantity) : 'Precio en tienda' }}
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
                Algunos productos son <strong>precio en tienda</strong>; el total final
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
                    <span class="done__name">{{ item.name }}</span>
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
  --ink: #111316;
  --muted: #4fb78d;
  --cream: #0f1114;
  --surface: #ffffff;
  --brown: #4fb78d;
  --accent: #8fe5bf;
  --accent-press: #6fd5a6;
  --line: #9fe8c8;
  --soft-surface: #f8f3ec;
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
  background: rgb(15 17 20 / 82%);
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
  box-shadow: 0 10px 28px rgb(0 0 0 / 42%);
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
  color: #fff;
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
  color: var(--ink);
  background: var(--accent);
  border-color: var(--accent);
}
.identity__meta li.is-warn {
  color: #26845f;
  background: rgb(143 229 191 / 14%);
  border-color: rgb(143 229 191 / 46%);
}

/* ---- Active order status ---- */
.active-order {
  margin: 0 16px 14px;
  padding: 14px;
  border: 1px solid rgb(143 229 191 / 38%);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 20px rgb(15 17 20 / 18%);
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
  background: rgb(143 229 191 / 18%);
  color: var(--brown);
  font-size: 0.86rem;
  font-weight: 900;
}
.active-order__name {
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 900;
  line-height: 1.18;
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

/* ---- Sticky search + cats ---- */
.sticky {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--cream);
  padding: 8px 0 4px;
  box-shadow: 0 10px 20px -14px rgb(143 229 191 / 50%);
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
  background: rgb(143 229 191 / 18%);
  color: var(--ink);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.menu-groups {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  padding: 2px 16px 8px;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: rgb(143 229 191 / 72%) transparent;
  touch-action: pan-x;
  user-select: none;
}
.menu-groups::-webkit-scrollbar {
  height: 5px;
}
.menu-groups::-webkit-scrollbar-track {
  background: transparent;
}
.menu-groups::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(143 229 191 / 68%);
}
.menu-groups__button {
  flex: 0 0 min(34vw, 156px);
  min-height: 40px;
  padding: 0 8px;
  border: 1px solid rgb(143 229 191 / 64%);
  border-radius: 14px;
  background: #fff;
  color: #4fb78d;
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1.05;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.menu-groups__button.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--ink);
}
.subgroups {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 16px 7px;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: rgb(143 229 191 / 62%) transparent;
  touch-action: pan-x;
  user-select: none;
}
.subgroups::-webkit-scrollbar {
  height: 5px;
}
.subgroups::-webkit-scrollbar-track {
  background: transparent;
}
.subgroups::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(143 229 191 / 55%);
}
.subgroups__chip {
  flex: 0 0 auto;
  min-width: max-content;
  padding: 7px 13px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: #4fb78d;
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.subgroups__chip.is-active {
  background: rgb(143 229 191 / 24%);
  border-color: var(--accent);
  color: #fff;
}
.cats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  padding: 2px 16px 6px;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: rgb(143 229 191 / 72%) transparent;
  touch-action: pan-x;
  user-select: none;
}
.cats::-webkit-scrollbar {
  height: 5px;
}
.cats::-webkit-scrollbar-track {
  background: transparent;
}
.cats::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(143 229 191 / 68%);
}
.cats__chip {
  flex: 0 0 auto;
  min-width: max-content;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: #4fb78d;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.cats__chip.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--ink);
}

/* ---- Sections ---- */
.section__title {
  margin: 18px 16px 10px;
  color: var(--ink);
  font-size: 1.18rem;
  font-weight: 900;
  letter-spacing: 0;
}
.menu-section {
  scroll-margin-top: 124px;
  margin: 12px 16px 0;
  border: 1px solid rgb(143 229 191 / 48%);
  border-radius: 18px;
  background: var(--surface);
  overflow: hidden;
  box-shadow: 0 14px 34px rgb(0 0 0 / 22%);
}

/* ---- Featured rail ---- */
.featured__rail {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 2px 16px 6px;
  scroll-snap-type: x mandatory;
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
  scroll-snap-align: start;
}
.fcard__media {
  position: relative;
  display: block;
  width: 150px;
  height: 150px;
  border-radius: var(--radius);
  overflow: hidden;
  background: rgb(143 229 191 / 16%);
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
  border-bottom: 1px solid rgb(143 229 191 / 52%);
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
  color: #4fb78d;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.row__price {
  margin-top: 2px;
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
  background: rgb(143 229 191 / 16%);
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
  color: var(--ink);
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

/* ---- Misc ---- */
.empty-hint,
.foot-note {
  margin: 12px 16px;
  font-size: 0.84rem;
  color: #8fe5bf;
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
  color: var(--ink);
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
  --ink: #111316;
  --muted: #4fb78d;
  --cream: #0f1114;
  --surface: #ffffff;
  --brown: #4fb78d;
  --accent: #8fe5bf;
  --accent-press: #6fd5a6;
  --line: #9fe8c8;
  --orange: #4fb78d;

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
  background: var(--surface);
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -10px 40px rgb(0 0 0 / 24%);
}
.sheet__grab {
  width: 40px;
  height: 4px;
  margin: 8px auto 0;
  border-radius: 999px;
  background: rgb(143 229 191 / 42%);
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
  background: var(--surface);
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
  background: rgb(143 229 191 / 16%);
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
  background: rgb(143 229 191 / 16%);
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
  color: var(--ink);
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
  stroke: var(--ink);
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
  background: rgb(143 229 191 / 16%);
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
