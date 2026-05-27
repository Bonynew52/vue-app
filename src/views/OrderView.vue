<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import mascot from '../assets/brand/mascot.svg'
import { menuCategories, menuDisclaimer, menuItemsById, upsellIds } from '../data/menu'
import { useCart } from '../composables/useCart'
import { formatMXN, formatMenuPrice } from '../utils/formatPrice'

const patternModules = import.meta.glob('../assets/background/background_patterns_transparent/*', {
  eager: true,
  query: '?url',
  import: 'default',
})
const patternImages = Object.values(patternModules)

const bandSprites = [
  { top: '14%', left: '5%', size: 64, rot: -18, dur: '7.5s' },
  { top: '58%', left: '11%', size: 46, rot: 14, dur: '9s' },
  { top: '22%', left: '83%', size: 74, rot: 20, dur: '8.5s' },
  { top: '66%', left: '88%', size: 52, rot: -12, dur: '10.5s' },
  { top: '40%', left: '46%', size: 38, rot: 8, dur: '11.5s' },
].map((sprite, index) => ({
  ...sprite,
  id: `band-sprite-${index}`,
  image: patternImages.length ? patternImages[index % patternImages.length] : '',
  style: {
    top: sprite.top,
    left: sprite.left,
    '--sprite-size': `${sprite.size}px`,
    '--sprite-rot': `${sprite.rot}deg`,
    '--sprite-dur': sprite.dur,
    '--sprite-delay': `${-index * 0.8}s`,
  },
}))

const route = useRoute()
const tableId = computed(() => {
  const raw = route.query.mesa
  const value = Array.isArray(raw) ? raw[0] : raw

  return value ? String(value).trim() : ''
})
const hasTable = computed(() => Boolean(tableId.value))
const mesaLabel = computed(() => (hasTable.value ? `Mesa ${tableId.value}` : 'Escanea el QR'))

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

const activeCategory = ref(menuCategories[0]?.id || '')
const sectionRefs = ref({})
const chipRefs = ref({})
const isSheetOpen = ref(false)
const staffMode = ref(false)
const copied = ref(false)
let observer
let copyTimer

function setSectionRef(element, id) {
  if (element) {
    sectionRefs.value[id] = element
  }
}

function setChipRef(element, id) {
  if (element) {
    chipRefs.value[id] = element
  }
}

