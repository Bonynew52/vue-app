<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useConvexMutation, useConvexQuery } from 'convex-vue'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'
import {
  currentShift,
  formatShiftTime,
  nextShiftChange,
  shiftLabel,
  shiftStart,
} from '../lib/shift'
import { menuKeyRank, menuMetaForOrderItem } from '../data/menu'
import { formatMXN } from '../utils/formatPrice'
import mascotIcon from '../assets/brand/mascot.svg'

const router = useRouter()

/* Status labels. The pipeline is intentionally flat now: a table order is
   captured into Parrot and then closed when paid/served. Per-item counter
   pickup readiness is handled separately in the Barra panel, not as an
   order-wide stage. preparing/ready may still appear on legacy orders, so they
   are folded into the "en captura" treatment. */
const statusLabel = {
  new: 'Nuevo',
  capturing: 'En captura',
  preparing: 'En captura',
  ready: 'En captura',
  served: 'Cerrado',
  cancelled: 'Cancelado',
}

const session = ref(null)
const filter = ref('active')
const isBooting = ref(true)
const statusError = ref('')
const now = ref(Date.now())
const printRequestedAt = ref(null)
let clockTimer = null

const orderQuery = useConvexQuery(api.orders.list, () => ({ status: filter.value }))
const updateOrderStatus = useConvexMutation(api.orders.updateStatus)
const updatePickup = useConvexMutation(api.orders.updatePickupStatus)
const orders = computed(() => orderQuery.data.value || [])
const isLoading = computed(
  () =>
    orderQuery.isPending.value ||
    updateOrderStatus.isPending.value ||
    updatePickup.isPending.value,
)
const error = computed(() => statusError.value || orderQuery.error.value?.message || '')

/* ---------- Shift awareness ---------- */
const shift = computed(() => currentShift(new Date(now.value)))
const shiftBadge = computed(() => ({
  label: shiftLabel(shift.value),
  changeAt: formatShiftTime(nextShiftChange(new Date(now.value))),
}))

function sessionCreatedAt() {
  // Better Auth normally nests the session record under `session`, but be
  // tolerant of a flatter shape too. createdAt may be a Date or ISO string.
  const raw = session.value?.session?.createdAt ?? session.value?.createdAt
  if (!raw) {
    return null
  }
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : null
}

// If the signed-in session predates the current shift, the previous shift is
// still logged in: sign them out and send the incoming shift to the login.
// Guard on a known createdAt so a missing timestamp can't cause a sign-out loop
// (a fresh login always has createdAt >= the shift start).
async function enforceShift() {
  const created = sessionCreatedAt()
  if (created == null) {
    return false
  }
  if (created < shiftStart(new Date(now.value)).getTime()) {
    await authClient.signOut()
    await router.replace({ name: 'login', query: { reason: 'shift' } })
    return true
  }
  return false
}

/* ---------- Order buckets ---------- */
const activeOrders = computed(() =>
  orders.value.filter((order) => order.status !== 'served' && order.status !== 'cancelled'),
)

function byOldest(list) {
  return list.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}
