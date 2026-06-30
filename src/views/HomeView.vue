<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import assortedCookies from '../assets/campaigns/belly-cookie-selection.jpg'
import brandLogo from '../assets/campaigns/belly-monster-logo-white.png'
import storefrontImage from '../assets/campaigns/belly-storefront.jpg'
import cateringEvent from '../assets/campaigns/belly-event-catering.jpg'
import chessCustomers from '../assets/campaigns/belly-chess-table.jpg'
import customersAtTable from '../assets/campaigns/belly-cafe-customers.jpg'
import goldenWorldCupAward from '../assets/campaigns/monster-world-cup-award.png'
import icedCoffeeHandoff from '../assets/campaigns/belly-iced-coffee-service.jpeg'
import catalog from '../data/menuCatalog.generated.json'

const isLogoIntroVisible = ref(true)
const isDevelopmentNoticeVisible = ref(true)
const latestRow = ref(null)
const menuRow = ref(null)
const isDraggingLatest = ref(false)
const imageVersion = 'home-20260619-3'
const selectedMenuCategory = ref('waffles-pan-frances')
const menuCategories = [
  { id: 'waffles-pan-frances', label: 'Waffles & Pan Frances' },
  { id: 'chilaquiles', label: 'Chilaquiles' },
  { id: 'egg-drop', label: 'Egg Drop' },
  { id: 'toast', label: 'Toast' },
  { id: 'sandwiches', label: 'Sándwiches' },
  { id: 'bowl', label: 'Bowl' },
  { id: 'kids-menu', label: 'Kids menú' },
  { id: 'burgers', label: 'Burgers' },
  { id: 'ensaladas', label: 'Ensaladas' },
  { id: 'sides', label: 'Sides' },
  { id: 'sopas', label: 'Sopas' },
  { id: 'postres', label: 'Postres' },
  { id: 'bebidas', label: 'Bebidas' },
]
const latestItems = [
  { title: 'Belly en tu evento', image: cateringEvent, to: 'order' },
  { title: 'Monster World Cup', image: goldenWorldCupAward, to: 'menu' },
]

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function catalogItemsForHomeCategory(categoryId) {
  const categories = catalog.categories || []
  const byCategory = (menuKey, pattern) =>
    categories
      .filter(
        (category) =>
          category.menuKey === menuKey && pattern.test(normalizeText(`${category.name} ${category.sourceName}`)),
      )
      .flatMap((category) => category.items || [])

  const byMenu = (menuKey) =>
    categories.filter((category) => category.menuKey === menuKey).flatMap((category) => category.items || [])

  const byItem = (menuKey, pattern) =>
    byMenu(menuKey).filter((item) => pattern.test(normalizeText(`${item.name} ${item.sourceName}`)))

  const itemsByHomeCategory = {
    'waffles-pan-frances': byCategory('desayunos', /waffles|pan frances/),
    chilaquiles: byCategory('desayunos', /chilaquiles/),
    'egg-drop': byItem('desayunos', /egg drop/),
    toast: byCategory('desayunos', /toast/),
    sandwiches: byCategory('desayunos', /sandwiches|sandwich/),
    bowl: byCategory('desayunos', /bowl|bowls/),
    'kids-menu': byCategory('desayunos', /kids/),
    burgers: byCategory('comidas', /burgers|burger/),
    ensaladas: byCategory('comidas', /ensaladas|ensalada|salad/),
    sides: [...byCategory('desayunos', /sides/), ...byCategory('comidas', /sides/)],
    sopas: byCategory('comidas', /sopas|sopa/),
    postres: byMenu('postres'),
    bebidas: byMenu('bebidas'),
  }

  const items = itemsByHomeCategory[categoryId] || []
  const imageBackedItems = items.filter((item) => item.image)

  return imageBackedItems.length ? imageBackedItems : items
}

const menuCategoryCards = computed(() => {
  return menuCategories.map((category) => {
    const representativeItem = catalogItemsForHomeCategory(category.id)[0]

    return {
      id: category.id,
      image: representativeItem?.image || brandLogo,
      title: category.label,
      description: representativeItem?.description || representativeItem?.name || 'Categoria del menu Belly Monster.',
    }
  })
})