function jumpToCategory(id) {
  activeCategory.value = id
  sectionRefs.value[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function initial(name) {
  return (name || '').trim().charAt(0).toUpperCase() || '·'
}

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

onMounted(() => {
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
      rootMargin: '-42% 0px -50% 0px',
      threshold: [0, 0.1, 0.5, 1],
    },
  )

  Object.entries(sectionRefs.value).forEach(([id, element]) => {
    element.dataset.cat = id
    observer.observe(element)
  })
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
  <main class="order-view">
    <header class="table-band">
      <div class="band-sprites" aria-hidden="true">
        <img
          v-for="sprite in bandSprites"
          :key="sprite.id"
          class="band-sprite"
          :src="sprite.image"
          alt=""
          :style="sprite.style"
        />
      </div>

      <div class="band-inner">
        <p class="band-eyebrow">Belly Monster Bites</p>

        <div class="band-marquee">
          <span class="band-mascot">
            <img :src="mascot" alt="" />
          </span>

          <span class="band-mesa">
            <span class="mesa-kicker">{{ hasTable ? 'Estás en' : 'Pedido en mesa' }}</span>
            <strong class="mesa-no">{{ mesaLabel }}</strong>
          </span>
        </div>

        <p class="band-note">
          Arma tu orden del menú y muéstrasela al mesero. Sin pagos en línea.
        </p>
      </div>
    </header>

    <nav class="cat-rail" aria-label="Categorías del menú">
      <div class="cat-rail-track">
        <button
          v-for="category in menuCategories"
          :key="category.id"
          :ref="(element) => setChipRef(element, category.id)"
          class="cat-chip"
          :class="{ active: activeCategory === category.id }"
          type="button"
          @click="jumpToCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </div>
    </nav>

    <div class="board">
      <section
        v-for="(category, index) in menuCategories"
        :key="category.id"
        :ref="(element) => setSectionRef(element, category.id)"
        class="course"
        :aria-label="category.name"
      >
        <div class="course-head">
          <span class="course-no">{{ String(index + 1).padStart(2, '0') }}</span>
          <h2 class="course-name">{{ category.name }}</h2>
        </div>

        <ul class="dishes">
          <li
            v-for="item in category.items"
            :key="item.id"
            class="dish"
            :class="{ 'is-chosen': quantityFor(item.id) > 0 }"
          >
            <span class="dish-stamp" aria-hidden="true">
              <img v-if="item.image" :src="item.image" alt="" />
              <span v-else>{{ initial(item.name) }}</span>
            </span>

            <div class="dish-body">
              <div class="dish-line">
                <h3 class="dish-name">{{ item.name }}</h3>
                <span class="dish-leader" aria-hidden="true"></span>
                <span class="dish-price" :class="{ 'in-store': !item.hasPrice }">
                  {{ formatMenuPrice(item) }}
                </span>
              </div>

              <p v-if="item.description" class="dish-desc">{{ item.description }}</p>
            </div>

            <div class="dish-action">
              <Transition name="pop" mode="out-in">
                <button
                  v-if="quantityFor(item.id) === 0"
                  key="add"
                  class="add-btn"
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

      <p class="board-foot">{{ menuDisclaimer }}</p>
    </div>

    <div class="tab-dock">
      <button
        class="order-tab"
        :class="{ empty: count === 0 }"
        type="button"
        @click="openSheet"
      >
        <span class="tab-badge">{{ count }}</span>
        <span class="tab-label">
          <strong>Ver mi orden</strong>
          <small v-if="count">{{ count }} {{ count === 1 ? 'producto' : 'productos' }} · {{ mesaLabel }}</small>
          <small v-else>Aún no agregas nada</small>
        </span>
        <span class="tab-total">{{ totalLabel }}<i v-if="hasUnpriced && estimatedTotal > 0">+</i></span>
      </button>
    </div>

    <Transition name="veil">
      <button
        v-if="isSheetOpen"
        class="sheet-veil"
        type="button"
        aria-label="Cerrar orden"
        @click="closeSheet"
      ></button>
    </Transition>

    <Transition name="rise">
      <aside v-if="isSheetOpen" class="sheet" role="dialog" aria-modal="true" aria-label="Tu orden">
        <span class="sheet-grip" aria-hidden="true"></span>

        <header class="sheet-head">
          <div>
            <p class="sheet-eyebrow">Comanda</p>
            <h2>Tu orden</h2>
          </div>
          <span class="sheet-mesa">{{ mesaLabel }}</span>
          <button class="sheet-close" type="button" @click="closeSheet">Cerrar</button>
        </header>

        <div class="sheet-scroll">
          <div v-if="!entries.length" class="sheet-empty">
            <span class="empty-mascot"><img :src="mascot" alt="" /></span>
            <p>Tu orden está vacía. Agrega algo rico del menú y aparecerá aquí.</p>
          </div>

          <ul v-else class="ticket">
            <li v-for="entry in entries" :key="entry.id" class="ticket-row">
              <span class="ticket-name">
                {{ entry.name }}
                <small v-if="!entry.hasPrice">precio en tienda</small>
              </span>
              <span class="ticket-amt">
                {{ entry.hasPrice ? formatMXN(entry.price * entry.quantity) : '—' }}
              </span>
              <div class="stepper ticket-step">
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
                <span class="addon-price">{{ formatMenuPrice(item) }}</span>
                <span class="addon-plus" aria-hidden="true">+</span>
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
              {{ copied ? '¡Copiado!' : 'Copiar resumen' }}
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
    </Transition>

    <Transition name="veil">
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
    </Transition>
  </main>
</template>

<style scoped>
.order-view {
  --ink: #0f1115;
  --paper: #f6f2ee;
  --paper-2: #fffaf3;
  --coffee: #6f4e37;
  --coffee-line: color-mix(in srgb, #6f4e37 32%, transparent);
  --sky: #8fd3ff;
  --jam: #d36c00;
  --jam-deep: #b85c00;

  position: relative;
  display: flex;
  flex-direction: column;
  min-height: max(0px, calc(100svh - var(--app-header-height) - var(--app-footer-min-height)));
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
  background: var(--ink);
  color: var(--paper);
  overscroll-behavior-y: auto;
  touch-action: pan-y;
}

/* ---------- Table context band ---------- */
.table-band {
  position: relative;
  overflow: hidden;
  padding: clamp(28px, 8vw, 56px) clamp(18px, 6vw, 40px) clamp(34px, 9vw, 64px);
  background:
    radial-gradient(120% 90% at 50% -10%, rgb(143 211 255 / 18%), transparent 60%),
    var(--ink);
  touch-action: pan-y;
}

.band-sprites {
  position: absolute;
  inset: 0;
  opacity: 0.16;
  pointer-events: none;
}

.band-sprite {
  position: absolute;
  width: var(--sprite-size);
  height: var(--sprite-size);
  object-fit: contain;
  transform: rotate(var(--sprite-rot));
  animation: sprite-bob var(--sprite-dur) ease-in-out infinite;
  animation-delay: var(--sprite-delay);
  will-change: transform;
}

@keyframes sprite-bob {
  0%,
  100% {
    transform: translateY(0) rotate(var(--sprite-rot));
  }

  50% {
    transform: translateY(-12px) rotate(calc(var(--sprite-rot) * -0.6));
  }
}

.band-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 3vw, 20px);
  align-items: center;
  width: min(100%, 720px);
  margin: 0 auto;
  text-align: center;
}

.band-eyebrow {
  margin: 0;
  color: var(--sky);
  font-size: clamp(0.78rem, 3.4vw, 0.95rem);
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.band-marquee {
  display: inline-flex;
  gap: clamp(12px, 4vw, 22px);
  align-items: center;
}

.band-mascot {
  display: grid;
  width: clamp(56px, 16vw, 84px);
  height: clamp(56px, 16vw, 84px);
  place-items: center;
  border-radius: 999px;
  background: var(--paper-2);
  box-shadow: 0 0 0 3px rgb(143 211 255 / 55%), 0 14px 30px rgb(0 0 0 / 35%);
}

.band-mascot img {
  width: 74%;
  height: 74%;
  object-fit: contain;
}

.band-mesa {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.mesa-kicker {
  color: color-mix(in srgb, var(--paper) 72%, transparent);
  font-size: clamp(0.82rem, 3.6vw, 1rem);
  font-weight: 800;
  letter-spacing: 0.02em;
}

.mesa-no {
  color: #ffffff;
  font-size: clamp(2.4rem, 12vw, 4.2rem);
  font-weight: 900;
  line-height: 0.92;
}

.band-note {
  max-width: 30rem;
  margin: 0;
  color: color-mix(in srgb, var(--paper) 78%, transparent);
  font-size: clamp(0.92rem, 3.6vw, 1.08rem);
  font-weight: 700;
  line-height: 1.35;
}

/* ---------- Sticky category rail ---------- */
.cat-rail {
  position: sticky;
  top: var(--app-header-height);
  z-index: 6;
  background: color-mix(in srgb, var(--ink) 92%, black);
  border-block: 1px solid rgb(143 211 255 / 22%);
  backdrop-filter: blur(8px);
}

.cat-rail-track {
  display: flex;
  gap: 8px;
  width: 100%;
  padding: 12px clamp(14px, 5vw, 28px);
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.cat-rail-track::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  flex: 0 0 auto;
  border: 1.5px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  padding: 9px 16px;
  background: transparent;
  color: color-mix(in srgb, var(--paper) 82%, transparent);
  font-size: 0.86rem;
  font-weight: 800;
  white-space: nowrap;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
}

.cat-chip.active {
  border-color: var(--sky);
  background: var(--sky);
  color: var(--ink);
}

/* ---------- Menu board (single cream surface) ---------- */
.board {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(26px, 6vw, 44px);
  margin: clamp(18px, 5vw, 28px) clamp(12px, 4vw, 28px) 0;
  padding: clamp(22px, 6vw, 44px) clamp(16px, 5vw, 40px) clamp(28px, 7vw, 48px);
  border: 2px solid var(--sky);
  border-radius: 14px;
  background:
    repeating-linear-gradient(
      135deg,
      transparent 0,
      transparent 22px,
      rgb(111 78 55 / 3.5%) 22px,
      rgb(111 78 55 / 3.5%) 23px
    ),
    var(--paper);
  color: var(--coffee);
  box-shadow: var(--shadow-panel);
  touch-action: pan-y;
}

.course {
  scroll-margin-top: calc(var(--app-header-height) + 72px);
}

.course-head {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin-bottom: clamp(12px, 3vw, 18px);
  padding-bottom: 10px;
  border-bottom: 3px solid var(--coffee);
}

.course-no {
  color: var(--jam);
  font-size: clamp(1rem, 4vw, 1.2rem);
  font-weight: 900;
  letter-spacing: 0.04em;
}

.course-name {
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.5rem, 6vw, 2.3rem);
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: -0.01em;
}

.dishes {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dish {
  display: flex;
  gap: clamp(12px, 3.5vw, 18px);
  align-items: center;
  padding: clamp(13px, 3.5vw, 18px) 0;
  border-bottom: 1px solid var(--coffee-line);
}

.dish:last-child {
  border-bottom: 0;
}

.dish-stamp {
  display: grid;
  flex: 0 0 auto;
  width: clamp(42px, 12vw, 52px);
  height: clamp(42px, 12vw, 52px);
  place-items: center;
  border: 2px dashed color-mix(in srgb, var(--coffee) 45%, transparent);
  border-radius: 999px;
  background: var(--paper-2);
  color: var(--coffee);
  font-size: 1.15rem;
  font-weight: 900;
  overflow: hidden;
}

.dish-stamp img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 999px;
}

.dish-body {
  flex: 1 1 auto;
  min-width: 0;
}

.dish-line {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.dish-name {
  flex: 0 1 auto;
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.02rem, 4.2vw, 1.2rem);
  font-weight: 800;
  line-height: 1.12;
}

.dish-leader {
  flex: 1 1 auto;
  min-width: 10px;
  transform: translateY(-0.3em);
  border-bottom: 2px dotted color-mix(in srgb, var(--coffee) 38%, transparent);
}

.dish-price {
  flex: 0 0 auto;
  color: var(--coffee);
  font-size: clamp(0.98rem, 4vw, 1.14rem);
  font-weight: 900;
  white-space: nowrap;
}

.dish-price.in-store {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.72;
}

.dish-desc {
  margin: 5px 0 0;
  color: color-mix(in srgb, var(--coffee) 88%, var(--ink) 12%);
  font-size: clamp(0.85rem, 3.5vw, 0.95rem);
  font-weight: 600;
  line-height: 1.3;
}

.dish-action {
  flex: 0 0 auto;
}

.add-btn {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: var(--jam);
  color: #ffffff;
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 6px 16px rgb(184 92 0 / 32%);
  transition: transform 140ms ease, background-color 140ms ease;
}

.add-btn:active {
  transform: scale(0.9);
  background: var(--jam-deep);
}

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: var(--ink);
  box-shadow: 0 6px 16px rgb(15 17 21 / 28%);
}

.step {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #ffffff;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
  transition: background-color 140ms ease, transform 120ms ease;
}

.step:active {
  transform: scale(0.86);
  background: rgb(255 255 255 / 14%);
}

.step-qty {
  min-width: 26px;
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 900;
  text-align: center;
}

.board-foot {
  margin: 6px 0 0;
  color: color-mix(in srgb, var(--coffee) 80%, transparent);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

/* ---------- Persistent order tab ---------- */
.tab-dock {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 8;
  padding: 12px clamp(12px, 4vw, 24px) calc(12px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, transparent, rgb(15 17 21 / 88%) 38%);
  pointer-events: none;
  touch-action: none;
}

.order-tab {
  display: flex;
  gap: 14px;
  align-items: center;
  width: min(100%, 620px);
  margin: 0 auto;
  padding: 12px 14px 12px 12px;
  border: 0;
  border-radius: 999px;
  background: var(--jam);
  color: #ffffff;
  box-shadow: 0 14px 34px rgb(0 0 0 / 42%);
  pointer-events: auto;
  touch-action: manipulation;
  transition: transform 160ms ease, background-color 200ms ease;
}

.order-tab:active {
  transform: translateY(2px) scale(0.99);
}

.order-tab.empty {
  background: #25282f;
}

.tab-badge {
  display: grid;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 999px;
  background: rgb(255 255 255 / 22%);
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 900;
}

.order-tab.empty .tab-badge {
  background: rgb(255 255 255 / 12%);
}

.tab-label {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  text-align: left;
}

.tab-label strong {
  font-size: 1.05rem;
  font-weight: 900;
}

.tab-label small {
  color: rgb(255 255 255 / 82%);
  font-size: 0.78rem;
  font-weight: 700;
}

.tab-total {
  flex: 0 0 auto;
  padding-right: 6px;
  font-size: 1.1rem;
  font-weight: 900;
}

.tab-total i {
  font-style: normal;
}

.order-tab.empty .tab-total {
  display: none;
}

/* ---------- Review sheet (comanda) ---------- */
.sheet-veil {
  position: fixed;
  inset: 0;
  z-index: 20;
  border: 0;
  background: rgb(7 9 12 / 58%);
  backdrop-filter: blur(4px);
}

.sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 21;
  display: flex;
  flex-direction: column;
  max-height: 92svh;
  padding: 10px clamp(16px, 5vw, 28px) 0;
  border-radius: 22px 22px 0 0;
  background: var(--paper);
  color: var(--coffee);
  box-shadow: 0 -18px 50px rgb(0 0 0 / 40%);
}

.sheet-grip {
  width: 46px;
  height: 5px;
  margin: 4px auto 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--coffee) 35%, transparent);
}

