<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import facebookLogo from '../assets/social_media/facebook.svg'
import instagramLogo from '../assets/social_media/instagram.svg'
import { campaigns } from '../data/campaigns'

const conveyorCampaigns = [...campaigns, ...campaigns]
const conveyorViewport = ref(null)
const isDraggingConveyor = ref(false)
const isConveyorPaused = ref(false)

let dragStartX = 0
let dragStartScrollLeft = 0
let resumeConveyorTimeout

function beginConveyorDrag(clientX) {
  const viewport = conveyorViewport.value

  if (!viewport) {
    return
  }

  window.clearTimeout(resumeConveyorTimeout)
  isDraggingConveyor.value = true
  isConveyorPaused.value = true
  dragStartX = clientX
  dragStartScrollLeft = viewport.scrollLeft
}

function moveConveyorDrag(clientX) {
  const viewport = conveyorViewport.value

  if (!isDraggingConveyor.value || !viewport) {
    return
  }

  viewport.scrollLeft = dragStartScrollLeft - (clientX - dragStartX)
}

function endConveyorDrag() {
  const viewport = conveyorViewport.value

  if (!isDraggingConveyor.value) {
    return
  }

  isDraggingConveyor.value = false
  resumeConveyorTimeout = window.setTimeout(() => {
    isConveyorPaused.value = false
  }, 1500)

  return viewport
}

function startConveyorDrag(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  beginConveyorDrag(event.clientX)
  conveyorViewport.value?.setPointerCapture?.(event.pointerId)
}

function dragConveyor(event) {
  if (!isDraggingConveyor.value) {
    return
  }

  event.preventDefault()
  moveConveyorDrag(event.clientX)
}

function stopConveyorDrag(event) {
  const viewport = endConveyorDrag()

  try {
    viewport?.releasePointerCapture?.(event.pointerId)
  } catch {
    // The pointer can already be released when the drag ends outside the band.
  }
}

function startConveyorTouch(event) {
  const touch = event.touches[0]

  if (!touch) {
    return
  }

  beginConveyorDrag(touch.clientX)
}

function dragConveyorTouch(event) {
  const touch = event.touches[0]

  if (!touch || !isDraggingConveyor.value) {
    return
  }

  event.preventDefault()
  moveConveyorDrag(touch.clientX)
}

function stopConveyorTouch() {
  endConveyorDrag()
}

onBeforeUnmount(() => {
  window.clearTimeout(resumeConveyorTimeout)
})
</script>

<template>
  <main class="home-view">
    <section class="home-top-container" aria-label="Contenido principal">
      <span class="home-top-container__bar-label home-top-container__bar-label--top">
        Promociones/especiales del mes
      </span>
      <div
        ref="conveyorViewport"
        class="campaign-conveyor-viewport"
        :class="{ 'is-dragging': isDraggingConveyor, 'is-paused': isConveyorPaused }"
        aria-label="Carrusel de campanas"
        @pointerdown="startConveyorDrag"
        @pointermove="dragConveyor"
        @pointerup="stopConveyorDrag"
        @pointercancel="stopConveyorDrag"
        @pointerleave="stopConveyorDrag"
        @touchstart="startConveyorTouch"
        @touchmove="dragConveyorTouch"
        @touchend="stopConveyorTouch"
        @touchcancel="stopConveyorTouch"
      >
        <div class="campaign-conveyor">
          <div
            v-for="(campaign, index) in conveyorCampaigns"
            :key="`${campaign.id}-${index}`"
            class="campaign-conveyor__item"
          >
            <img :src="campaign.image" :alt="campaign.name" />
          </div>
        </div>
      </div>
    </section>

    <section class="home-empty-container" aria-label="Acciones principales">
      <p class="home-action-eyebrow">To eat to share to enjoy</p>
      <div class="home-action-buttons">
        <RouterLink class="home-action-button home-action-button--menu" :to="{ name: 'menu' }">
          Menu digital
        </RouterLink>
        <button class="home-action-button home-action-button--order" type="button" disabled>
          Ordena ahora
        </button>
      </div>
    </section>

    <section class="home-secondary-container" aria-label="Ubicacion">
      <iframe
        class="home-map"
        title="Ubicacion Belly Monster Bites"
        src="https://www.google.com/maps?q=C.%20Rio%20Panuco%203610%2C%20Madero%2C%2088270%20Nuevo%20Laredo%2C%20Tamps.&output=embed"
        allowfullscreen
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
      <a
        class="home-map-link"
        href="https://www.google.com/maps/search/?api=1&query=C.%20Rio%20Panuco%203610%2C%20Madero%2C%2088270%20Nuevo%20Laredo%2C%20Tamps."
        target="_blank"
        rel="noreferrer"
      >
        Abrir mapa
      </a>
    </section>

    <section class="home-reservations-container" aria-label="Reservaciones">
      <span class="home-reservations-container__bar-label">Reservaciones</span>
      <nav class="home-reservations-social" aria-label="Redes sociales">
        <a
          class="home-reservations-social__link"
          href="https://www.instagram.com/bellymonsterbites/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
        >
          <img :src="instagramLogo" alt="" />
        </a>
        <a
          class="home-reservations-social__link"
          href="/"
          aria-label="Facebook"
        >
          <img :src="facebookLogo" alt="" />
        </a>
      </nav>
    </section>

    <section class="home-legal-container" aria-label="Informacion legal">
      <span>&copy; 2026 Belly Monster Bites</span>
      <a href="/">Terminos y condiciones</a>
      <a href="/">Privacidad</a>
      <a href="/">Contacto</a>
    </section>
  </main>
