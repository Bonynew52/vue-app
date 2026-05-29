<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import mascot from '../assets/brand/mascot.svg'
import {
  coverImage,
  featuredItems,
  menuCategories,
  menuDisclaimer,
  menuItemsById,
  upsellIds,
} from '../data/menu'
import { useCart } from '../composables/useCart'
import { formatMXN, formatMenuPrice } from '../utils/formatPrice'

const route = useRoute()
const tableId = computed(() => {
  const raw = route.query.mesa
  const value = Array.isArray(raw) ? raw[0] : raw

  return value ? String(value).trim() : ''
})
const hasTable = computed(() => Boolean(tableId.value))
const mesaLabel = computed(() => (hasTable.value ? `Mesa ${tableId.value}` : 'Sin mesa'))

const { entries, count, estimatedTotal, hasUnpriced, add, decrement, clear, quantityFor } = useCart(
  tableId.value,
)

const totalLabel = computed(() => {
  if (estimatedTotal.value > 0) {
    return formatMXN(estimatedTotal.value)
  }

  return hasUnpriced.value ? 'Por confirmar' : formatMXN(0)
})

const upsellItems = computed(() => upsellIds.map((id) => menuItemsById[id]).filter(Boolean))
const suggestedUpsells = computed(() =>
  upsellItems.value.filter((item) => quantityFor(item.id) === 0),
)

const summaryText = computed(() => {
  const header = `Belly Monster Bites · ${mesaLabel.value}`
  const lines = entries.value.map((entry) => {
    const amount = entry.hasPrice
      ? formatMXN(entry.price * entry.quantity)
      : 'precio en tienda'

    return `- ${entry.quantity}x ${entry.name} (${amount})`
  })
  const total = `Total estimado: ${formatMXN(estimatedTotal.value)}${
    hasUnpriced.value ? ' + productos por confirmar' : ''
  }`

  return `${header}\n\n${lines.join('\n')}\n\n${total}\n(Confirma disponibilidad y precio con el mesero)`
})

/* ---------- Search / filter ---------- */
const query = ref('')

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const normalizedQuery = computed(() => normalize(query.value.trim()))
const isSearching = computed(() => normalizedQuery.value.length > 0)

const filteredCategories = computed(() => {
  if (!isSearching.value) {
    return menuCategories
  }

  const q = normalizedQuery.value

  return menuCategories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => normalize(item.name).includes(q) || normalize(item.description).includes(q),
      ),
    }))
    .filter((category) => category.items.length > 0)
})

const resultCount = computed(() =>
  filteredCategories.value.reduce((total, category) => total + category.items.length, 0),
)

function clearSearch() {
  query.value = ''
}

/* ---------- Category scrollspy ---------- */
const activeCategory = ref(menuCategories[0]?.id || '')
const boardRef = ref(null)
const chipRefs = ref({})
let observer

function setChipRef(element, id) {
  if (element) {
    chipRefs.value[id] = element
  }
}

function observeSections() {
  observer?.disconnect()

  if (!boardRef.value) {
    return
  }

  observer = new IntersectionObserver(
    (observed) => {
      const centered = observed
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]

      if (centered?.target?.dataset?.cat) {
        activeCategory.value = centered.target.dataset.cat
      }
    },
    {
      root: null,
      rootMargin: '-30% 0px -55% 0px',
      threshold: [0, 0.1, 0.5, 1],
    },
  )

  boardRef.value.querySelectorAll('[data-cat]').forEach((element) => observer.observe(element))
}

function jumpToCategory(id) {
  activeCategory.value = id

  const selector = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
  const target = boardRef.value?.querySelector(`[data-cat="${selector}"]`)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ---------- Review sheet + staff view ---------- */
const isSheetOpen = ref(false)
const staffMode = ref(false)
const copied = ref(false)
let copyTimer

function openSheet() {
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
  staffMode.value = false
}

async function copySummary() {
  if (!entries.value.length) {
    return
  }

  const text = summaryText.value
  let ok = false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      ok = true
    }
  } catch {
    ok = false
  }

  if (!ok) {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      ok = document.execCommand('copy')
      document.body.removeChild(textarea)
    } catch {
      ok = false
    }
  }

  if (ok) {
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 2200)
  } else {
    staffMode.value = true
  }
}