function byNewest(list) {
  return list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

// New orders lead (they need Parrot entry first), then in-capture orders, each
// oldest-first so nothing waits too long.
const captureOrders = computed(() => {
  const rank = (status) => (status === 'new' ? 0 : 1)
  return activeOrders.value
    .slice()
    .sort(
      (a, b) =>
        rank(a.status) - rank(b.status) || new Date(a.createdAt) - new Date(b.createdAt),
    )
})
const newCount = computed(() => activeOrders.value.filter((o) => o.status === 'new').length)
const capturingCount = computed(() => activeOrders.value.filter((o) => o.status !== 'new').length)
const closedOrders = computed(() =>
  byNewest(orders.value.filter((o) => o.status === 'served' || o.status === 'cancelled')),
)

/* ---------- Barra / Pickup (counter items) ---------- */
const barraItems = computed(() => {
  const list = []
  byOldest(activeOrders.value).forEach((order) => {
    order.items.forEach((item) => {
      if (item.fulfillmentType === 'counter') {
        list.push({ order, item })
      }
    })
  })
  return list
})
const barraPending = computed(() =>
  barraItems.value.filter(({ item }) => item.pickupStatus !== 'ready'),
)
const barraReady = computed(() =>
  barraItems.value.filter(({ item }) => item.pickupStatus === 'ready'),
)

/* ---------- Parrot routing: group an order's lines by menu -> category ----------
   Order items only store a menuItemId + category name; the menu label and
   catalog ordering come from the generated catalog (legacy ids fall back to the
   id prefix). This mirrors how staff navigate Parrot to copy the order. */
function parrotGroupsFor(order) {
  const byMenu = new Map()

  order.items.forEach((item) => {
    const meta = menuMetaForOrderItem(item.menuItemId, item.categoryName)
    const menuKey = meta.menuKey || 'otros'

    if (!byMenu.has(menuKey)) {
      byMenu.set(menuKey, {
        menuKey,
        menuLabel: meta.menuLabel,
        rank: menuKeyRank(meta.menuKey),
        categories: new Map(),
      })
    }
    const menuGroup = byMenu.get(menuKey)
    const categoryName = meta.categoryName || 'Sin categoría'

    if (!menuGroup.categories.has(categoryName)) {
      menuGroup.categories.set(categoryName, {
        categoryName,
        sort: meta.categorySortIndex,
        items: [],
      })
    }
    menuGroup.categories.get(categoryName).items.push({ ...item, _sort: meta.itemSortIndex })
  })

  return [...byMenu.values()]
    .sort((a, b) => a.rank - b.rank || a.menuLabel.localeCompare(b.menuLabel))
    .map((menuGroup) => ({
      menuKey: menuGroup.menuKey,
      menuLabel: menuGroup.menuLabel,
      categories: [...menuGroup.categories.values()]
        .sort((a, b) => a.sort - b.sort || a.categoryName.localeCompare(b.categoryName))
        .map((category) => ({
          categoryName: category.categoryName,
          items: category.items.slice().sort((a, b) => a._sort - b._sort),
        })),
    }))
}

/* ---------- Formatting ---------- */
function money(cents, hasUnpriced = false) {
  return `${formatMXN((Number(cents) || 0) / 100)}${hasUnpriced ? '+' : ''}`
}

function timeLabel(value) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function minutesSince(value) {
  return Math.max(0, Math.floor((now.value - new Date(value).getTime()) / 60000))
}

function elapsedLabel(value) {
  const mins = minutesSince(value)
  if (mins < 1) {
    return 'recién'
  }
  if (mins < 60) {
    return `${mins} min`
  }
  const hours = Math.floor(mins / 60)
  return `${hours} h ${mins % 60} min`
}

function printTimestamp(value) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  )
}

/* Aging tiers drive the urgency accent on open tickets. */
function ageTier(order) {
  if (order.status === 'served' || order.status === 'cancelled') {
    return 'done'
  }
  const mins = minutesSince(order.createdAt)
  if (mins >= 15) {
    return 'late'
  }
  if (mins >= 8) {
    return 'warn'
  }
  return 'fresh'
}
const lateCount = computed(
  () => activeOrders.value.filter((order) => ageTier(order) === 'late').length,
)

function isCounter(item) {
  return item.fulfillmentType === 'counter'
}

/* ---------- Actions ---------- */
async function printDemoTicket() {
  printRequestedAt.value = Date.now()
  await nextTick()
  window.print()
}

function setFilter(nextFilter) {
  filter.value = nextFilter
}

async function updateStatus(order, status) {
  statusError.value = ''
  try {
    await updateOrderStatus.mutate({ orderId: order.id, status })
  } catch (updateError) {
    statusError.value = updateError.message
  }
}

async function setPickup(item, status) {
  statusError.value = ''
  try {
    await updatePickup.mutate({ orderItemId: item.id, status })
  } catch (pickupError) {
    statusError.value = pickupError.message
  }
}

async function loadSession() {
  const result = await authClient.getSession()
  session.value = result?.data || null
  if (!session.value) {
    await router.replace({ name: 'login' })
    return false
  }
  return true
}

async function signOut() {
  await authClient.signOut()
  await router.replace({ name: 'login' })
}

onMounted(async () => {
  const signedIn = await loadSession()
  if (signedIn) {
    const kicked = await enforceShift()
    if (!kicked) {
      clockTimer = window.setInterval(() => {
        now.value = Date.now()
        enforceShift()
      }, 15000)
    }
  }
  isBooting.value = false
})

onBeforeUnmount(() => {
  if (clockTimer) {
    window.clearInterval(clockTimer)
  }
})
</script>

