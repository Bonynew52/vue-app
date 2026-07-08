<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import assortedCookies from '../assets/campaigns/belly-cookie-selection.jpg'
import brandLogo from '../assets/campaigns/belly-monster-logo-white.png'
import storefrontImage from '../assets/campaigns/belly-storefront.jpg'
import chessCustomers from '../assets/campaigns/belly-chess-table.jpg'
import socialFoodPhotos from '../assets/campaigns/belly-social-food-photos.jpg'
import icedCoffeeHandoff from '../assets/campaigns/belly-iced-coffee-service.jpeg'
import { menuCategories as catalogMenuCategories, monthlySpecialItems } from '../data/menu'

const isLogoIntroVisible = ref(true)
const latestRow = ref(null)
const menuRow = ref(null)
const imageVersion = 'home-20260619-3'
const selectedMenuCategory = ref('waffles-pan-frances')
const menuCategories = [
  { id: 'waffles-pan-frances', label: 'Waffles & Pan Frances', sectionName: 'Waffles y Pan Frances' },
  { id: 'chilaquiles', label: 'Chilaquiles', sectionName: 'Chilaquiles' },
  { id: 'egg-drop', label: 'Egg Drop', sectionName: 'Egg Drop' },
  { id: 'toast', label: 'Toast', sectionName: 'Toast' },
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
const latestItems = monthlySpecialItems.map((item) => ({
  id: item.id,
  title: item.title,
  image: item.image,
}))

const menuSectionByHomeId = {
  'waffles-pan-frances': 'Waffles y Pan Frances',
  chilaquiles: 'Chilaquiles',
  'egg-drop': 'Egg Drop',
  toast: 'Toast',
  sandwiches: 'Sandwich',
  bowl: 'Bowl',
  'kids-menu': 'Kids Menu',
  burgers: 'Burgers',
  ensaladas: 'Ensalada',
  sides: 'Sides',
  sopas: 'Sopas',
}
const categoryImageOverrides = {
  bebidas: '/images/menu/category-bebidas-strawberry-matcha.jpeg',
  postres: '/images/menu/temporal-galleta-sea-salt-toffee.jpeg',
  sopas: '/images/menu/category-sopas-sopa-de-elote.jpeg',
}
const horizontalDrag = {
  el: null,
  pointerId: null,
  startX: 0,
  startScrollLeft: 0,
  moved: false,
}
let suppressRailClick = false

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function catalogItemsForHomeCategory(categoryId) {
  const items = menuSectionForHomeCategory(categoryId)?.items || []
  const imageBackedItems = items.filter((item) => item.image)

  return imageBackedItems.length ? imageBackedItems : items
}

function menuSectionForHomeCategory(categoryId) {
  if (categoryId === 'bebidas') {
    return (catalogMenuCategories || []).find((category) => category.menuId === 'bebidas')
  }

  if (categoryId === 'postres') {
    return (catalogMenuCategories || []).find((category) => category.menuId === 'postres')
  }

  const sectionName = normalizeText(menuSectionByHomeId[categoryId])

  return (catalogMenuCategories || []).find(
    (category) => category.menuId === 'comidas' && normalizeText(category.name) === sectionName,
  )
}

const menuCategoryCards = computed(() => {
  return menuCategories
    .map((category) => {
      const representativeItem = catalogItemsForHomeCategory(category.id)[0]
      const menuSection = menuSectionForHomeCategory(category.id)

      return {
        id: category.id,
        categoryId: menuSection?.id || '',
        image: categoryImageOverrides[category.id] || representativeItem?.image || brandLogo,
        title: category.label,
        description: representativeItem?.description || representativeItem?.name || 'Categoria del menu Belly Monster.',
      }
    })
    .filter((category) => category.categoryId)
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

function startHorizontalDrag(event) {
  if (event.button !== undefined && event.button !== 0) {
    return
  }

  const rail = event.currentTarget
  if (!rail || rail.scrollWidth <= rail.clientWidth) {
    return
  }

  horizontalDrag.el = rail
  horizontalDrag.pointerId = event.pointerId
  horizontalDrag.startX = event.clientX
  horizontalDrag.startScrollLeft = rail.scrollLeft
  horizontalDrag.moved = false
  rail.classList.add('is-dragging')
  rail.setPointerCapture?.(event.pointerId)
}

function moveHorizontalDrag(event) {
  if (!horizontalDrag.el || horizontalDrag.pointerId !== event.pointerId) {
    return
  }

  const deltaX = event.clientX - horizontalDrag.startX
  if (Math.abs(deltaX) > 4) {
    horizontalDrag.moved = true
  }

  horizontalDrag.el.scrollLeft = horizontalDrag.startScrollLeft - deltaX
}

function endHorizontalDrag(event) {
  if (!horizontalDrag.el || horizontalDrag.pointerId !== event.pointerId) {
    return
  }

  horizontalDrag.el.releasePointerCapture?.(event.pointerId)
  horizontalDrag.el.classList.remove('is-dragging')
  suppressRailClick = horizontalDrag.moved
  horizontalDrag.el = null
  horizontalDrag.pointerId = null

  if (suppressRailClick) {
    window.setTimeout(() => {
      suppressRailClick = false
    }, 0)
  }
}

function scrollHorizontalRailWithWheel(event) {
  const rail = event.currentTarget
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY

  if (!delta || !rail || rail.scrollWidth <= rail.clientWidth) {
    return
  }

  event.preventDefault()
  rail.scrollLeft += delta
}

function cancelHorizontalDragClick(event) {
  if (!suppressRailClick) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
}

function refreshedImage(src) {
  return `${src}${src.includes('?') ? '&' : '?'}v=${imageVersion}`
}

let logoIntroTimeout

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

    <section class="home-hero" :style="{ '--hero-image': `url(${refreshedImage(icedCoffeeHandoff)})` }">
      <div class="home-hero__shade"></div>
      <div class="home-hero__content">
        <p>To eat to share to enjoy</p>
        <RouterLink :to="{ name: 'menu' }">Ver menu</RouterLink>
      </div>
    </section>

    <section class="home-section home-section--latest" aria-labelledby="latest-title">
      <h1 id="latest-title">Lo nuevo</h1>
      <div
        ref="latestRow"
        class="home-card-row"
        @wheel="scrollHorizontalRailWithWheel"
        @pointerdown="startHorizontalDrag"
        @pointermove="moveHorizontalDrag"
        @pointerup="endHorizontalDrag"
        @pointercancel="endHorizontalDrag"
        @click.capture="cancelHorizontalDragClick"
      >
        <article
          v-for="item in latestItems"
          :key="item.id"
          class="promo-card"
        >
          <img :src="refreshedImage(item.image)" :alt="item.title" />
          <div class="promo-card__content">
            <h2>{{ item.title }}</h2>
          </div>
        </article>
      </div>
    </section>

    <section class="home-section home-section--menu" aria-labelledby="menu-title">
      <h1 id="menu-title">Explora nuestro menú</h1>
      <TransitionGroup
        ref="menuRow"
        name="menu-card-fade"
        tag="div"
        class="home-menu-row"
        @wheel="scrollHorizontalRailWithWheel"
        @pointerdown="startHorizontalDrag"
        @pointermove="moveHorizontalDrag"
        @pointerup="endHorizontalDrag"
        @pointercancel="endHorizontalDrag"
        @click.capture="cancelHorizontalDragClick"
      >
          <RouterLink
            v-for="card in menuCategoryCards"
            :key="card.id"
            class="menu-card"
            :class="{ 'is-active': selectedMenuCategory === card.id }"
            :data-category-id="card.id"
            :to="{ name: 'menu', query: card.categoryId ? { categoria: card.categoryId } : {} }"
          >
          <img :src="refreshedImage(card.image)" :alt="card.title" />
          <div>
            <h2>{{ card.title }}</h2>
            <p>{{ card.description }}</p>
            <span>Ver mas</span>
          </div>
        </RouterLink>
      </TransitionGroup>
      <div class="home-menu-tags" aria-label="Categorias de menu">
        <button
          v-for="category in menuCategoryCards"
          :key="category.id"
          type="button"
          :class="{ active: selectedMenuCategory === category.id }"
          @click="selectMenuCategory(category.id)"
        >
          {{ category.title }}
        </button>
      </div>
    </section>

    <section class="home-history" :style="{ '--history-image': `url(${refreshedImage(storefrontImage)})` }">
      <div class="home-history__shade"></div>
      <div class="home-history__content">
        <h1>Quienes somos</h1>
        <a href="/nuestra-historia" target="_blank" rel="noreferrer">mas informacion</a>
      </div>
    </section>

    <section class="home-history-bridge" aria-label="Belly Monster">
      <div>
        <p>TO EAT&nbsp;&nbsp;&nbsp; TO SHARE&nbsp;&nbsp;&nbsp; TO ENJOY</p>
        <h1>Reserva tu evento</h1>
        <article class="home-history-bridge__card">
          <span>Nota: sujeto a disponibilidad</span>
          <RouterLink :to="{ name: 'eventReservation' }">mas informacion</RouterLink>
        </article>
      </div>
    </section>

    <section class="home-section home-section--mood" aria-labelledby="mood-title">
      <h1 id="mood-title"><span>Belly</span> un <span>mood</span> completo</h1>
      <div class="home-mood-grid">
        <img :src="refreshedImage(chessCustomers)" alt="Clientes jugando ajedrez en Belly Monster" />
        <img :src="refreshedImage(socialFoodPhotos)" alt="Clientes fotografiando platillos Belly Monster" />
      </div>
      <span id="comentarios" class="home-comments-anchor" aria-hidden="true"></span>
      <div id="ubicacion" class="home-map" aria-label="Ubicacion Belly Monster">
        <iframe
          title="Belly Monster en Google Maps"
          src="https://www.google.com/maps?q=Belly%20Monster%20Bites%20Plaza%20Punto%20Madero%2C%20C.%20Rio%20Panuco%203610%2C%20Madero%2C%2088270%20Nuevo%20Laredo%2C%20Tamps.%2C%20Mexico&output=embed"
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
        <RouterLink :to="{ name: 'login' }">Registrate</RouterLink>
        <RouterLink :to="{ name: 'menu' }">Menu</RouterLink>
        <RouterLink :to="{ name: 'history' }">Quienes somos</RouterLink>
        <a href="#mood-title">Contacto</a>
        <a href="#comentarios">Comentarios</a>
        <a
          href="https://www.google.com/maps?q=Belly%20Monster%20Bites%20Plaza%20Punto%20Madero%2C%20C.%20Rio%20Panuco%203610%2C%20Madero%2C%2088270%20Nuevo%20Laredo%2C%20Tamps.%2C%20Mexico"
          target="_blank"
          rel="noreferrer"
        >
          Ubicacion
        </a>
        <RouterLink :to="{ name: 'eventReservation' }">Reservaciones</RouterLink>
      </nav>
      <div class="home-footer__social" aria-label="Redes sociales">
        <a
          href="https://www.instagram.com/bellymonsterbites/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1.2" />
          </svg>
        </a>
        <a
          href="https://www.facebook.com/bellymonsterbites/"
          target="_blank"
          rel="noreferrer"
          aria-label="Facebook"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 8H17V4h-3c-3.3 0-5 2-5 5v2H6v4h3v6h4v-6h3.2l.6-4H13V9.2c0-.8.4-1.2 1.5-1.2Z" />
          </svg>
        </a>
      </div>
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

.home-hero,
.home-history {
  position: relative;
  min-height: clamp(330px, 78svh, 840px);
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

.home-hero__content a {
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

.home-section {
  width: min(100%, 820px);
  margin-right: auto;
  margin-left: auto;
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
  max-width: none;
  padding-right: 0;
}

.home-card-row {
  max-width: 820px;
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 0 28px 14px 0;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  touch-action: pan-x;
  user-select: none;
  cursor: grab;
  -webkit-overflow-scrolling: touch;
}

.home-card-row::-webkit-scrollbar {
  display: none;
}

.promo-card,
.menu-card {
  position: relative;
  min-height: 220px;
  border-radius: 14px;
  overflow: hidden;
}

.menu-card {
  color: #ffffff;
  text-decoration: none;
}

.promo-card {
  width: clamp(210px, 68vw, 290px);
  min-height: clamp(260px, 72vw, 340px);
  flex: 0 0 auto;
  scroll-snap-align: start;
  color: #ffffff;
  text-decoration: none;
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

.promo-card p,
.menu-card p {
  margin: 8px 0;
  font-family: var(--font-body);
  font-size: 0.78rem;
  line-height: 1.1;
}

.promo-card span,
.menu-card span {
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
  width: 100%;
  max-width: none;
  padding-bottom: 0;
}

.home-menu-row {
  display: flex;
  width: min(100%, 820px);
  margin-right: auto;
  margin-left: auto;
  gap: 16px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 0 0 14px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  touch-action: pan-x;
  cursor: grab;
  -webkit-overflow-scrolling: touch;
}

.home-card-row.is-dragging,
.home-menu-row.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
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
  position: relative;
  z-index: 0;
  display: flex;
  width: min(100%, 820px);
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  min-height: 168px;
  gap: 12px;
  margin: 28px auto 0;
  padding: 30px 24px;
}

.home-menu-tags::before {
  content: '';
  position: absolute;
  inset: 0 50%;
  z-index: -1;
  width: min(100vw, var(--public-frame-width, 1920px));
  background: #419ea5;
  transform: translateX(-50%);
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

.home-comments-anchor {
  display: block;
  width: 1px;
  height: 1px;
  overflow: hidden;
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

.home-footer__social {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 4px;
}

.home-footer__social a {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 2px solid rgb(255 255 255 / 70%);
  border-radius: 50%;
  background: rgb(255 255 255 / 12%);
  color: #ffffff;
}

.home-footer__social svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.home-footer__social a[aria-label='Facebook'] svg {
  fill: currentColor;
  stroke: none;
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