watch(isSheetOpen, (open) => {
  if (typeof document === 'undefined') {
    return
  }

  document.body.style.overflow = open ? 'hidden' : ''
})

watch(activeCategory, (id) => {
  nextTick(() => {
    chipRefs.value[id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  })
})

watch(filteredCategories, () => {
  nextTick(observeSections)
})

onMounted(() => {
  observeSections()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(copyTimer)

  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <main class="order">
    <header class="hero" :class="{ 'no-cover': !coverImage }">
      <div v-if="coverImage" class="hero-cover">
        <img :src="coverImage" alt="" />
      </div>

      <div class="hero-body">
        <span class="hero-mark"><img :src="mascot" alt="" /></span>
        <div class="hero-copy">
          <p class="hero-name">Belly Monster Bites</p>
          <p class="hero-note">Arma tu pedido y muéstraselo al mesero.</p>
        </div>
      </div>

      <div class="hero-chips" aria-label="Cómo funciona el pedido">
        <span class="op-chip op-chip-mesa">{{ mesaLabel }}</span>
        <span class="op-chip">Paga al final</span>
        <span class="op-chip">Sin pago en línea</span>
      </div>
    </header>

    <section
      v-if="featuredItems.length && !isSearching"
      class="rail"
      aria-label="Más pedidos"
    >
      <div class="rail-head">
        <h2 class="rail-title">Más pedidos</h2>
      </div>

      <div class="rail-track">
        <article
          v-for="item in featuredItems"
          :key="item.id"
          class="promo"
          :class="{ chosen: quantityFor(item.id) > 0 }"
        >
          <div class="promo-photo">
            <img :src="item.image" :alt="item.name" loading="lazy" />

            <Transition name="pop" mode="out-in">
              <button
                v-if="quantityFor(item.id) === 0"
                key="add"
                class="promo-add"
                type="button"
                :aria-label="`Agregar ${item.name}`"
                @click="add(item)"
              >
                +
              </button>

              <div v-else key="step" class="promo-step">
                <button
                  class="promo-min"
                  type="button"
                  :aria-label="`Quitar uno de ${item.name}`"
                  @click="decrement(item.id)"
                >
                  −
                </button>
                <span class="promo-qty">{{ quantityFor(item.id) }}</span>
                <button
                  class="promo-min"
                  type="button"
                  :aria-label="`Agregar otro ${item.name}`"
                  @click="add(item)"
                >
                  +
                </button>
              </div>
            </Transition>
          </div>

          <p class="promo-price" :class="{ tba: !item.hasPrice }">
            {{ formatMenuPrice(item) }}
          </p>
          <p class="promo-name">{{ item.name }}</p>
        </article>
      </div>
    </section>

    <div class="stick">
      <div class="search">
        <label class="search-field">
          <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <input
            v-model="query"
            type="search"
            class="search-input"
            inputmode="search"
            autocomplete="off"
            placeholder="Buscar en el menú"
            aria-label="Buscar en el menú"
          />
          <button
            v-if="query"
            class="search-clear"
            type="button"
            aria-label="Borrar búsqueda"
            @click="clearSearch"
          >
            ×
          </button>
        </label>
        <span class="mesa-chip">{{ mesaLabel }}</span>
      </div>

      <nav v-if="!isSearching" class="tabs" aria-label="Categorías del menú">
        <div class="tabs-track">
          <button
            v-for="category in menuCategories"
            :key="category.id"
            :ref="(element) => setChipRef(element, category.id)"
            class="tab"
            :class="{ active: activeCategory === category.id }"
            type="button"
            @click="jumpToCategory(category.id)"
          >
            {{ category.name }}
          </button>
        </div>
      </nav>
    </div>

    <div ref="boardRef" class="board">
      <p v-if="isSearching" class="search-meta">
        {{ resultCount }} {{ resultCount === 1 ? 'resultado' : 'resultados' }} para “{{ query.trim() }}”
      </p>

      <section
        v-for="category in filteredCategories"
        :key="category.id"
        :data-cat="category.id"
        class="group"
        :aria-label="category.name"
      >
        <div class="group-head">
          <h2 class="group-name">{{ category.name }}</h2>
          <span class="group-count">{{ category.items.length }}</span>
        </div>

        <ul class="rows">
          <li
            v-for="item in category.items"
            :key="item.id"
            class="row"
            :class="{ chosen: quantityFor(item.id) > 0 }"
          >
            <span v-if="item.image" class="thumb">
              <img :src="item.image" alt="" loading="lazy" />
            </span>

            <div class="row-main">
              <h3 class="row-name">{{ item.name }}</h3>
              <p v-if="item.description" class="row-desc">{{ item.description }}</p>
              <span class="row-price" :class="{ tba: !item.hasPrice }">
                {{ formatMenuPrice(item) }}
              </span>
            </div>

            <div class="row-ctrl">
              <Transition name="pop" mode="out-in">
                <button
                  v-if="quantityFor(item.id) === 0"
                  key="add"
                  class="add"
                  type="button"
                  :aria-label="`Agregar ${item.name}`"
                  @click="add(item)"
                >
                  +
                </button>

                <div v-else key="step" class="stepper">
                  <button
                    class="step"
                    type="button"
                    :aria-label="`Quitar uno de ${item.name}`"
                    @click="decrement(item.id)"
                  >
                    −
                  </button>
                  <span class="step-qty">{{ quantityFor(item.id) }}</span>
                  <button
                    class="step"
                    type="button"
                    :aria-label="`Agregar otro ${item.name}`"
                    @click="add(item)"
                  >
                    +
                  </button>
                </div>
              </Transition>
            </div>
          </li>
        </ul>
      </section>

      <p v-if="isSearching && !resultCount" class="empty-search">
        Nada coincide con “{{ query.trim() }}”. Prueba otra palabra.
      </p>

      <p class="board-foot">{{ menuDisclaimer }}</p>
    </div>

    <div class="dock">
      <button
        class="cart-btn"
        :class="{ empty: count === 0 }"
        type="button"
        :disabled="count === 0"
        @click="openSheet"
      >
        <span class="cart-badge">{{ count }}</span>
        <span class="cart-label">
          <strong>{{ count ? 'Ver pedido' : 'Tu pedido está vacío' }}</strong>
          <small v-if="count">{{ mesaLabel }}</small>
          <small v-else>Toca + para agregar del menú</small>
        </span>
        <span v-if="count" class="cart-total">
          {{ totalLabel }}<i v-if="hasUnpriced && estimatedTotal > 0">+</i>
        </span>
      </button>
    </div>

    <button
      v-if="isSheetOpen"
      class="veil"
      type="button"
      aria-label="Cerrar pedido"
      @click="closeSheet"
    ></button>

    <aside v-if="isSheetOpen" class="sheet" role="dialog" aria-modal="true" aria-label="Tu pedido">
      <span class="grip" aria-hidden="true"></span>

      <header class="sheet-head">
        <div>
          <p class="sheet-eyebrow">Comanda</p>
          <h2>Tu pedido</h2>
        </div>
        <span class="sheet-mesa">{{ mesaLabel }}</span>
        <button class="sheet-close" type="button" aria-label="Cerrar" @click="closeSheet">✕</button>
      </header>

      <div class="sheet-scroll">
        <div v-if="!entries.length" class="sheet-empty">
          <span class="empty-mark"><img :src="mascot" alt="" /></span>
          <p>Tu pedido está vacío. Agrega algo rico del menú y aparecerá aquí.</p>
        </div>

        <ul v-else class="ticket">
          <li v-for="entry in entries" :key="entry.id" class="ticket-row">
            <div class="ticket-info">
              <span class="ticket-name">{{ entry.name }}</span>
              <span class="ticket-amt" :class="{ tba: !entry.hasPrice }">
                {{ entry.hasPrice ? formatMXN(entry.price * entry.quantity) : 'Precio en tienda' }}
              </span>
            </div>
            <div class="stepper">
              <button
                class="step"
                type="button"
                :aria-label="`Quitar uno de ${entry.name}`"
                @click="decrement(entry.id)"
              >
                −
              </button>
              <span class="step-qty">{{ entry.quantity }}</span>
              <button
                class="step"
                type="button"
                :aria-label="`Agregar otro ${entry.name}`"
                @click="add(entry)"
              >
                +
              </button>
            </div>
          </li>
        </ul>

        <section v-if="suggestedUpsells.length" class="addons">
          <p class="addons-title">¿Se te antoja algo más?</p>
          <div class="addons-row">
            <button
              v-for="item in suggestedUpsells"
              :key="item.id"
              class="addon"
              type="button"
              @click="add(item)"
            >
              <span class="addon-name">{{ item.name }}</span>
              <span class="addon-foot">
                <span class="addon-price">{{ formatMenuPrice(item) }}</span>
                <span class="addon-plus" aria-hidden="true">+</span>
              </span>
            </button>
          </div>
        </section>
      </div>

      <footer class="sheet-foot">
        <div class="tally">
          <span>Total estimado</span>
          <strong>{{ totalLabel }}<i v-if="hasUnpriced && estimatedTotal > 0">+</i></strong>
        </div>
        <p v-if="hasUnpriced" class="disclaimer">{{ menuDisclaimer }}</p>

        <div class="sheet-actions">
          <button class="ghost" type="button" :disabled="!entries.length" @click="clear">
            Vaciar
          </button>
          <button class="primary" type="button" :disabled="!entries.length" @click="copySummary">
            {{ copied ? '¡Copiado!' : 'Copiar comanda' }}
          </button>
        </div>

        <button
          class="staff-link"
          type="button"
          :disabled="!entries.length"
          @click="staffMode = true"
        >
          Mostrar al mesero
        </button>
      </footer>
    </aside>

    <div
      v-if="staffMode"
      class="staff"
      role="dialog"
      aria-modal="true"
      aria-label="Resumen para el mesero"
      @click="staffMode = false"
    >
      <div class="staff-card" @click.stop>
        <p class="staff-eyebrow">Para el mesero</p>
        <p class="staff-mesa">{{ mesaLabel }}</p>

        <ul class="staff-list">
          <li v-for="entry in entries" :key="entry.id">
            <span class="staff-qty">{{ entry.quantity }}×</span>
            <span class="staff-item">{{ entry.name }}</span>
          </li>
        </ul>

        <p class="staff-total">
          Total estimado: <strong>{{ totalLabel }}</strong>
          <span v-if="hasUnpriced"> · algunos precios se confirman en tienda</span>
        </p>

        <button class="staff-dismiss" type="button" @click="staffMode = false">Listo</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.order {
  --ink: #0f1115;
  --paper: #fffaf3;
  --paper-line: #efe6da;
  --coffee: #6f4e37;
  --coffee-soft: color-mix(in srgb, #6f4e37 62%, #fffaf3);
  --sky: #8fd3ff;
  --jam: #d36c00;
  --jam-deep: #b85c00;
  --leaf: #17a44c;
  --leaf-deep: #128a3f;

  position: relative;
  display: flex;
  flex-direction: column;
  min-height: max(0px, calc(100svh - var(--app-header-height) - var(--app-footer-min-height)));
  padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  background: var(--paper);
  color: var(--ink);
}

/* ---------- Hero cover + operational chips (scrolls away) ---------- */
.hero {
  background: var(--paper);
  color: var(--ink);
}

.hero-cover {
  position: relative;
  height: clamp(150px, 40vw, 210px);
  overflow: hidden;
}

.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 45%;
}

.hero-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 78%, var(--paper));
}

.hero-body {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0 clamp(14px, 4vw, 22px);
}

.hero-cover + .hero-body {
  margin-top: 12px;
}

.hero-mark {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 999px;
  background: var(--paper);
  box-shadow: 0 0 0 3px var(--paper), 0 8px 18px rgb(0 0 0 / 22%);
}

.hero-mark img {
  width: 74%;
  height: 74%;
  object-fit: contain;
}

.hero-copy {
  min-width: 0;
}

.hero-name {
  margin: 0;
  font-size: clamp(1.45rem, 6vw, 1.85rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.hero-note {
  margin: 3px 0 0;
  color: var(--coffee-soft);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.25;
}

.hero-chips {
  display: flex;
  gap: 8px;
  padding: 12px clamp(14px, 4vw, 22px) 14px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.hero-chips::-webkit-scrollbar {
  display: none;
}

.op-chip {
  flex: 0 0 auto;
  padding: 7px 13px;
  border: 1.5px solid var(--paper-line);
  border-radius: 999px;
  background: #ffffff;
  color: var(--coffee);
  font-size: 0.77rem;
  font-weight: 800;
  white-space: nowrap;
}

.op-chip-mesa {
  border-color: transparent;
  background: var(--ink);
  color: #ffffff;
}

/* ---------- "Más pedidos" rail (scrolls away) ---------- */
.rail {
  padding: 16px 0 6px;
  background: var(--paper);
}

.rail-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 0 clamp(14px, 4vw, 22px) 10px;
}

.rail-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.rail-track {
  display: flex;
  gap: 14px;
  padding: 0 clamp(14px, 4vw, 22px) 4px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.rail-track::-webkit-scrollbar {
  display: none;
}

.promo {
  flex: 0 0 auto;
  width: 156px;
  scroll-snap-align: start;
}

.promo-photo {
  position: relative;
  height: 150px;
  overflow: hidden;
  border-radius: 16px;
  background: color-mix(in srgb, var(--coffee) 8%, var(--paper));
  box-shadow: 0 6px 16px rgb(15 17 21 / 12%);
}

.promo-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.promo.chosen .promo-photo {
  box-shadow: 0 0 0 2px var(--leaf), 0 6px 16px rgb(23 164 76 / 28%);
}

.promo-add {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: var(--leaf);
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1;
  box-shadow: 0 4px 12px rgb(18 138 63 / 40%);
  transition: transform 130ms ease, background-color 130ms ease;
}

.promo-add:active {
  transform: scale(0.88);
  background: var(--leaf-deep);
}

.promo-step {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--leaf);
  box-shadow: 0 4px 12px rgb(18 138 63 / 40%);
}

.promo-min {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1;
  transition: background-color 130ms ease, transform 120ms ease;
}

.promo-min:active {
  transform: scale(0.86);
  background: rgb(255 255 255 / 18%);
}

.promo-qty {
  min-width: 18px;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 900;
  text-align: center;
}

.promo-price {
  margin: 9px 0 0;
  color: var(--ink);
  font-size: 1rem;
  font-weight: 900;
}

.promo-price.tba {
  color: var(--coffee-soft);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}

.promo-name {
  margin: 2px 0 0;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.25;
}

/* ---------- Sticky search + category tabs ---------- */
.stick {
  position: sticky;
  top: var(--app-header-height);
  z-index: 6;
  background: color-mix(in srgb, var(--paper) 94%, white);
  border-bottom: 1px solid var(--paper-line);
  backdrop-filter: blur(8px);
}

.search {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px clamp(14px, 4vw, 22px);
}

.search-field {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: var(--coffee-soft);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 11px 38px 11px 38px;
  border: 1.5px solid var(--paper-line);
  border-radius: 999px;
  background: #ffffff;
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 600;
  -webkit-appearance: none;
  appearance: none;
}

.search-input::placeholder {
  color: var(--coffee-soft);
  font-weight: 600;
}

.search-input:focus {
  border-color: var(--sky);
  outline: none;
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  position: absolute;
  right: 8px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--coffee) 14%, transparent);
  color: var(--coffee);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1;
}

.mesa-chip {
  flex: 0 0 auto;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--ink);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 900;
  white-space: nowrap;
}