function selectMenuCategory(categoryId) {
  selectedMenuCategory.value = categoryId
  requestAnimationFrame(() => {
    const row = menuRow.value?.$el || menuRow.value
    const card = row?.querySelector(`[data-category-id="${categoryId}"]`)

    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  })
}

function refreshedImage(src) {
  return `${src}${src.includes('?') ? '&' : '?'}v=${imageVersion}`
}

function closeDevelopmentNotice() {
  isDevelopmentNoticeVisible.value = false
}

let logoIntroTimeout
let latestDragStartX = 0
let latestDragStartScrollLeft = 0

function startLatestDrag(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  const row = latestRow.value

  if (!row) {
    return
  }

  isDraggingLatest.value = true
  latestDragStartX = event.clientX
  latestDragStartScrollLeft = row.scrollLeft
  row.setPointerCapture?.(event.pointerId)
}

function moveLatestDrag(event) {
  const row = latestRow.value

  if (!isDraggingLatest.value || !row) {
    return
  }

  event.preventDefault()
  row.scrollLeft = latestDragStartScrollLeft - (event.clientX - latestDragStartX)
}

function endLatestDrag(event) {
  const row = latestRow.value

  if (!isDraggingLatest.value) {
    return
  }

  isDraggingLatest.value = false

  try {
    row?.releasePointerCapture?.(event.pointerId)
  } catch {
    // The pointer can be released outside the scroll area.
  }
}

onMounted(() => {
  logoIntroTimeout = window.setTimeout(() => {
    isLogoIntroVisible.value = false
  }, 900)
})

onBeforeUnmount(() => {
  window.clearTimeout(logoIntroTimeout)
})
</script>

