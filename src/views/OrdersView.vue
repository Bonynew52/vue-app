<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useConvexMutation, useConvexQuery } from 'convex-vue'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'
import { formatMXN } from '../utils/formatPrice'
import mascotIcon from '../assets/brand/mascot.svg'

const router = useRouter()

/* Pipeline metadata: label + the one-tap forward move for each state. */
const flow = {
  new: { label: 'Nuevos', next: 'capturing', nextLabel: 'Capturar en Parrot' },
  capturing: { label: 'En Parrot', next: 'preparing', nextLabel: 'A preparar' },
  preparing: { label: 'Preparando', next: 'ready', nextLabel: 'Marcar listo' },
  ready: { label: 'Listos', next: 'served', nextLabel: 'Entregado' },
  served: { label: 'Servidos', next: null, nextLabel: '' },
  cancelled: { label: 'Cancelados', next: null, nextLabel: '' },
}

const prevState = {
  capturing: 'new',
  preparing: 'capturing',
  ready: 'preparing',
  served: 'ready',
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
const orders = computed(() => orderQuery.data.value || [])
const isLoading = computed(() => orderQuery.isPending.value || updateOrderStatus.isPending.value)
const error = computed(() => statusError.value || orderQuery.error.value?.message || '')

const activeOrders = computed(() =>
  orders.value.filter((order) => order.status !== 'served' && order.status !== 'cancelled'),
)
const readyCount = computed(() => orders.value.filter((order) => order.status === 'ready').length)
const lateCount = computed(
  () => activeOrders.value.filter((order) => ageTier(order) === 'late').length,
)

function byOldest(list) {
  return list.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

function ordersOf(status) {
  return byOldest(orders.value.filter((order) => order.status === status))
}

/* New orders are the job: they dominate the main column. */
const newOrders = computed(() => ordersOf('new'))

const railStatuses = computed(() =>
  filter.value === 'all'
    ? ['capturing', 'preparing', 'ready', 'served', 'cancelled']
    : ['capturing', 'preparing', 'ready'],
)

const railGroups = computed(() =>
  railStatuses.value.map((status) => ({
    status,
    label: flow[status].label,
    orders: ordersOf(status),
  })),
)

function money(cents, hasUnpriced = false) {
  return `${formatMXN((Number(cents) || 0) / 100)}${hasUnpriced ? '+' : ''}`
}

function timeLabel(value) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
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
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function printDemoTicket() {
  printRequestedAt.value = Date.now()
  await nextTick()
  window.print()
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

async function loadSession() {
  const result = await authClient.getSession()
  session.value = result?.data || null

  if (!session.value) {
    await router.replace({ name: 'login' })
  }
}

async function setFilter(nextFilter) {
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

async function signOut() {
  await authClient.signOut()
  await router.replace({ name: 'login' })
}

onMounted(async () => {
  await loadSession()
  if (session.value) {
    clockTimer = window.setInterval(() => {
      now.value = Date.now()
    }, 15000)
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
          <span class="sync" :class="{ 'is-busy': isLoading }">
            <i class="sync__dot" aria-hidden="true"></i>
            {{ isLoading ? 'Sincronizando' : 'En vivo' }}
          </span>
        </div>
      </div>

      <div class="stats" aria-label="Resumen de pedidos">
        <span class="stat stat--new">
          <b>{{ newOrders.length }}</b><span>Por capturar</span>
        </span>
        <span class="stat">
          <b>{{ activeOrders.length }}</b><span>Activos</span>
        </span>
        <span class="stat stat--ready">
          <b>{{ readyCount }}</b><span>Listos</span>
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
        <button class="print-demo" type="button" @click="printDemoTicket">
          Imprimir prueba
        </button>
        <button class="signout" type="button" @click="signOut">Salir</button>
      </div>
    </header>

    <p v-if="error" class="board__error" role="alert">{{ error }}</p>

    <section v-if="isBooting" class="board__boot">Cargando tablero…</section>

    <!-- Calm shift: nothing active. One intentional, branded rest state. -->
    <section
      v-else-if="activeOrders.length === 0 && filter === 'active'"
      class="rest rest--full"
    >
      <img class="rest__mascot" :src="mascotIcon" alt="" />
      <h2>Todo bajo control</h2>
      <p>No hay pedidos de mesa por ahora. Los nuevos llegarán aquí en cuanto un cliente ordene.</p>
    </section>

    <div v-else class="board__body">
      <!-- HERO: new orders that need capturing into Parrot -->
      <section class="queue">
        <header class="section-head">
          <h2 class="section-head__title">Por capturar</h2>
          <span class="section-head__badge" :class="{ 'is-hot': newOrders.length > 0 }">
            {{ newOrders.length }}
          </span>
        </header>

        <div v-if="newOrders.length > 0" class="queue__grid">
          <article
            v-for="order in newOrders"
            :key="order.id"
            class="card"
            :class="`age-${ageTier(order)}`"
          >
            <header class="card__head">
              <span class="card__mesa">Mesa {{ order.tableId }}</span>
              <span class="card__code">#{{ order.shortCode }}</span>
            </header>

            <div class="card__meta">
              <span class="card__clock">{{ timeLabel(order.createdAt) }}</span>
              <span class="age" :class="`age-${ageTier(order)}`">{{ elapsedLabel(order.createdAt) }}</span>
            </div>

            <ul class="items">
              <li v-for="item in order.items" :key="item.id">
                <span class="qty">{{ item.quantity }}</span>
                <span class="items__body">
                  <strong>{{ item.name }}</strong>
                  <small v-if="item.note">{{ item.note }}</small>
                </span>
                <span class="items__line">
                  {{ item.lineTotalCents == null ? 'Tienda' : money(item.lineTotalCents) }}
                </span>
              </li>
            </ul>

            <div class="card__foot">
              <span>{{ order.itemCount }} artículo{{ order.itemCount === 1 ? '' : 's' }}</span>
              <strong>{{ money(order.subtotalCents, order.hasUnpriced) }}</strong>
            </div>

            <div class="card__actions">
              <button type="button" class="capture" @click="updateStatus(order, 'capturing')">
                Capturar en Parrot
              </button>
              <button type="button" class="ghost ghost--danger" @click="updateStatus(order, 'cancelled')">
                Cancelar
              </button>
            </div>
          </article>
        </div>

        <div v-else class="rest rest--inline">
          <img class="rest__mascot rest__mascot--sm" :src="mascotIcon" alt="" />
          <p>Sin pedidos nuevos por capturar.</p>
        </div>
      </section>

      <!-- RAIL: everything already in motion, compact -->
      <aside class="rail" aria-label="Pedidos en proceso">
        <section
          v-for="group in railGroups"
          :key="group.status"
          class="rail__group"
          :class="`lane--${group.status}`"
        >
          <header class="section-head section-head--rail">
            <span class="section-head__title">
              <i class="lane__dot" aria-hidden="true"></i>
              {{ group.label }}
            </span>
            <span class="section-head__count">{{ group.orders.length }}</span>
          </header>

          <article
            v-for="order in group.orders"
            :key="order.id"
            class="chip"
            :class="`age-${ageTier(order)}`"
          >
            <div class="chip__top">
              <span class="chip__mesa">Mesa {{ order.tableId }}</span>
              <span class="age age--sm" :class="`age-${ageTier(order)}`">
                {{ elapsedLabel(order.createdAt) }}
              </span>
            </div>
            <div class="chip__sub">
              <span class="chip__code">#{{ order.shortCode }}</span>
              <span>{{ order.itemCount }} art · {{ money(order.subtotalCents, order.hasUnpriced) }}</span>
            </div>
            <div class="chip__actions">
              <button
                v-if="flow[order.status].next"
                type="button"
                class="advance"
                @click="updateStatus(order, flow[order.status].next)"
              >
                {{ flow[order.status].nextLabel }}
              </button>
              <button
                v-if="order.status === 'served' || order.status === 'cancelled'"
                type="button"
                class="ghost ghost--sm"
                @click="updateStatus(order, 'new')"
              >
                Reabrir
              </button>
              <button
                v-if="prevState[order.status]"
                type="button"
                class="ghost ghost--sm"
                @click="updateStatus(order, prevState[order.status])"
                aria-label="Regresar al estado anterior"
                title="Regresar"
              >
                ←
              </button>
              <button
                v-if="order.status !== 'cancelled' && order.status !== 'served'"
                type="button"
                class="ghost ghost--sm ghost--danger"
                @click="updateStatus(order, 'cancelled')"
                aria-label="Cancelar pedido"
                title="Cancelar"
              >
                ✕
              </button>
            </div>
          </article>
        </section>
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
        <strong>Cookie demo</strong>
        <em>$0.00</em>
      </li>
      <li>
        <span>1</span>
        <strong>Cafe demo</strong>
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

  /* Status hues */
  --c-new: #d36c00;
  --c-capturing: #7e4743;
  --c-preparing: #c6850a;
  --c-ready: #1f9d57;
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
  font-size: clamp(1.2rem, 1.9vw, 1.45rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.05;
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

/* ---------- Body: focus + rail ---------- */
.board__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(300px, 28vw, 380px);
  gap: clamp(16px, 2.2vw, 28px);
  flex: 1 1 auto;
  min-height: 0;
  padding: clamp(16px, 2vw, 24px) clamp(16px, 2.4vw, 28px) max(18px, env(safe-area-inset-bottom));
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
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

.section-head__badge {
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 9px;
  background: var(--cream-2);
  color: var(--muted);
  font-size: 0.95rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.section-head__badge.is-hot {
  background: var(--orange);
  color: #fff;
  box-shadow: 0 3px 10px rgb(211 108 0 / 32%);
}

/* ---------- Queue (hero cards) ---------- */
.queue {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.queue__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
  align-content: start;
  overflow-y: auto;
  padding-bottom: 4px;
}

.card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-top: 4px solid var(--c-new);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 2px 4px rgb(46 28 18 / 5%), 0 10px 26px rgb(46 28 18 / 6%);
}

.card.age-warn {
  border-top-color: var(--c-preparing);
}

.card.age-late {
  border-top-color: var(--danger);
  box-shadow: 0 2px 4px rgb(46 28 18 / 5%), 0 0 0 2px rgb(192 57 43 / 22%);
}

.card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 15px 4px;
}

.card__mesa {
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}

.card__code {
  color: var(--faint);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.86rem;
  font-weight: 600;
}

.card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 15px 10px;
}

.card__clock {
  color: var(--faint);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  font-weight: 600;
}

/* Age badge */
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

.items {
  margin: 0;
  padding: 4px 15px;
  list-style: none;
  border-top: 1px solid var(--line-soft);
}

.items li {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  gap: 11px;
  align-items: start;
  padding: 8px 0;
  border-bottom: 1px solid var(--line-soft);
}

.items li:last-child {
  border-bottom: 0;
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

.items__body strong {
  display: block;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.25;
}

.items__body small {
  display: block;
  margin-top: 2px;
  color: var(--orange);
  font-size: 0.82rem;
  font-weight: 600;
}

.items__line {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.card__foot {
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

.card__foot strong {
  color: var(--ink);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1.05rem;
}

.card__actions {
  display: flex;
  gap: 8px;
  padding: 2px 13px 13px;
}

.capture {
  flex: 1 1 auto;
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background: var(--orange);
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  box-shadow: 0 4px 14px rgb(211 108 0 / 28%);
  transition: background-color 120ms ease, transform 80ms ease;
}

.capture:hover {
  background: var(--orange-press);
}

.capture:active {
  transform: translateY(1px);
}

/* ---------- Rail (compact, in motion) ---------- */
.rail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  padding-left: clamp(16px, 2.2vw, 28px);
  border-left: 1px solid var(--line);
  overflow-y: auto;
}

.section-head--rail {
  margin-bottom: 8px;
}

.section-head__count {
  margin-left: auto;
  color: var(--faint);
  font-size: 0.85rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.lane__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--lane-hue, var(--muted));
}

.lane--capturing {
  --lane-hue: var(--c-capturing);
}
.lane--preparing {
  --lane-hue: var(--c-preparing);
}
.lane--ready {
  --lane-hue: var(--c-ready);
}
.lane--served {
  --lane-hue: var(--c-served);
}
.lane--cancelled {
  --lane-hue: var(--c-cancelled);
}

.rail__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chip {
  border: 1px solid var(--line);
  border-left: 3px solid var(--lane-hue, var(--muted));
  border-radius: 12px;
  background: var(--surface);
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgb(46 28 18 / 4%);
}

.chip.age-late {
  border-color: rgb(192 57 43 / 38%);
}

.chip__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chip__mesa {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.chip__sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.chip__code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--faint);
}

.chip__actions {
  display: flex;
  gap: 6px;
  margin-top: 9px;
}

.advance {
  flex: 1 1 auto;
  min-height: 40px;
  border: 0;
  border-radius: 9px;
  background: var(--green);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  transition: background-color 120ms ease, transform 80ms ease;
}

.advance:hover {
  background: var(--green-press);
}

.advance:active {
  transform: translateY(1px);
}

/* ---------- Ghost buttons ---------- */
.ghost {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.ghost:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.ghost--sm {
  min-height: 40px;
  min-width: 40px;
  padding: 0 11px;
}

.ghost--danger:hover {
  border-color: rgb(192 57 43 / 42%);
  background: rgb(192 57 43 / 7%);
  color: var(--danger);
}

/* ---------- Rest / empty states (branded) ---------- */
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

/* ---------- Responsive: stack rail under the queue ---------- */
@media (max-width: 860px) {
  .board {
    max-height: none;
  }

  .board__body {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .queue__grid {
    overflow-y: visible;
  }

  .rail {
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
  .signout {
    flex: 1 1 0;
  }

  .queue__grid {
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