.tabs {
  border-top: 1px solid var(--paper-line);
}

.tabs-track {
  display: flex;
  gap: 20px;
  padding: 2px clamp(14px, 4vw, 22px) 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.tabs-track::-webkit-scrollbar {
  display: none;
}

.tab {
  position: relative;
  flex: 0 0 auto;
  padding: 11px 0;
  border: 0;
  background: transparent;
  color: var(--coffee-soft);
  font-size: 0.9rem;
  font-weight: 800;
  white-space: nowrap;
  transition: color 160ms ease;
}

.tab.active {
  color: var(--ink);
}

.tab.active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--ink);
}

/* ---------- Menu list ---------- */
.board {
  flex: 1 1 auto;
  padding: 4px clamp(14px, 4vw, 22px) 0;
}

.search-meta {
  margin: 14px 0 4px;
  color: var(--coffee);
  font-size: 0.82rem;
  font-weight: 800;
}

.group {
  scroll-margin-top: calc(var(--app-header-height) + 108px);
}

.group-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 18px 0 8px;
}

.group-name {
  margin: 0;
  color: var(--ink);
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.group-count {
  color: var(--coffee-soft);
  font-size: 0.82rem;
  font-weight: 800;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--paper-line);
}

.row:first-child {
  border-top: 0;
}

