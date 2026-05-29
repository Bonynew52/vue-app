<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useConvexMutation, useConvexQuery } from 'convex-vue'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'
import { formatMXN } from '../utils/formatPrice'

const router = useRouter()

const statusLabels = {
  new: 'Nuevo',
  capturing: 'En Parrot',
  preparing: 'Preparando',
  ready: 'Listo',
  served: 'Servido',
  cancelled: 'Cancelado',
}

const statusActions = [
  { value: 'capturing', label: 'Capturar' },
  { value: 'preparing', label: 'Preparar' },
  { value: 'ready', label: 'Listo' },
  { value: 'served', label: 'Servido' },
]

const session = ref(null)
const filter = ref('active')
const isBooting = ref(true)
const statusError = ref('')
const now = ref(Date.now())
let clockTimer = null
const orderQuery = useConvexQuery(api.orders.list, () => ({ status: filter.value }))
const updateOrderStatus = useConvexMutation(api.orders.updateStatus)
const orders = computed(() => orderQuery.data.value || [])
const isLoading = computed(() => orderQuery.isPending.value || updateOrderStatus.isPending.value)
const error = computed(() => statusError.value || orderQuery.error.value?.message || '')

const activeOrders = computed(() => orders.value.filter((order) => order.status !== 'served' && order.status !== 'cancelled'))
const newCount = computed(() => orders.value.filter((order) => order.status === 'new').length)
const readyCount = computed(() => orders.value.filter((order) => order.status === 'ready').length)

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
    <header class="toolbar">
      <div class="toolbar__title">
        <h1>Pedidos de mesa</h1>
        <span class="toolbar__sync" :class="{ 'is-busy': isLoading }">
          {{ isLoading ? 'Sincronizando…' : 'En vivo' }}
        </span>
      </div>

      <div class="counts" aria-label="Resumen de pedidos">
        <span class="count count--new"><b>{{ newCount }}</b>Nuevos</span>
        <span class="count count--active"><b>{{ activeOrders.length }}</b>Activos</span>
        <span class="count count--ready"><b>{{ readyCount }}</b>Listos</span>
      </div>

      <div class="toolbar__controls">
        <div class="segmented" role="group" aria-label="Filtro de pedidos">
          <button :class="{ active: filter === 'active' }" type="button" @click="setFilter('active')">
            Activos
          </button>
          <button :class="{ active: filter === 'all' }" type="button" @click="setFilter('all')">
            Todos
          </button>
        </div>
        <button class="ghost-btn" type="button" aria-label="Cerrar sesión" @click="signOut">
          Salir
        </button>
      </div>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <section v-if="isBooting" class="empty-state">Cargando panel…</section>

    <section v-else-if="orders.length === 0" class="empty-state">
      No hay pedidos en este momento.
    </section>

    <section v-else class="board__grid" aria-label="Pedidos recibidos">
      <article
        v-for="order in orders"
        :key="order.id"
        class="ticket"
        :class="[`is-${order.status}`, `age-${ageTier(order)}`]"
      >
        <header class="ticket__head">
          <div class="ticket__table">
            <span class="ticket__mesa">Mesa {{ order.tableId }}</span>
            <span class="ticket__code">#{{ order.shortCode }}</span>
          </div>
          <span class="ticket__status">{{ statusLabels[order.status] || order.status }}</span>
        </header>

        <div class="ticket__meta">
          <span>{{ timeLabel(order.createdAt) }}</span>
          <span class="ticket__age">{{ elapsedLabel(order.createdAt) }}</span>
        </div>

        <ul class="ticket__items">
          <li v-for="item in order.items" :key="item.id">
            <span class="qty">{{ item.quantity }}</span>
            <div class="ticket__item-body">
              <strong>{{ item.name }}</strong>
              <small v-if="item.note">{{ item.note }}</small>
            </div>
            <span class="ticket__line">{{ item.lineTotalCents == null ? 'Tienda' : money(item.lineTotalCents) }}</span>
          </li>
        </ul>

        <footer class="ticket__foot">
          <span>{{ order.itemCount }} artículo{{ order.itemCount === 1 ? '' : 's' }}</span>
          <strong>{{ money(order.subtotalCents, order.hasUnpriced) }}</strong>
        </footer>

        <div class="ticket__actions">
          <button
            v-for="action in statusActions"
            :key="action.value"
            type="button"
            :class="{ active: order.status === action.value }"
            @click="updateStatus(order, action.value)"
          >
            {{ action.label }}
          </button>
          <button class="danger" type="button" @click="updateStatus(order, 'cancelled')">
            Cancelar
          </button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.board {
  --ink: #2a1c14;
  --muted: #8b7a6d;
  --line: #eadfce;
  --accent: #1f9d57;
  --accent-press: #18854a;

  min-height: 100svh;
  padding: 0 max(14px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
  background: #fff8ef;
  color: var(--ink);
}

/* ---- Sticky toolbar ---- */
.toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 18px;
  padding: max(12px, env(safe-area-inset-top)) 4px 12px;
  background: #fff8ef;
  border-bottom: 1px solid var(--line);
}