.sheet-head {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--coffee);
}

.sheet-eyebrow {
  margin: 0 0 2px;
  color: var(--jam);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.sheet-head h2 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.5rem, 6vw, 2rem);
  font-weight: 900;
  line-height: 1;
}

.sheet-mesa {
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--ink);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 900;
}

.sheet-close {
  border: 0;
  background: transparent;
  color: var(--coffee);
  font-size: 0.92rem;
  font-weight: 900;
  text-decoration: underline;
}

.sheet-scroll {
  flex: 1 1 auto;
  padding: 16px 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.sheet-empty {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 24px 12px;
  text-align: center;
}

.empty-mascot {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border-radius: 999px;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 2px var(--coffee-line);
}

.empty-mascot img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.sheet-empty p {
  max-width: 24rem;
  margin: 0;
  color: var(--ink);
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.35;
}

.ticket {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ticket-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px dashed var(--coffee-line);
}

.ticket-name {
  display: flex;
  flex-direction: column;
  color: var(--ink);
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.2;
}

.ticket-name small {
  color: color-mix(in srgb, var(--coffee) 78%, transparent);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.ticket-amt {
  color: var(--coffee);
  font-size: 1.05rem;
  font-weight: 900;
  text-align: right;
}

.ticket-step {
  grid-column: 1 / -1;
  justify-self: start;
}

.addons {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 2px dotted var(--coffee-line);
}

.addons-title {
  margin: 0 0 12px;
  color: var(--ink);
  font-size: 1.05rem;
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
  gap: 2px;
  width: 150px;
  padding: 12px 14px;
  border: 2px solid var(--coffee);
  border-radius: 14px;
  background: var(--paper-2);
  color: var(--ink);
  text-align: left;
}

.addon-name {
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.15;
}

.addon-price {
  color: var(--coffee);
  font-size: 0.84rem;
  font-weight: 900;
}

.addon-plus {
  align-self: flex-end;
  margin-top: 2px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: var(--jam);
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
}

.sheet-foot {
  flex: 0 0 auto;
  padding: 16px 0 calc(18px + env(safe-area-inset-bottom, 0px));
  border-top: 2px solid var(--coffee);
}

.tally {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.tally span {
  color: var(--coffee);
  font-size: 1rem;
  font-weight: 800;
}

.tally strong {
  color: var(--ink);
  font-size: clamp(1.4rem, 6vw, 1.9rem);
  font-weight: 900;
}

.tally i {
  font-style: normal;
}

.disclaimer {
  margin: 8px 0 0;
  color: color-mix(in srgb, var(--coffee) 82%, transparent);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.3;
}

.sheet-actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-top: 16px;
}

.sheet-actions button {
  border: 0;
  border-radius: 999px;
  padding: 16px 20px;
  font-size: 1rem;
  font-weight: 900;
}

.sheet-actions .ghost {
  border: 2px solid var(--coffee);
  background: transparent;
  color: var(--coffee);
}

.sheet-actions .primary {
  background: var(--jam);
  color: #ffffff;
  box-shadow: 0 10px 24px rgb(184 92 0 / 30%);
}

.sheet-actions button:disabled {
  opacity: 0.45;
}

.staff-link {
  width: 100%;
  margin-top: 12px;
  border: 0;
  background: transparent;
  color: var(--coffee);
  font-size: 0.92rem;
  font-weight: 900;
  text-decoration: underline;
}

.staff-link:disabled {
  opacity: 0.45;
}

/* ---------- Staff full-screen read view ---------- */
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
  font-size: 0.86rem;
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
  border-radius: 999px;
  padding: 16px;
  background: var(--sky);
  color: var(--ink);
  font-size: 1.05rem;
  font-weight: 900;
}

/* ---------- Transitions ---------- */
.pop-enter-active,
.pop-leave-active {
  transition: transform 160ms ease, opacity 160ms ease;
}

.pop-enter-from,
.pop-leave-to {
  transform: scale(0.6);
  opacity: 0;
}

.veil-enter-active,
.veil-leave-active {
  transition: opacity 240ms ease;
}

.veil-enter-from,
.veil-leave-to {
  opacity: 0;
}

.rise-enter-active,
.rise-leave-active {
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.rise-enter-from,
.rise-leave-to {
  transform: translateY(100%);
}

@media (min-width: 720px) {
  .band-mesa {
    align-items: flex-start;
  }

  .dish-stamp {
    width: 56px;
    height: 56px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .band-sprite {
    animation: none;
  }

  .order-tab:active,
  .add-btn:active,
  .step:active {
    transform: none;
  }

  .pop-enter-active,
  .pop-leave-active,
  .rise-enter-active,
  .rise-leave-active,
  .veil-enter-active,
  .veil-leave-active {
    transition: none;
  }
}
</style>