</template>

<style scoped>
.home-view {
  --home-verde-seco: #458753;
  --home-caqui: #c0a55d;
  --home-beige-arena: #e4cfaa;
  --home-terracota: #d97858;
  --home-cafe-claro: #71451f;

  width: 100%;
  min-height: 0;
  align-self: flex-start;
  margin: 0;
  padding: 0;
  line-height: 0;
  background:
    linear-gradient(180deg, var(--home-verde-seco) 0%, #3d794a 100%);
  font-family: var(--font-display);
}

.home-top-container {
  position: relative;
  width: 100%;
  min-height: clamp(250px, 50svh, 460px);
  border: 0;
  border-radius: 0;
  background:
    radial-gradient(circle at 92% 12%, rgb(217 120 88 / 18%), transparent 30%),
    var(--home-beige-arena);
  box-shadow: 0 18px 42px rgb(65 36 15 / 20%);
  overflow: hidden;
  line-height: normal;
}

.home-secondary-container {
  position: relative;
  width: 100%;
  min-height: clamp(240px, 42svh, 420px);
  background:
    radial-gradient(circle at 12% 18%, rgb(217 120 88 / 16%), transparent 32%),
    var(--home-beige-arena);
  box-shadow: 0 18px 42px rgb(65 36 15 / 14%);
  overflow: hidden;
  line-height: normal;
}

.home-empty-container {
  display: grid;
  gap: clamp(22px, 4vw, 36px);
  align-content: center;
  width: 100%;
  min-height: clamp(210px, 34svh, 310px);
  padding: clamp(18px, 4vw, 28px) clamp(28px, 7vw, 56px);
  background: var(--home-beige-arena);
  line-height: normal;
}

.home-action-eyebrow {
  margin: 0;
  color: #76a1c8;
  font-size: clamp(1.1rem, 3.8vw, 1.55rem);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
}

.home-action-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(22px, 6vw, 36px);
}

.home-action-button {
  display: grid;
  aspect-ratio: 1;
  min-height: 0;
  place-items: center;
  border: 0;
  border-radius: clamp(34px, 8vw, 50px);
  color: #ffffff;
  font: inherit;
  font-size: clamp(1.25rem, 4.8vw, 1.65rem);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
}

.home-action-button--menu {
  background: #ef8fa0;
}

.home-action-button--order {
  background: #d4687d;
  cursor: default;
}

.home-map {
  display: block;
  width: 100%;
  min-height: clamp(240px, 42svh, 420px);
  border: 0;
}