<template>
  <main class="board">
    <header class="topbar">
      <div class="brand">
        <img class="brand__mark" :src="mascotIcon" alt="" />
        <div class="brand__text">
          <h1 class="brand__title">Pedidos de mesa</h1>
          <div class="brand__meta">
            <span class="sync" :class="{ 'is-busy': isLoading }">
              <i class="sync__dot" aria-hidden="true"></i>
              {{ isLoading ? 'Sincronizando' : 'En vivo' }}
            </span>
            <span class="shift" :class="`shift--${shift}`">
              {{ shiftBadge.label }} · cambia {{ shiftBadge.changeAt }}
            </span>
          </div>
        </div>
      </div>

      <div class="stats" aria-label="Resumen de pedidos">
        <span class="stat stat--new">
          <b>{{ newCount }}</b><span>Por capturar</span>
        </span>
        <span class="stat">
          <b>{{ capturingCount }}</b><span>En captura</span>
        </span>
        <span class="stat stat--barra">
          <b>{{ barraPending.length }}</b><span>Barra pend.</span>
        </span>
        <span class="stat stat--ready">
          <b>{{ barraReady.length }}</b><span>Listos barra</span>
        </span>
        <span v-if="lateCount > 0" class="stat stat--late">
          <b>{{ lateCount }}</b><span>Demorados</span>
        </span>
      </div>

      <div class="controls">
        <div class="segmented" role="group" aria-label="Filtro de pedidos">
          <button :class="{ active: filter === 'active' }" type="button" @click="setFilter('active')">
            Activos
          </button>
          <button :class="{ active: filter === 'all' }" type="button" @click="setFilter('all')">
            Todos
          </button>
        </div>
        <button class="print-demo" type="button" @click="printDemoTicket">Imprimir prueba</button>
        <a
          class="apk-download"
          href="/downloads/belly-imin-print-test.apk"
          download="belly-imin-print-test.apk"
        >
          APK impresión
        </a>
        <button class="signout" type="button" @click="signOut">Salir</button>
      </div>
    </header>

    <p v-if="error" class="board__error" role="alert">{{ error }}</p>

    <section v-if="isBooting" class="board__boot">Cargando tablero…</section>

    <!-- Nothing active: one calm, branded rest state. -->
    <section
      v-else-if="activeOrders.length === 0 && filter === 'active'"
      class="rest rest--full"
    >
      <img class="rest__mascot" :src="mascotIcon" alt="" />
      <h2>Todo bajo control</h2>
      <p>No hay pedidos de mesa por ahora. Los nuevos llegarán aquí en cuanto un cliente ordene.</p>
    </section>

    <div v-else class="board__body">
      <!-- MAIN: orders to copy into Parrot, grouped by menu -> category -> item -->
      <section class="capture">
        <header class="section-head">
          <h2 class="section-head__title">Pasar a Parrot</h2>
          <span class="section-head__hint">menú → categoría → producto → modificadores</span>
        </header>

        <div v-if="captureOrders.length > 0" class="capture__grid">
          <article
            v-for="order in captureOrders"
            :key="order.id"
            class="ticket"
            :class="[`age-${ageTier(order)}`, `is-${order.status}`]"
          >
            <header class="ticket__head">
              <div class="ticket__id">
                <span class="ticket__mesa">Mesa {{ order.tableId }}</span>
                <span v-if="order.customerName" class="ticket__name">{{ order.customerName }}</span>
              </div>
              <div class="ticket__tags">
                <span class="ticket__status" :class="`status-${order.status}`">
                  {{ statusLabel[order.status] || order.status }}
                </span>
                <span class="ticket__code">#{{ order.shortCode }}</span>
              </div>
            </header>

            <div class="ticket__meta">
              <span class="ticket__clock">{{ timeLabel(order.createdAt) }}</span>
              <span class="age" :class="`age-${ageTier(order)}`">{{ elapsedLabel(order.createdAt) }}</span>
            </div>

            <div class="parrot">
              <section v-for="menu in parrotGroupsFor(order)" :key="menu.menuKey" class="parrot__menu">
                <h3 class="parrot__menu-name">{{ menu.menuLabel }}</h3>
                <div v-for="cat in menu.categories" :key="cat.categoryName" class="parrot__cat">
                  <span class="parrot__cat-name">{{ cat.categoryName }}</span>
                  <ul class="lines">
                    <li v-for="item in cat.items" :key="item.id" class="line">
                      <span class="qty">{{ item.quantity }}</span>
                      <div class="line__body">
                        <span class="line__name">
                          {{ item.name }}
                          <span v-if="isCounter(item)" class="line__pill">Barra</span>
                        </span>
                        <span
                          v-for="(modifier, mIndex) in item.modifiers"
                          :key="`${item.id}-mod-${mIndex}`"
                          class="line__mod"
                        >
                          <em class="line__mod-group">{{ modifier.groupName }}:</em>
                          {{ modifier.optionName }}
                          <b v-if="modifier.priceDeltaCents > 0">+{{ money(modifier.priceDeltaCents) }}</b>
                        </span>
                        <small v-if="item.note" class="line__note">“{{ item.note }}”</small>
                      </div>
                      <span class="line__price">
                        {{ item.lineTotalCents == null ? 'Tienda' : money(item.lineTotalCents) }}
                      </span>
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            <div class="ticket__foot">
              <span>{{ order.itemCount }} artículo{{ order.itemCount === 1 ? '' : 's' }}</span>
              <strong>{{ money(order.subtotalCents, order.hasUnpriced) }}</strong>
            </div>

            <div class="ticket__actions">
              <button
                v-if="order.status === 'new'"
                type="button"
                class="btn btn--capture"
                @click="updateStatus(order, 'capturing')"
              >
                Capturar en Parrot
              </button>
              <template v-else>
                <button type="button" class="btn btn--close" @click="updateStatus(order, 'served')">
                  Cerrar · pagado
                </button>
                <button
                  type="button"
                  class="btn btn--ghost"
                  title="Regresar a nuevo"
                  @click="updateStatus(order, 'new')"
                >
                  ← Nuevo
                </button>
              </template>
              <button
                type="button"
                class="btn btn--ghost btn--danger"
                title="Cancelar pedido"
                @click="updateStatus(order, 'cancelled')"
              >
                Cancelar
              </button>
            </div>
          </article>
        </div>

        <div v-else class="rest rest--inline">
          <img class="rest__mascot rest__mascot--sm" :src="mascotIcon" alt="" />
          <p>Sin pedidos por capturar.</p>
        </div>

        <!-- Closed orders, only in the "Todos" filter, de-emphasized. -->
        <section v-if="filter === 'all' && closedOrders.length > 0" class="closed">
          <header class="section-head section-head--sub">
            <h3 class="section-head__title">Cerrados / cancelados</h3>
            <span class="section-head__count">{{ closedOrders.length }}</span>
          </header>
          <div class="closed__grid">
            <article v-for="order in closedOrders" :key="order.id" class="closed-row" :class="`is-${order.status}`">
              <div class="closed-row__id">
                <span class="closed-row__mesa">Mesa {{ order.tableId }}</span>
                <span class="closed-row__code">#{{ order.shortCode }}</span>
              </div>
              <span class="closed-row__status" :class="`status-${order.status}`">
                {{ statusLabel[order.status] || order.status }}
              </span>
              <span class="closed-row__total">{{ money(order.subtotalCents, order.hasUnpriced) }}</span>
              <button type="button" class="btn btn--ghost btn--sm" @click="updateStatus(order, 'new')">
                Reabrir
              </button>
            </article>
          </div>
        </section>
      </section>

      <!-- SIDE: Barra / Pickup counter items -->
      <aside class="barra" aria-label="Barra y pickup">
        <header class="section-head">
          <h2 class="section-head__title">
            <i class="barra__dot" aria-hidden="true"></i>
            Barra / Pickup
          </h2>
          <span class="section-head__count">{{ barraItems.length }}</span>
        </header>

        <p class="barra__hint">Bebidas, shakes y repostería que el cliente recoge en barra.</p>

        <div v-if="barraItems.length === 0" class="barra__empty">
          Sin artículos de barra en pedidos activos.
        </div>

        <template v-else>
          <h3 v-if="barraPending.length > 0" class="barra__group-title">Pendientes</h3>
          <article
            v-for="{ order, item } in barraPending"
            :key="item.id"
            class="pickup"
          >
            <div class="pickup__head">
              <span class="pickup__where">Mesa {{ order.tableId }} · #{{ order.shortCode }}</span>
              <span class="age age--sm" :class="`age-${ageTier(order)}`">{{ elapsedLabel(order.createdAt) }}</span>
            </div>
            <div class="pickup__line">
              <span class="qty qty--sm">{{ item.quantity }}</span>
              <div class="pickup__body">
                <span class="pickup__name">{{ item.name }}</span>
                <span
                  v-for="(modifier, mIndex) in item.modifiers"
                  :key="`${item.id}-bmod-${mIndex}`"
                  class="pickup__mod"
                >
                  {{ modifier.optionName }}
                </span>
              </div>
            </div>
            <button type="button" class="btn btn--ready" @click="setPickup(item, 'ready')">
              Listo para recoger
            </button>
          </article>

          <h3 v-if="barraReady.length > 0" class="barra__group-title barra__group-title--ready">
            Listos para recoger
          </h3>
          <article
            v-for="{ order, item } in barraReady"
            :key="`ready-${item.id}`"
            class="pickup pickup--ready"
          >
            <div class="pickup__head">
              <span class="pickup__where">Mesa {{ order.tableId }} · #{{ order.shortCode }}</span>
              <span class="pickup__ready-tag">Listo</span>
            </div>
            <div class="pickup__line">
              <span class="qty qty--sm">{{ item.quantity }}</span>
              <div class="pickup__body">
                <span class="pickup__name">{{ item.name }}</span>
              </div>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" @click="setPickup(item, 'pending')">
              Deshacer
            </button>
          </article>
        </template>
      </aside>
    </div>
  </main>

  <section class="print-ticket" aria-hidden="true">
    <header class="print-ticket__header">
      <strong>Belly Monster Bites</strong>
      <span>Prueba de impresion</span>
    </header>

    <dl class="print-ticket__meta">
      <div>
        <dt>Mesa</dt>
        <dd>Demo</dd>
      </div>
      <div>
        <dt>Orden</dt>
        <dd>#PRINT</dd>
      </div>
      <div>
        <dt>Hora</dt>
        <dd>{{ printTimestamp(printRequestedAt || now) }}</dd>
      </div>
      <div>
        <dt>Impresora</dt>
        <dd>InnerPrinter / 80mm</dd>
      </div>
    </dl>

    <ul class="print-ticket__items">
      <li>
        <span>1</span>
        <div class="print-ticket__item">
          <strong>Cookie demo</strong>
          <span class="print-ticket__mod">Extra chispas +$0.00</span>
        </div>
        <em>$0.00</em>
      </li>
      <li>
        <span>1</span>
        <div class="print-ticket__item">
          <strong>Cafe demo</strong>
          <span class="print-ticket__mod">Leche de almendra</span>
          <span class="print-ticket__mod">Sin azucar</span>
        </div>
        <em>$0.00</em>
      </li>
    </ul>

    <p class="print-ticket__note">
      Si este ticket sale en el kiosco, Chrome puede imprimir desde el tablero.
    </p>
    <footer>Generado desde /ordenes</footer>
  </section>