.thumb {
  display: block;
  flex: 0 0 auto;
  width: 58px;
  height: 58px;
  overflow: hidden;
  border-radius: 12px;
  background: color-mix(in srgb, var(--coffee) 8%, var(--paper));
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-main {
  flex: 1 1 auto;
  min-width: 0;
}

.row-name {
  margin: 0;
  color: var(--ink);
  font-size: 0.98rem;
  font-weight: 800;
  line-height: 1.2;
}

.row-desc {
  display: -webkit-box;
  margin: 3px 0 0;
  color: var(--coffee);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.row-price {
  display: inline-block;
  margin-top: 5px;
  color: var(--ink);
  font-size: 0.92rem;
  font-weight: 900;
}

.row-price.tba {
  color: var(--coffee-soft);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}

.row-ctrl {
  flex: 0 0 auto;
}

.add {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: var(--jam);
  color: #ffffff;
  font-size: 1.55rem;
  font-weight: 400;
  line-height: 1;
  box-shadow: 0 4px 12px rgb(184 92 0 / 28%);
  transition: transform 130ms ease, background-color 130ms ease;
}

.add:active {
  transform: scale(0.9);
  background: var(--jam-deep);
}

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 12px;
  background: var(--ink);
  box-shadow: 0 4px 12px rgb(15 17 21 / 22%);
}

.step {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1;
  transition: background-color 130ms ease, transform 120ms ease;
}

.step:active {
  transform: scale(0.86);
  background: rgb(255 255 255 / 14%);
}

.step-qty {
  min-width: 22px;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 900;
  text-align: center;
}

.empty-search {
  padding: 28px 0;
  color: var(--coffee);
  font-size: 0.95rem;
  font-weight: 700;
  text-align: center;
}

.board-foot {
  margin: 20px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--paper-line);
  color: var(--coffee-soft);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
}