<template>
  <main class="home-view">
    <Teleport to="body">
      <Transition name="home-logo-intro">
        <section v-if="isLogoIntroVisible" class="home-logo-intro" aria-label="Belly Monster Bites">
          <img
            class="home-logo-intro__wordmark"
            :src="refreshedImage(brandLogo)"
            alt="Belly Monster"
          />
        </section>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="development-notice">
        <section
          v-if="isDevelopmentNoticeVisible && !isLogoIntroVisible"
          class="development-notice"
          role="dialog"
          aria-modal="true"
          aria-labelledby="development-notice-title"
        >
          <article class="development-notice__card">
            <p>Pagina en desarrollo</p>
            <h1 id="development-notice-title">La pagina no es funcional de momento</h1>
            <span>Estamos preparando la experiencia completa.</span>
            <button type="button" @click="closeDevelopmentNotice">Entendido</button>
          </article>
        </section>
      </Transition>
    </Teleport>

    <section class="home-hero" :style="{ '--hero-image': `url(${refreshedImage(icedCoffeeHandoff)})` }">
      <div class="home-hero__shade"></div>
      <div class="home-hero__content">
        <p>To eat to share to enjoy</p>
        <button type="button" disabled>Pagina en desarrollo</button>
      </div>
    </section>

    <section class="home-section home-section--latest" aria-labelledby="latest-title">
      <h1 id="latest-title">Lo nuevo</h1>
      <div
        ref="latestRow"
        class="home-card-row"
        :class="{ 'is-dragging': isDraggingLatest }"
        @pointerdown="startLatestDrag"
        @pointermove="moveLatestDrag"
        @pointerup="endLatestDrag"
        @pointercancel="endLatestDrag"
        @pointerleave="endLatestDrag"
      >
        <article v-for="item in latestItems" :key="item.title" class="promo-card">
          <img :src="refreshedImage(item.image)" :alt="item.title" />
          <div class="promo-card__content">
            <h2>{{ item.title }}</h2>
            <RouterLink :to="{ name: item.to }">Ver mas</RouterLink>
          </div>
        </article>
      </div>
    </section>

    <section class="home-section home-section--menu" aria-labelledby="menu-title">
      <h1 id="menu-title">Explora nuestro menú</h1>
      <TransitionGroup ref="menuRow" name="menu-card-fade" tag="div" class="home-menu-row">
          <article
            v-for="card in menuCategoryCards"
            :key="card.id"
            class="menu-card"
            :class="{ 'is-active': selectedMenuCategory === card.id }"
            :data-category-id="card.id"
          >
          <img :src="refreshedImage(card.image)" :alt="card.title" />
          <div>
            <h2>{{ card.title }}</h2>
            <p>{{ card.description }}</p>
            <RouterLink :to="{ name: 'menu' }">Ver mas</RouterLink>
          </div>
        </article>
      </TransitionGroup>
      <div class="home-menu-tags" aria-label="Categorias de menu">
        <button
          v-for="category in menuCategories"
          :key="category.id"
          type="button"
          :class="{ active: selectedMenuCategory === category.id }"
          @click="selectMenuCategory(category.id)"
        >
          {{ category.label }}
        </button>
      </div>
    </section>

    <section class="home-history" :style="{ '--history-image': `url(${refreshedImage(storefrontImage)})` }">
      <div class="home-history__shade"></div>
      <div class="home-history__content">
        <h1>Nuestra historia</h1>
        <a href="/nuestra-historia" target="_blank" rel="noreferrer">mas informacion</a>
      </div>
    </section>

    <section class="home-history-bridge" aria-label="Belly Monster">
      <div>
        <p>TO EAT&nbsp;&nbsp;&nbsp; TO SHARE&nbsp;&nbsp;&nbsp; TO ENJOY</p>
        <h1>Reserva tu evento</h1>
        <article class="home-history-bridge__card">
          <span>Nota: sujeto a disponibilidad</span>
          <a href="/reservar-evento" target="_blank" rel="noreferrer">mas informacion</a>
        </article>
      </div>
    </section>

    <section class="home-section home-section--mood" aria-labelledby="mood-title">
      <h1 id="mood-title"><span>Belly</span> un <span>mood</span> completo</h1>
      <div class="home-mood-grid">
        <img :src="refreshedImage(chessCustomers)" alt="Clientes jugando ajedrez en Belly Monster" />
        <img :src="refreshedImage(customersAtTable)" alt="Clientes en Belly Monster" />
      </div>
      <button id="comentarios" class="home-order-link" type="button" disabled>Pagina en desarrollo</button>
      <div id="ubicacion" class="home-map" aria-label="Ubicacion Belly Monster">
        <iframe
          title="Belly Monster en Google Maps"
          src="https://www.google.com/maps?q=C.%20Rio%20Panuco%203610%2C%20Madero%2C%2088270%20Nuevo%20Laredo%2C%20Tamps.&output=embed"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </section>

    <footer class="home-footer">
      <div class="home-footer__logo">
        <img :src="refreshedImage(brandLogo)" alt="Belly Monster" />
      </div>
      <strong>To eat to share to enjoy</strong>
      <nav aria-label="Enlaces del sitio">
        <RouterLink :to="{ name: 'order' }">Ordena ahora</RouterLink>
        <RouterLink :to="{ name: 'menu' }">Menú</RouterLink>
        <a href="#latest-title">Lo nuevo</a>
        <RouterLink :to="{ name: 'history' }">Nuestra Historia</RouterLink>
        <a href="#mood-title">Contacto</a>
      </nav>
      <small>Terminos y condiciones</small>
    </footer>
  </main>
</template>

<style scoped>
.home-view {
  width: 100%;
  background: #ffffff;
  color: #101114;
  font-family: var(--font-display);
}

.home-logo-intro {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 28px;
  background: #419ea5;
}

.home-logo-intro__wordmark {
  width: min(430px, 78vw);
  height: auto;
  transform: rotate(-1.5deg) skewX(-4deg);
  filter: brightness(0) invert(1);
}

.home-logo-intro-enter-active,
.home-logo-intro-leave-active {
  transition: opacity 210ms ease;
}

.home-logo-intro-enter-from,
.home-logo-intro-leave-to {
  opacity: 0;
}

.development-notice {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgb(16 17 20 / 58%);
  backdrop-filter: blur(4px);
}

.development-notice__card {
  display: grid;
  width: min(100%, 420px);
  gap: 14px;
  padding: 26px 24px 24px;
  border: 3px solid #101114;
  background: #399ba4;
  color: #ffffff;
  box-shadow: 0 22px 54px rgb(0 0 0 / 28%);
  text-align: center;
}

.development-notice__card p {
  margin: 0;
  color: #ffe05d;
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

.development-notice__card h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(1.55rem, 7vw, 2.55rem);
  line-height: 0.94;
  text-transform: uppercase;
}

