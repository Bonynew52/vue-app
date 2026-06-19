<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import assortedCookies from '../assets/campaigns/belly-cookie-selection.jpg'
import brandLogo from '../assets/campaigns/belly-monster-logo-white.png'
import storefrontImage from '../assets/campaigns/belly-storefront.jpg'
import cateringEvent from '../assets/campaigns/belly-event-catering.jpg'
import candyCaneLatte from '../assets/campaigns/candy-cane-iced-latte.jpg'
import chessCustomers from '../assets/campaigns/belly-chess-table.jpg'
import cinnamonRaspberry from '../assets/campaigns/cinnamon-roll-raspberry.png'
import customersAtTable from '../assets/campaigns/belly-cafe-customers.jpg'
import goldenWorldCupAward from '../assets/campaigns/monster-world-cup-award.png'
import icedCoffeeHandoff from '../assets/campaigns/belly-iced-coffee-service.jpeg'
import { campaigns } from '../data/campaigns'

const isLogoIntroVisible = ref(true)
const latestRow = ref(null)
const isDraggingLatest = ref(false)
const [chilaquiles] = campaigns
const imageVersion = 'home-20260619-3'
const selectedMenuCategory = ref('postres')
const menuCategories = [
  { id: 'postres', label: 'Postres' },
  { id: 'frappes', label: 'Frappes' },
  { id: 'comidas', label: 'Comidas' },
  { id: 'matcha', label: 'Matcha' },
  { id: 'desayunos', label: 'Desayunos' },
  { id: 'hamburguesas', label: 'Hamburguesas' },
  { id: 'americanos', label: 'Americanos' },
]
const latestItems = [
  { title: 'Belly en tu evento', image: cateringEvent, to: 'order' },
  { title: 'Monster World Cup', image: goldenWorldCupAward, to: 'menu' },
]
const menuCategoryCards = computed(() => {
  const category = menuCategories.find((item) => item.id === selectedMenuCategory.value)
  const title = category?.label || 'Menu'
  const placeholderImages = {
    postres: [assortedCookies, candyCaneLatte, cinnamonRaspberry],
    frappes: [icedCoffeeHandoff, candyCaneLatte, customersAtTable],
    comidas: [chilaquiles.image, cateringEvent, goldenWorldCupAward],
    matcha: [icedCoffeeHandoff, customersAtTable, candyCaneLatte],
    desayunos: [chilaquiles.image, assortedCookies, icedCoffeeHandoff],
    hamburguesas: [goldenWorldCupAward, cateringEvent, chilaquiles.image],
    americanos: [candyCaneLatte, icedCoffeeHandoff, customersAtTable],
  }
  const images = placeholderImages[selectedMenuCategory.value] || [icedCoffeeHandoff]

  return images.map((image, index) => ({
    id: `${selectedMenuCategory.value}-${index}`,
    image,
    title,
    description: `Proximamente en ${title.toLowerCase()}.`,
  }))
})

function refreshedImage(src) {
  return `${src}${src.includes('?') ? '&' : '?'}v=${imageVersion}`
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
  }, 1800)
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
          <div class="home-logo-intro__wordmark" aria-hidden="true">
            <span>Belly</span>
            <span>Monster</span>
          </div>
        </section>
      </Transition>
    </Teleport>

    <section class="home-hero" :style="{ '--hero-image': `url(${refreshedImage(icedCoffeeHandoff)})` }">
      <div class="home-hero__shade"></div>
      <div class="home-hero__content">
        <p>To eat to share to enjoy</p>
        <RouterLink :to="{ name: 'order' }">Ordena ahora</RouterLink>
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
      <TransitionGroup name="menu-card-fade" tag="div" class="home-menu-row">
        <article v-for="card in menuCategoryCards" :key="card.id" class="menu-card">
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
          @click="selectedMenuCategory = category.id"
        >
          {{ category.label }}
        </button>
      </div>
    </section>

    <section class="home-history" :style="{ '--history-image': `url(${refreshedImage(storefrontImage)})` }">
      <div class="home-history__shade"></div>
      <h1>Nuestra historia</h1>
    </section>

    <section class="home-section home-section--mood" aria-labelledby="mood-title">
      <h1 id="mood-title"><span>Belly</span> un <span>mood</span> completo</h1>
      <div class="home-mood-grid">
        <img :src="refreshedImage(chessCustomers)" alt="Clientes jugando ajedrez en Belly Monster" />
        <img :src="refreshedImage(customersAtTable)" alt="Clientes en Belly Monster" />
      </div>
      <RouterLink class="home-order-link" :to="{ name: 'order' }">Ordena ahora</RouterLink>
    </section>

    <footer class="home-footer">
      <img class="home-footer__logo" :src="refreshedImage(brandLogo)" alt="Belly Monster" />
      <strong>To eat to share to enjoy</strong>
      <nav aria-label="Enlaces del sitio">
        <RouterLink :to="{ name: 'order' }">Ordena ahora</RouterLink>
        <RouterLink :to="{ name: 'menu' }">Menú</RouterLink>
        <a href="#latest-title">Lo nuevo</a>
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

.home-logo-intro__wordmark,
.home-footer__logo {
  display: grid;
  justify-items: center;
  color: #ffffff;
  font-family: var(--font-display);
  font-size: clamp(4rem, 21vw, 10rem);
  font-weight: 900;
  line-height: 0.62;
  text-align: center;
  text-transform: uppercase;
  transform: rotate(-1.5deg) skewX(-4deg);
}

.home-logo-intro__wordmark span:last-child,
.home-footer__logo span:last-child {
  margin-top: 0.2em;
  transform: scaleX(0.92);
}

.home-logo-intro-enter-active,
.home-logo-intro-leave-active {
  transition: opacity 420ms ease;
}

.home-logo-intro-enter-from,
.home-logo-intro-leave-to {
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
.home-order-link {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
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
  padding: 34px 28px;
}

.home-section h1 {
  margin: 0 0 18px;
  color: #b47bb9;
  font-size: clamp(1.45rem, 6vw, 2.2rem);
  line-height: 0.95;
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

.home-menu-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin: 28px -28px 0;
  padding: 25px 24px;
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
}

.home-history h1 {
  position: absolute;
  right: 24px;
  bottom: 30px;
  left: 24px;
  z-index: 1;
  color: #ffffff;
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

.home-footer {
  display: grid;
  gap: 22px;
  padding: 34px 28px 30px;
  background: #419ea5;
  color: #ffffff;
}

.home-footer__logo {
  width: 130px;
  height: 130px;
  align-content: center;
  justify-self: start;
  border-radius: 50%;
  background: #f4d852;
  font-size: 1.7rem;
  color: #ffffff;
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

  .home-card-row,
  .home-menu-row,
  .home-mood-grid {
    gap: 28px;
  }
}
</style>