/* ---------- Persistent cart bar ---------- */
.dock {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 8;
  padding: 10px clamp(12px, 4vw, 22px) calc(10px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, transparent, var(--paper) 46%);
  pointer-events: none;
}

.cart-btn {
  display: flex;
  gap: 12px;
  align-items: center;
  width: min(100%, 600px);
  margin: 0 auto;
  padding: 11px 16px 11px 11px;
  border: 0;
  border-radius: 14px;
  background: var(--jam);
  color: #ffffff;
  box-shadow: 0 12px 28px rgb(0 0 0 / 28%);
  pointer-events: auto;
  touch-action: manipulation;
  transition: transform 150ms ease, background-color 200ms ease;
}

.cart-btn:active {
  transform: translateY(1px) scale(0.995);
}

.cart-btn.empty {
  background: #2b2f37;
  box-shadow: 0 8px 20px rgb(0 0 0 / 22%);
}

.cart-badge {
  display: grid;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  background: rgb(255 255 255 / 22%);
  font-size: 1.1rem;
  font-weight: 900;
}

.cart-btn.empty .cart-badge {
  background: rgb(255 255 255 / 12%);
}

.cart-label {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  text-align: left;
}

.cart-label strong {
  font-size: 1rem;
  font-weight: 900;
}

.cart-label small {
  margin-top: 1px;
  color: rgb(255 255 255 / 80%);
  font-size: 0.76rem;
  font-weight: 700;
}