.toolbar__title {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-right: auto;
}

.toolbar__title h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1;
}

.toolbar__sync {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;
}

.toolbar__sync.is-busy {
  color: var(--accent);
}

/* ---- Count pills ---- */
.counts {
  display: flex;
  gap: 8px;
}

.count {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.count b {
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border-radius: 8px;
  background: #f1e7d8;
  color: var(--ink);
  font-size: 1.1rem;
  font-weight: 950;
}

.count--new b {
  background: #fde3df;
  color: #c12e23;
}

.count--ready b {
  background: #def0e4;
  color: var(--accent-press);
}

/* ---- Controls ---- */
.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.segmented {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}

.segmented button {
  min-height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-weight: 900;
}

.segmented button.active {
  background: var(--ink);
  color: #fff;
}

.ghost-btn {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
  font-weight: 900;
}

.ghost-btn:active {
  background: #f6efe3;
}

.error {
  margin: 12px 4px 0;
  color: #b42a2a;
  font-weight: 900;
}

.empty-state {
  margin: 32px auto 0;
  max-width: 460px;
  padding: 28px;
  border: 1px dashed #d8c7b3;
  border-radius: 12px;
  background: #fff;
  color: #6f4e37;
  font-weight: 900;
  text-align: center;
}

/* ---- Order board grid ---- */
.board__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 12px;
  padding: 14px 4px 0;
  align-items: start;
}

.ticket {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-top: 5px solid #b9a48d;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(42 28 20 / 6%);
}

.ticket.is-new {
  border-top-color: #d93b30;
}

.ticket.is-ready {
  border-top-color: var(--accent);
}

/* Aging accent: open tickets warm up the longer they wait. */
.ticket.age-warn {
  border-top-color: #e08a16;
}

.ticket.age-late {
  border-top-color: #d93b30;
  box-shadow: 0 0 0 2px rgb(217 59 48 / 28%), 0 4px 14px rgb(42 28 20 / 6%);
}

.ticket__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px 8px;
}

.ticket__table {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.ticket__mesa {
  font-size: 1.3rem;
  font-weight: 950;
  line-height: 1;
}

.ticket__code {
  color: var(--muted);
  font-size: 0.92rem;
  font-weight: 900;
}

.ticket__status {
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: 999px;
  background: #f1e7d8;
  color: #6f4e37;
  font-size: 0.74rem;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.is-new .ticket__status {
  background: #fde3df;
  color: #c12e23;
}

.is-ready .ticket__status {
  background: #def0e4;
  color: var(--accent-press);
}

.ticket__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 14px 8px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 800;
}

.ticket__age {
  font-variant-numeric: tabular-nums;
}

.age-warn .ticket__age {
  color: #b86c0a;
}

.age-late .ticket__age {
  color: #c12e23;
}

.ticket__items {
  flex: 1 1 auto;
  margin: 0;
  padding: 4px 14px;
  list-style: none;
  border-top: 1px solid #f4ecdf;
}

.ticket__items li {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 8px 0;
  border-bottom: 1px solid #f4ecdf;
}

.ticket__items li:last-child {
  border-bottom: 0;
}

.qty {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 5px;
  border-radius: 8px;
  background: #fff1df;
  color: #6f4e37;
  font-weight: 950;
  font-variant-numeric: tabular-nums;
}

.ticket__item-body strong {
  display: block;
  font-size: 0.95rem;
  line-height: 1.25;
}

.ticket__item-body small {
  display: block;
  margin-top: 2px;
  color: #b4541f;
  font-weight: 800;
  font-size: 0.8rem;
}

.ticket__line {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.ticket__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid #f0e7da;
  font-weight: 900;
}

.ticket__foot strong {
  font-size: 1.05rem;
}

.ticket__actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 0 12px 12px;
}

.ticket__actions button {
  min-height: 44px;
  padding: 0 4px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fff;
  color: var(--ink);
  font-size: 0.82rem;
  font-weight: 900;
}

.ticket__actions button:active {
  background: #f6efe3;
}

.ticket__actions button.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.ticket__actions .danger {
  grid-column: 1 / -1;
  color: #b42a2a;
}

@media (max-width: 540px) {
  .toolbar__title {
    width: 100%;
  }

  .counts {
    flex: 1 1 auto;
  }

  .count {
    flex: 1 1 0;
    justify-content: center;
  }

  .toolbar__controls {
    width: 100%;
  }

  .segmented {
    flex: 1 1 auto;
  }

  .segmented button {
    flex: 1 1 0;
  }
}
</style>