</template>

<style scoped>
.board {
  --bg: #fff8ef;
  --surface: #ffffff;
  --cream-2: #fdf3e2;
  --line: #efe1cb;
  --line-soft: #f5ecda;
  --ink: #2e1c12;
  --coffee: #7e4743;
  --muted: #9c8473;
  --faint: #c2ad97;
  --orange: #d36c00;
  --orange-press: #b85e00;
  --green: #1f9d57;
  --green-press: #18854a;
  --yellow: #f8d94a;
  --danger: #c0392b;

  --c-new: #d36c00;
  --c-capturing: #7e4743;
  --c-served: #9c8473;
  --c-cancelled: #c0392b;

  display: flex;
  flex-direction: column;
  min-height: 100svh;
  max-height: 100svh;
  background:
    radial-gradient(140% 80% at 88% -20%, rgb(248 217 74 / 22%) 0%, rgb(248 217 74 / 0%) 46%),
    var(--bg);
  color: var(--ink);
  font-family: 'Archivo', system-ui, -apple-system, sans-serif;
}

/* ---------- Top bar ---------- */
.topbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: max(12px, env(safe-area-inset-top)) clamp(16px, 2.4vw, 28px) 12px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 80%, #fff);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: auto;
}

.brand__mark {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  filter: drop-shadow(0 2px 4px rgb(126 71 67 / 20%));
}