.cart-total {
  flex: 0 0 auto;
  font-size: 1.05rem;
  font-weight: 900;
}

.cart-total i {
  font-style: normal;
}

/* ---------- Review sheet (comanda) ---------- */
.veil {
  position: fixed;
  inset: 0;
  z-index: 20;
  border: 0;
  background: rgb(7 9 12 / 56%);
  backdrop-filter: blur(3px);
  opacity: 1;
}

.sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 21;
  display: flex;
  flex-direction: column;
  width: min(100%, 600px);
  max-height: 90svh;
  margin: 0 auto;
  padding: 8px clamp(16px, 5vw, 24px) 0;
  border-radius: 22px 22px 0 0;
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 -16px 44px rgb(0 0 0 / 38%);
  transform: translateY(0);
}

.grip {
  width: 42px;
  height: 5px;
  margin: 4px auto 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--coffee) 30%, transparent);
}

.sheet-head {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--paper-line);
}

.sheet-eyebrow {
  margin: 0 0 1px;
  color: var(--jam);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sheet-head h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 900;
  line-height: 1;
}

.sheet-mesa {
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--ink);
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 900;
}

.sheet-close {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--paper-line);
  border-radius: 999px;
  background: #ffffff;
  color: var(--coffee);
  font-size: 0.95rem;
  font-weight: 800;
}