.home-map-link {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 2px solid #0f1115;
  border-radius: 6px;
  background: #fff3d7;
  color: #0f1115;
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1;
  text-decoration: none;
}

.home-reservations-container {
  position: relative;
  width: 100%;
  min-height: clamp(220px, 34svh, 360px);
  background: #ffffff;
  line-height: normal;
  overflow: hidden;
}

.home-reservations-container::before,
.home-reservations-container::after {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 1;
  height: 54px;
  background: var(--home-verde-seco);
  content: "";
}

.home-reservations-container::before {
  top: 0;
}

.home-reservations-container::after {
  bottom: 0;
}

.home-reservations-container__bar-label {
  position: absolute;
  top: 0;
  right: 16px;
  left: 16px;
  z-index: 2;
  display: grid;
  height: 54px;
  place-items: center;
  color: #fff3d7;
  font-size: clamp(1.1rem, 3.8vw, 1.65rem);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
  pointer-events: none;
}

.home-reservations-social {
  position: absolute;
  right: 16px;
  bottom: 0;
  left: 16px;
  z-index: 2;
  display: flex;
  height: 54px;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.home-reservations-social__link {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 6px;
  background: #fff3d7;
  text-decoration: none;
}

.home-reservations-social__link img {
  display: block;
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.home-legal-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 22px 18px 26px;
  background: #0f1115;
  color: #fff3d7;
  font-size: clamp(0.78rem, 2.4vw, 0.95rem);
  font-weight: 900;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
}

.home-legal-container a {
  color: inherit;
  text-decoration: none;
}

.home-legal-container a:hover {
  text-decoration: underline;
}

@media (max-width: 520px) {
  .home-empty-container {
    min-height: 0;
    padding: 18px 24px;
  }

  .home-action-buttons {
    gap: 22px;
  }

  .home-action-button {
    border-radius: 34px;
    font-size: 1.18rem;
  }

  .home-action-eyebrow {
    font-size: 1.28rem;
  }

  .home-secondary-container,
  .home-map {
    min-height: 360px;
  }

  .home-map-link {
    right: 10px;
    bottom: 10px;
    min-height: 46px;
    padding: 0 18px;
    font-size: 1rem;
  }
}

.home-top-container::before,
.home-top-container::after {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 2;
  height: 54px;
  background: #0f1115;
  content: "";
}

.home-top-container::before {
  top: 0;
}

.home-top-container::after {
  bottom: 0;
}

.home-top-container__bar-label {
  position: absolute;
  right: 16px;
  left: 16px;
  z-index: 3;
  display: grid;
  height: 54px;
  place-items: center;
  color: #fff3d7;
  font-size: clamp(1rem, 3.4vw, 1.65rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
  pointer-events: none;
}

.home-top-container__bar-label--top {
  top: 0;
}

.home-top-container__bar-label--bottom {
  bottom: 0;
}

.campaign-conveyor-viewport {
  position: absolute;
  top: 54px;
  right: 0;
  bottom: 54px;
  left: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  cursor: grab;
  user-select: none;
}

.campaign-conveyor-viewport.is-dragging {
  cursor: grabbing;
}

.campaign-conveyor-viewport::-webkit-scrollbar {
  display: none;
}

.campaign-conveyor {
  height: 100%;
  display: flex;
  align-items: stretch;
  gap: 2px;
  width: max-content;
  padding: 0;
  background: #0f1115;
  animation: campaign-conveyor-slide 22s linear infinite;
  will-change: transform;
}

.campaign-conveyor-viewport.is-paused .campaign-conveyor {
  animation-play-state: paused;
}

.campaign-conveyor__item {
  position: relative;
  display: grid;
  width: clamp(190px, 48vw, 300px);
  height: 100%;
  place-items: center;
  flex: 0 0 auto;
  background: #0f1115;
  overflow: hidden;
}

.campaign-conveyor__item img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: drop-shadow(0 16px 20px rgb(65 36 15 / 18%));
  pointer-events: none;
  user-select: none;
}

@keyframes campaign-conveyor-slide {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(-50% - 1px));
  }
}
</style>