.brand__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
}

.brand__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 3px;
}

.sync {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 700;
}

.sync__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
}

.sync.is-busy {
  color: var(--green);
}

.sync.is-busy .sync__dot {
  animation: pulse 1.2s ease-in-out infinite;
}

.shift {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--coffee);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.shift--morning {
  border-color: rgb(198 133 10 / 36%);
  background: rgb(248 217 74 / 20%);
  color: #8a5e06;
}

.shift--afternoon {
  border-color: rgb(126 71 67 / 32%);
  background: rgb(126 71 67 / 9%);
  color: var(--coffee);
}

/* ---------- Stats ---------- */
.stats {
  display: flex;
  gap: 10px;
}

.stat {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 62px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.2;
  text-align: center;
}

.stat b {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.stat--new {
  border-color: rgb(211 108 0 / 35%);
  background: rgb(211 108 0 / 7%);
}

.stat--new b {
  color: var(--orange);
}

.stat--barra b {
  color: var(--coffee);
}

.stat--ready b {
  color: var(--green);
}

.stat--late {
  border-color: rgb(192 57 43 / 38%);
  background: rgb(192 57 43 / 8%);
}

.stat--late b {
  color: var(--danger);
}

/* ---------- Controls ---------- */
.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.segmented {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
}

.segmented button {
  min-height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-weight: 700;
}

.segmented button.active {
  background: var(--coffee);
  color: #fff;
}

.signout {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  color: var(--ink);
  font-weight: 700;
}

.signout:hover {
  background: var(--cream-2);
}

.print-demo {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 11px;
  background: var(--ink);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 3px 10px rgb(46 28 18 / 18%);
}

.print-demo:hover {
  background: var(--coffee);
}

.apk-download {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid rgb(17 97 73 / 28%);
  border-radius: 11px;
  background: #e8f3ee;
  color: #116149;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.apk-download:hover {
  background: #d8ece4;
}

/* ---------- Errors / boot ---------- */
.board__error {
  margin: 12px clamp(16px, 2.4vw, 28px) 0;
  padding: 11px 14px;
  border: 1px solid rgb(192 57 43 / 26%);
  border-radius: 10px;
  background: rgb(192 57 43 / 8%);
  color: var(--danger);
  font-weight: 700;
}

.board__boot {
  margin: auto;
  color: var(--muted);
  font-weight: 600;
}

/* ---------- Body: capture column + barra panel ---------- */
.board__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(300px, 26vw, 360px);
  gap: clamp(16px, 2.2vw, 28px);
  flex: 1 1 auto;
  min-height: 0;
  padding: clamp(14px, 1.8vw, 22px) clamp(16px, 2.4vw, 28px) max(18px, env(safe-area-inset-bottom));
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-head--sub {
  margin-top: 18px;
}

.section-head__title {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--coffee);
}

