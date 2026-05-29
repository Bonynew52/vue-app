<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCart } from '../composables/useCart'
import { coverImage, featuredItems, menuCategories } from '../data/menu'
import { formatMenuPrice, formatMXN } from '../utils/formatPrice'
import mascot from '../assets/brand/mascot.svg'

const route = useRoute()

const tableId = computed(() => {
  const raw = route.query.mesa
  const value = Array.isArray(raw) ? raw[0] : raw
  return value != null ? String(value).trim() : ''
})
const hasTable = computed(() => tableId.value.length > 0)
const tableLabel = computed(() => (hasTable.value ? `Mesa ${tableId.value}` : 'Sin mesa'))

const cart = useCart(tableId.value)

const allItems = menuCategories.flatMap((category) => category.items)

/* ---- Search ---- */
const query = ref('')
const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const isSearching = computed(() => normalizedQuery.value.length > 0)
const searchResults = computed(() => {
  if (!isSearching.value) {
    return []
  }
  const q = normalizedQuery.value
  return allItems.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)),
  )
})

/* ---- Category nav + scroll spy ---- */
const activeCategory = ref(menuCategories[0]?.id || '')
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
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) {
        activeCategory.value = visible[0].target.dataset.catId
      }
    },
    { rootMargin: '-128px 0px -68% 0px', threshold: 0 },
  )
  Object.values(sectionEls).forEach((el) => observer.observe(el))
})

watch(activeCategory, (id) => {
  const chip = chipEls[id]
  if (chip) {
    chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }
})

function goToCategory(id) {
  activeCategory.value = id
  const el = sectionEls[id]
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/* ---- Sheets / scroll lock ---- */
const activeItem = ref(null)
const sheetQty = ref(1)
const sheetNote = ref('')
const showCart = ref(false)
const showComanda = ref(false)

const anySheetOpen = computed(
  () => Boolean(activeItem.value) || showCart.value || showComanda.value,
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

/* ---- Comanda ---- */
const comandaStamp = ref('')
const copied = ref(false)

function openComanda() {
  const now = new Date()
  comandaStamp.value = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)
  copied.value = false
  showCart.value = false
  showComanda.value = true
}

const comandaText = computed(() => {
  const lines = []
  lines.push('BELLY MONSTER BITES')
  lines.push(`${tableLabel.value} · ${comandaStamp.value}`)
  lines.push('----------------------------')
  for (const entry of cart.entries.value) {
    const price = entry.hasPrice
      ? formatMXN(entry.price * entry.quantity)
      : 'Precio en tienda'
    lines.push(`${entry.quantity}x ${entry.sourceName}  —  ${price}`)
    if (entry.note) {
      lines.push(`   • ${entry.note}`)
    }
  }
  lines.push('----------------------------')
  lines.push(`Artículos: ${cart.count.value}`)
  lines.push(`Subtotal estimado: ${formatMXN(cart.estimatedTotal.value)}`)
  if (cart.hasUnpriced.value) {
    lines.push('* Incluye productos con precio en tienda; el mesero confirma el total.')
  }
  lines.push('Pago directo con el personal. No es un pedido en línea.')
  return lines.join('\n')
})

async function copyComanda() {
  try {
    await navigator.clipboard.writeText(comandaText.value)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2200)
  } catch {
    copied.value = false
  }
}

function clearOrder() {
  cart.clear()
  showComanda.value = false
  showCart.value = false
}

/* ---- helpers ---- */
function priceLabel(item) {
  return formatMenuPrice(item)
}
</script>

<template>
  <main class="order" aria-label="Ordenar en mesa">
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
        <span class="cover__table">{{ tableLabel }}</span>
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
          <li>Servicio en mesa</li>
          <li v-if="hasTable" class="is-strong">{{ tableLabel }}</li>
          <li v-else class="is-warn">Escanea el QR de tu mesa</li>
          <li>Pagas al final</li>
        </ul>
      </div>
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

      <nav v-show="!isSearching" class="cats" aria-label="Categorías del menú">
        <button
          v-for="category in menuCategories"
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
        v-for="category in menuCategories"
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

      <p class="foot-note">
        Menú de referencia. Confirma disponibilidad y precios con tu mesero.
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
              <span class="csheet__table">{{ tableLabel }}</span>
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
                Algunos productos son <strong>precio en tienda</strong>; el total final lo confirma tu mesero.
              </p>
              <button class="btn-primary btn-primary--full" type="button" @click="openComanda">
                Mostrar pedido
              </button>
              <button class="btn-text" type="button" @click="clearOrder">Vaciar pedido</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Comanda sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showComanda" class="sheet-root" @click.self="showComanda = false">
          <div class="sheet sheet--comanda" role="dialog" aria-modal="true">
            <div class="sheet__grab"></div>
            <button class="sheet__close" type="button" aria-label="Cerrar" @click="showComanda = false">×</button>
            <div class="sheet__scroll">
              <h3 class="comanda__title">Muéstrale esto a tu mesero</h3>
              <p class="comanda__sub">
                Muéstrale este pedido al personal. No se envía en línea y se paga al final.
              </p>
              <pre class="comanda__ticket">{{ comandaText }}</pre>
            </div>
            <div class="sheet__foot sheet__foot--col">
              <button class="btn-primary btn-primary--full" type="button" @click="copyComanda">
                {{ copied ? '¡Copiado!' : 'Copiar pedido' }}
              </button>
              <button class="btn-text" type="button" @click="showComanda = false">Seguir pidiendo</button>
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
  letter-spacing: -0.4px;
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

/* ---- Sticky search + cats ---- */
.sticky {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--cream);
  padding: 8px 0 4px;
  box-shadow: 0 8px 12px -10px rgb(42 28 20 / 28%);
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
.cats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 16px 6px;
  scrollbar-width: none;
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
  letter-spacing: -0.3px;
}
.menu-section {
  scroll-margin-top: 124px;
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
  letter-spacing: -0.3px;
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

/* Comanda sheet */
.comanda__title {
  margin: 14px 16px 4px;
  font-size: 1.2rem;
  font-weight: 900;
}
.comanda__sub {
  margin: 0 16px 12px;
  font-size: 0.84rem;
  color: var(--muted);
  line-height: 1.4;
}
.comanda__ticket {
  margin: 0 16px 16px;
  padding: 16px;
  border: 1px dashed #c9b9a6;
  border-radius: 14px;
  background: #fff;
  color: var(--ink);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
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