.sheet-scroll {
  flex: 1 1 auto;
  padding: 12px 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.sheet-empty {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  padding: 28px 12px;
  text-align: center;
}

.empty-mark {
  display: grid;
  width: 68px;
  height: 68px;
  place-items: center;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: inset 0 0 0 2px var(--paper-line);
}

.empty-mark img {
  width: 66%;
  height: 66%;
  object-fit: contain;
}

.sheet-empty p {
  max-width: 22rem;
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.35;
}

.ticket {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ticket-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--paper-line);
}

.ticket-info {
  flex: 1 1 auto;
  min-width: 0;
}

.ticket-name {
  display: block;
  color: var(--ink);
  font-size: 0.98rem;
  font-weight: 800;
  line-height: 1.2;
}

.ticket-amt {
  display: block;
  margin-top: 2px;
  color: var(--coffee);
  font-size: 0.88rem;
  font-weight: 900;
}

.ticket-amt.tba {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  opacity: 0.75;
}

.addons {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--paper-line);
}

.addons-title {
  margin: 0 0 10px;
  font-size: 0.98rem;
  font-weight: 900;
}

.addons-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.addons-row::-webkit-scrollbar {
  display: none;
}

.addon {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  width: 150px;
  min-height: 76px;
  padding: 12px;
  border: 1.5px solid var(--paper-line);
  border-radius: 14px;
  background: #ffffff;
  color: var(--ink);
  text-align: left;
}