.development-notice__card span {
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
}

.development-notice__card button {
  justify-self: center;
  min-height: 42px;
  padding: 0 24px;
  border: 2px solid #101114;
  border-radius: 999px;
  background: #ffffff;
  color: #101114;
  font-family: var(--font-body);
  font-size: 0.86rem;
  font-weight: 900;
  text-transform: uppercase;
}

.development-notice-enter-active,
.development-notice-leave-active {
  transition: opacity 180ms ease;
}

.development-notice-enter-from,
.development-notice-leave-to {
  opacity: 0;
}

.home-hero,
.home-history {
  position: relative;
  min-height: clamp(330px, 78svh, 560px);
  background-image: var(--hero-image);
  background-position: center;
  background-size: cover;
  overflow: hidden;
}

.home-hero__shade,
.home-history__shade {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 28%);
}

.home-hero__content {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 28px;
  padding: 28px;
  color: #ffffff;
  text-align: center;
}

.home-hero__content p,
.home-history h1 {
  margin: 0;
  font-size: clamp(1.65rem, 7vw, 3.5rem);
  line-height: 0.9;
  text-transform: uppercase;
}

.home-hero__content a,
.home-hero__content button,
.home-order-link {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: #52ae70;
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
}

.home-hero__content button:disabled,
.home-order-link:disabled {
  opacity: 0.76;
  cursor: default;
}

.home-section {
  padding: 34px 28px;
}

.home-section h1 {
  margin: 0 0 18px;
  color: #b47bb9;
  font-size: clamp(1.45rem, 6vw, 2.2rem);
  line-height: 0.95;
}

.home-history-bridge {
  display: grid;
  place-items: center;
  padding: 0;
  border-block: 10px solid #101114;
  background: #399ba4;
}

.home-history-bridge div {
  display: grid;
  width: 100%;
  min-height: 172px;
  place-items: center;
  gap: 12px;
  padding: 28px;
  color: #ffffff;
  text-align: center;
}

.home-history-bridge p {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.76rem;
  font-weight: 900;
  line-height: 1;
}

.home-history-bridge h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(1.65rem, 7vw, 3.15rem);
  line-height: 0.9;
  text-transform: uppercase;
}

.home-history-bridge a {
  display: inline-flex;
  justify-self: center;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: #ffffff;
  color: #101114;
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
  cursor: pointer;
}

.home-history-bridge__card {
  display: grid;
  width: min(100%, 340px);
  gap: 12px;
  margin-top: 8px;
  padding: 14px 16px;
  border: 1px solid rgb(255 255 255 / 42%);
  background: rgb(255 255 255 / 14%);
  color: #ffffff;
  font-family: var(--font-body);
  text-align: center;
}

.home-history-bridge__card strong {
  font-size: 0.88rem;
  font-weight: 900;
  text-transform: uppercase;
}

.home-history-bridge__card span {
  font-size: 0.82rem;
  line-height: 1.35;
  text-transform: uppercase;
}

.home-card-row,
.home-menu-row,
.home-mood-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.home-section--latest {
  padding-right: 0;
}

.home-card-row {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 0 28px 14px 0;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  cursor: grab;
  user-select: none;
}

.home-card-row::-webkit-scrollbar {
  display: none;
}

.home-card-row.is-dragging {
  cursor: grabbing;
}

.promo-card,
.menu-card {
  position: relative;
  min-height: 220px;
  border-radius: 14px;
  overflow: hidden;
}

.promo-card {
  width: clamp(210px, 68vw, 290px);
  min-height: clamp(260px, 72vw, 340px);
  flex: 0 0 auto;
  scroll-snap-align: start;
}

.promo-card img,
.menu-card img,
.home-mood-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.promo-card img,
.menu-card img {
  position: absolute;
  inset: 0;
}

.promo-card::after,
.menu-card::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 35%, rgb(0 0 0 / 58%) 100%);
  content: "";
}

.promo-card__content,
.menu-card > div {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 1;
  color: #ffffff;
}

.promo-card h2,
.menu-card h2 {
  margin: 0;
  font-size: clamp(1rem, 4vw, 1.45rem);
  line-height: 0.9;
}