.section-head__hint {
  color: var(--faint);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.section-head__count {
  margin-left: auto;
  color: var(--faint);
  font-size: 0.85rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* ---------- Capture column ---------- */
.capture {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.capture__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  align-content: start;
}

.ticket {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-top: 4px solid var(--c-new);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 2px 4px rgb(46 28 18 / 5%), 0 10px 26px rgb(46 28 18 / 6%);
}

.ticket.is-capturing,
.ticket.is-preparing,
.ticket.is-ready {
  border-top-color: var(--c-capturing);
}

.ticket.age-late {
  box-shadow: 0 2px 4px rgb(46 28 18 / 5%), 0 0 0 2px rgb(192 57 43 / 22%);
}

.ticket__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 15px 6px;
}

.ticket__id {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ticket__mesa {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1;
}

.ticket__name {
  margin-top: 3px;
  color: var(--coffee);
  font-size: 0.9rem;
  font-weight: 700;
}

.ticket__tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex: 0 0 auto;
}

.ticket__status {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.status-new {
  background: rgb(211 108 0 / 12%);
  color: var(--orange);
}

.status-capturing,
.status-preparing,
.status-ready {
  background: rgb(126 71 67 / 12%);
  color: var(--coffee);
}

.status-served {
  background: rgb(31 157 87 / 12%);
  color: var(--green-press);
}

.status-cancelled {
  background: rgb(192 57 43 / 12%);
  color: var(--danger);
}

.ticket__code {
  color: var(--faint);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  font-weight: 600;
}

.ticket__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 15px 8px;
}

.ticket__clock {
  color: var(--faint);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  font-weight: 600;
}

.age {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--cream-2);
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.age.age--sm {
  padding: 2px 7px;
  font-size: 0.72rem;
}

.age.age-warn {
  background: rgb(198 133 10 / 14%);
  color: #9a6705;
}

.age.age-late {
  background: rgb(192 57 43 / 14%);
  color: var(--danger);
  animation: pulse 1.6s ease-in-out infinite;
}

/* ---------- Parrot path ---------- */
.parrot {
  border-top: 1px solid var(--line-soft);
}

.parrot__menu {
  padding: 8px 15px 4px;
  border-bottom: 1px solid var(--line-soft);
}

.parrot__menu:last-child {
  border-bottom: 0;
}

.parrot__menu-name {
  margin: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--orange);
}