.addon-name {
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1.2;
}

.addon-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.addon-price {
  color: var(--coffee);
  font-size: 0.8rem;
  font-weight: 900;
}

.addon-plus {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 8px;
  background: var(--jam);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 400;
  line-height: 1;
}

.sheet-foot {
  flex: 0 0 auto;
  padding: 14px 0 calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--paper-line);
}

.tally {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.tally span {
  color: var(--coffee);
  font-size: 0.95rem;
  font-weight: 800;
}

.tally strong {
  font-size: 1.5rem;
  font-weight: 900;
}

.tally i {
  font-style: normal;
}

.disclaimer {
  margin: 8px 0 0;
  color: var(--coffee-soft);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
}

.sheet-actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-top: 14px;
}

.sheet-actions button {
  border: 0;
  border-radius: 12px;
  padding: 15px 20px;
  font-size: 0.98rem;
  font-weight: 900;
}

.sheet-actions .ghost {
  border: 1.5px solid var(--coffee);
  background: transparent;
  color: var(--coffee);
}

.sheet-actions .primary {
  background: var(--jam);
  color: #ffffff;
  box-shadow: 0 8px 20px rgb(184 92 0 / 28%);
}

.sheet-actions button:disabled {
  opacity: 0.45;
}

.staff-link {
  width: 100%;
  margin-top: 10px;
  border: 0;
  background: transparent;
  color: var(--coffee);
  font-size: 0.9rem;
  font-weight: 900;
  text-decoration: underline;
}

.staff-link:disabled {
  opacity: 0.45;
}

/* ---------- Staff read view ---------- */
.staff {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: clamp(16px, 5vw, 32px);
  background: rgb(7 9 12 / 88%);
  backdrop-filter: blur(6px);
}

.staff-card {
  width: min(100%, 520px);
  max-height: 88svh;
  padding: clamp(22px, 6vw, 36px);
  border: 3px solid var(--sky);
  border-radius: 18px;
  background: var(--ink);
  color: #ffffff;
  overflow-y: auto;
}

.staff-eyebrow {
  margin: 0;
  color: var(--sky);
  font-size: 0.84rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.staff-mesa {
  margin: 4px 0 18px;
  font-size: clamp(2rem, 10vw, 3rem);
  font-weight: 900;
  line-height: 1;
}

.staff-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 20px;
  padding: 18px 0;
  border-block: 2px solid rgb(255 255 255 / 18%);
  list-style: none;
}

.staff-list li {
  display: flex;
  gap: 14px;
  align-items: baseline;
}

.staff-qty {
  flex: 0 0 auto;
  min-width: 2.4em;
  color: var(--sky);
  font-size: clamp(1.4rem, 6vw, 1.8rem);
  font-weight: 900;
}

.staff-item {
  font-size: clamp(1.15rem, 5vw, 1.5rem);
  font-weight: 800;
  line-height: 1.15;
}

.staff-total {
  margin: 0 0 22px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.staff-total strong {
  font-size: 1.2rem;
}

.staff-dismiss {
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 16px;
  background: var(--sky);
  color: var(--ink);
  font-size: 1.05rem;
  font-weight: 900;
}

/* ---------- Transitions ---------- */
.pop-enter-active,
.pop-leave-active {
  transition: transform 150ms ease, opacity 150ms ease;
}

.pop-enter-from,
.pop-leave-to {
  transform: scale(0.6);
  opacity: 0;
}

@media (min-width: 720px) {
  .hero-note {
    font-size: 0.82rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cart-btn:active,
  .add:active,
  .step:active {
    transform: none;
  }

  .pop-enter-active,
  .pop-leave-active {
    transition: none;
  }
}
</style>