.menu-card p {
  margin: 8px 0;
  font-family: var(--font-body);
  font-size: 0.78rem;
  line-height: 1.1;
}

.promo-card a,
.menu-card a {
  display: inline-flex;
  margin-top: 8px;
  padding: 6px 11px;
  border-radius: 999px;
  background: #ffffff;
  color: #333333;
  font-family: var(--font-body);
  font-size: 0.72rem;
  text-decoration: none;
}

.home-section--menu {
  padding-bottom: 0;
}

.home-menu-row {
  display: flex;
  width: 100%;
  gap: 16px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 0 0 14px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
}

.home-menu-row::-webkit-scrollbar {
  display: none;
}

.menu-card {
  width: min(68vw, 280px);
  min-height: 260px;
  flex: 0 0 auto;
  scroll-snap-align: start;
}

.menu-card.is-active {
  outline: 3px solid #f59aa7;
  outline-offset: 3px;
}

.home-menu-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  min-height: 168px;
  gap: 12px;
  margin: 28px -28px 0;
  padding: 30px 24px;
  background: #419ea5;
}

.home-menu-tags button {
  border: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ffffff;
  color: #101114;
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
}

.home-menu-tags button.active {
  background: #f59aa7;
}

@media (min-width: 460px) {
  .home-menu-tags {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    min-height: 272px;
  }

  .home-menu-tags button {
    display: grid;
    width: 100%;
    min-height: 36px;
    place-items: center;
    padding: 5px 8px;
    line-height: 1.1;
    text-align: center;
  }

  .home-menu-tags button:last-child {
    grid-column: 2;
  }
}

.menu-card-fade-enter-active,
.menu-card-fade-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.menu-card-fade-enter-from,
.menu-card-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.home-history {
  min-height: clamp(300px, 65svh, 500px);
  background-image: var(--history-image);
  background-position: center 72%;
}

.home-history__content {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-content: end center;
  justify-items: center;
  gap: 22px;
  padding: 28px 28px clamp(20px, 5svh, 42px);
  color: #ffffff;
  text-align: center;
}

.home-history h1 {
  margin: 0;
  color: #ffffff;
}

.home-history a {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: #ffffff;
  color: #101114;
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
}

.home-section--mood {
  padding-top: 52px;
  text-align: center;
}

.home-section--mood h1 {
  color: #101114;
  font-size: clamp(1.45rem, 5.2vw, 2.1rem);
}

.home-section--mood h1 span:first-child {
  color: #52ae70;
}

.home-section--mood h1 span:last-child {
  color: #6e9dcd;
}

.home-mood-grid img {
  aspect-ratio: 1;
  object-position: center;
}

.home-order-link {
  margin-top: 26px;
}

.home-map {
  width: calc(100% + 56px);
  height: clamp(320px, 78svh, 520px);
  margin: 34px -28px -34px;
  overflow: hidden;
  background: #f1f1ed;
}

.home-map iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.home-footer {
  display: grid;
  gap: 22px;
  padding: 34px 28px 30px;
  background: #419ea5;
  color: #ffffff;
}

.home-footer__logo {
  display: grid;
  width: 130px;
  height: 130px;
  place-items: center;
  justify-self: start;
  border-radius: 50%;
  background: #f4d852;
}

.home-footer__logo img {
  width: 76%;
  height: 76%;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.home-footer strong {
  color: #74341f;
  font-size: 1.1rem;
  text-transform: uppercase;
}

.home-footer nav {
  display: grid;
  gap: 7px;
}

.home-footer a,
.home-footer small {
  color: inherit;
  font-family: var(--font-body);
  font-size: 0.92rem;
  text-decoration: none;
}

.home-footer small {
  justify-self: center;
  font-size: 1rem;
}

@media (min-width: 560px) {
  .home-section {
    padding-right: 44px;
    padding-left: 44px;
  }

  .home-menu-tags {
    margin-right: -44px;
    margin-left: -44px;
    padding-right: 48px;
    padding-left: 48px;
  }

  .home-map {
    width: calc(100% + 88px);
    margin-right: -44px;
    margin-left: -44px;
  }

  .home-card-row,
  .home-menu-row,
  .home-mood-grid {
    gap: 28px;
  }
}
</style>