.parrot__cat {
  margin-bottom: 6px;
}

.parrot__cat-name {
  display: block;
  margin: 4px 0 2px;
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--muted);
}

.lines {
  margin: 0;
  padding: 0;
  list-style: none;
}

.line {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 5px 0;
}

.qty {
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  border-radius: 8px;
  background: #f4e7d6;
  color: var(--coffee);
  font-weight: 800;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.qty--sm {
  min-width: 24px;
  height: 22px;
  font-size: 0.82rem;
}

.line__name {
  display: block;
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.25;
}

.line__pill {
  display: inline-block;
  margin-left: 5px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgb(126 71 67 / 12%);
  color: var(--coffee);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  vertical-align: middle;
}

.line__mod {
  display: block;
  margin-top: 2px;
  padding-left: 11px;
  border-left: 2px solid var(--line);
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.3;
}

.line__mod-group {
  font-style: normal;
  color: var(--muted);
  font-weight: 700;
}

.line__mod b {
  font-weight: 700;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.line__note {
  display: block;
  margin-top: 3px;
  color: var(--orange);
  font-size: 0.82rem;
  font-weight: 600;
}

.line__price {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ticket__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 15px;
  border-top: 1px solid var(--line-soft);
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.ticket__foot strong {
  color: var(--ink);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1.05rem;
}

.ticket__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 13px 13px;
}

/* ---------- Buttons ---------- */
.btn {
  min-height: 46px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 120ms ease, transform 80ms ease;
}

.btn:active {
  transform: translateY(1px);
}

.btn--capture {
  flex: 1 1 auto;
  min-height: 52px;
  border: 0;
  background: var(--orange);
  color: #fff;
  font-size: 1rem;
  box-shadow: 0 4px 14px rgb(211 108 0 / 28%);
}

.btn--capture:hover {
  background: var(--orange-press);
}

.btn--close {
  flex: 1 1 auto;
  border: 0;
  background: var(--green);
  color: #fff;
  box-shadow: 0 4px 12px rgb(31 157 87 / 26%);
}

.btn--close:hover {
  background: var(--green-press);
}

.btn--ready {
  width: 100%;
  border: 0;
  background: var(--green);
  color: #fff;
  box-shadow: 0 3px 10px rgb(31 157 87 / 24%);
}

.btn--ready:hover {
  background: var(--green-press);
}

.btn--ghost {
  border-color: var(--line);
  background: var(--surface);
  color: var(--muted);
}

.btn--ghost:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.btn--sm {
  min-height: 38px;
  padding: 0 12px;
  font-size: 0.84rem;
}

.btn--danger {
  color: var(--danger);
}

.btn--danger:hover {
  border-color: rgb(192 57 43 / 42%);
  background: rgb(192 57 43 / 7%);
  color: var(--danger);
}

/* ---------- Closed orders ---------- */
.closed {
  margin-top: 6px;
}

.closed__grid {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.closed-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 13px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgb(253 243 226 / 55%);
}

.closed-row__id {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.closed-row__mesa {
  font-weight: 800;
}

.closed-row__code {
  color: var(--faint);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8rem;
}

.closed-row__status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}

.closed-row__total {
  margin-left: auto;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 700;
  color: var(--muted);
}

/* ---------- Barra panel ---------- */
.barra {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-left: clamp(16px, 2.2vw, 28px);
  border-left: 1px solid var(--line);
  overflow-y: auto;
}

.barra__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--green);
}

.barra__hint {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.35;
}

.barra__empty {
  padding: 22px 16px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  background: rgb(253 243 226 / 60%);
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 600;
  text-align: center;
}

.barra__group-title {
  margin: 14px 0 8px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.barra__group-title:first-child {
  margin-top: 0;
}

.barra__group-title--ready {
  color: var(--green-press);
}

.pickup {
  margin-bottom: 8px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--green);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(46 28 18 / 4%);
}

.pickup--ready {
  border-left-color: var(--c-served);
  background: rgb(31 157 87 / 5%);
}

.pickup__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}

.pickup__where {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--coffee);
}

.pickup__ready-tag {
  padding: 2px 9px;
  border-radius: 999px;
  background: rgb(31 157 87 / 14%);
  color: var(--green-press);
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.pickup__line {
  display: flex;
  gap: 9px;
  align-items: start;
  margin-bottom: 9px;
}

.pickup__body {
  min-width: 0;
}

.pickup__name {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.25;
}

.pickup__mod {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 600;
}

/* ---------- Rest / empty states ---------- */
.rest {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--muted);
}

.rest--full {
  margin: auto;
  max-width: 420px;
  padding: 30px 24px;
}

.rest--inline {
  gap: 10px;
  margin-top: 6px;
  padding: 26px 20px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  background: rgb(253 243 226 / 60%);
}

.rest__mascot {
  width: 96px;
  height: 96px;
  margin-bottom: 14px;
  filter: drop-shadow(0 6px 14px rgb(126 71 67 / 18%));
}

.rest__mascot--sm {
  width: 54px;
  height: 54px;
  margin-bottom: 0;
  opacity: 0.92;
}

.rest h2 {
  margin: 0 0 6px;
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--ink);
}

.rest p {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.45;
}

.rest--inline p {
  font-size: 0.9rem;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sync.is-busy .sync__dot,
  .age.age-late {
    animation: none;
  }
}

/* ---------- Responsive: stack barra under the capture column ---------- */
@media (max-width: 920px) {
  .board {
    max-height: none;
  }

  .board__body {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .capture {
    overflow-y: visible;
  }

  .barra {
    padding-left: 0;
    border-left: 0;
    border-top: 1px solid var(--line);
    padding-top: 18px;
    overflow-y: visible;
  }
}

@media (max-width: 560px) {
  .brand {
    width: 100%;
  }

  .stats {
    flex: 1 1 auto;
    flex-wrap: wrap;
  }

  .stat {
    flex: 1 1 0;
  }

  .controls {
    width: 100%;
  }

  .segmented {
    flex: 1 1 auto;
  }

  .segmented button {
    flex: 1 1 0;
  }

  .print-demo,
  .apk-download,
  .signout {
    flex: 1 1 0;
  }

  .capture__grid {
    grid-template-columns: 1fr;
  }
}

.print-ticket {
  display: none;
}

@media print {
  @page {
    size: 80mm auto;
    margin: 4mm;
  }

  :global(html),
  :global(body),
  :global(#app) {
    min-width: 0;
    min-height: 0;
    background: #fff;
  }

  .board {
    display: none;
  }

  .print-ticket {
    display: block;
    width: 72mm;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 10pt;
    line-height: 1.25;
  }

  .print-ticket__header {
    display: grid;
    gap: 1mm;
    padding-bottom: 3mm;
    border-bottom: 1px dashed #000;
    text-align: center;
  }

  .print-ticket__header strong {
    font-size: 13pt;
    text-transform: uppercase;
  }

  .print-ticket__header span,
  .print-ticket footer {
    font-size: 8.5pt;
  }

  .print-ticket__meta {
    display: grid;
    gap: 1mm;
    margin: 3mm 0;
    padding-bottom: 3mm;
    border-bottom: 1px dashed #000;
  }

  .print-ticket__meta div {
    display: flex;
    justify-content: space-between;
    gap: 4mm;
  }

  .print-ticket__meta dt,
  .print-ticket__meta dd {
    margin: 0;
  }

  .print-ticket__items {
    margin: 0;
    padding: 0 0 3mm;
    border-bottom: 1px dashed #000;
    list-style: none;
  }

  .print-ticket__items li {
    display: grid;
    grid-template-columns: 8mm 1fr auto;
    gap: 2mm;
    padding: 1mm 0;
  }

  .print-ticket__items strong {
    font-weight: 700;
  }

  .print-ticket__item {
    display: block;
  }

  .print-ticket__mod {
    display: block;
    padding-left: 4mm;
    font-size: 9pt;
  }

  .print-ticket__mod::before {
    content: "› ";
  }

  .print-ticket__items em {
    font-style: normal;
  }

  .print-ticket__note {
    margin: 3mm 0;
    font-size: 8.5pt;
  }

  .print-ticket footer {
    padding-top: 2mm;
    text-align: center;
  }
}
</style>
