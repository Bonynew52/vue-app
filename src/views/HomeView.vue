<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import backgroundLogo from '../assets/background/belly_monster_logo.png'
import { campaigns } from '../data/campaigns'

const patternModules = import.meta.glob('../assets/background/background_patterns_transparent/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

const patternImages = Object.entries(patternModules)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath))
  .map(([, image]) => image)
const patternSpriteCount = 30
const rotationLimit = 60
const patternSpeed = 42
const patternSeed =
  typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 100000)
const introContent = {
  eyebrow: 'Belly Monster Bites',
  title: 'El origen de Belly Monster',
  body:
    'Este bloque funciona como un espacio principal para presentar la marca, destacar una campaña activa o dejar un mensaje temporal mientras se define el contenido final. La idea es que tome bastante espacio visual en la parte superior del Home y sirva como entrada antes de mostrar las campañas.',
}

function randomFromSeed(seed) {
  const value = Math.sin(seed * 999.91) * 10000

  return value - Math.floor(value)
}

function randomRange(seed, min, max) {
  return min + randomFromSeed(seed) * (max - min)
}

const activeSection = ref('')
const selectedSection = ref('')
const selectedOrderCampaign = ref(null)
const sectionElements = ref([])
const selectedImageRatio = ref(0.8)
const isLogoIntroVisible = ref(true)
const isHomeReady = ref(false)
const arePatternsReady = ref(false)
const viewportSize = ref({
  width: typeof window === 'undefined' ? 1440 : window.innerWidth,
  height: typeof window === 'undefined' ? 900 : window.innerHeight,
})
const selectedCampaign = computed(() =>
  campaigns.find((campaign) => campaign.id === selectedSection.value),
)
const isIntroSelected = computed(() => selectedSection.value === 'home-intro')
const hasOrderDialog = computed(() => Boolean(selectedOrderCampaign.value))
const patternSprites = computed(() => {
  if (!patternImages.length) {
    return []
  }

  const { width, height } = viewportSize.value

  return Array.from({ length: patternSpriteCount }, (_, spriteIndex) => {
    const seed = patternSeed + spriteIndex + 1
    const image = patternImages[spriteIndex % patternImages.length]
    const size = Math.round(randomRange(seed * 5, 118, 230))
    const startOffset = size * randomRange(seed * 7, 1.1, 2.2)
    const endOffset = size * randomRange(seed * 11, 1.1, 2.2)
    const startEdge = Math.floor(randomFromSeed(seed * 13) * 4)
    const endEdge = (startEdge + 2 + Math.floor(randomFromSeed(seed * 17) * 3)) % 4
    const startPoint = getPatternEdgePoint(startEdge, startOffset, width, height, seed * 19)
    const endPoint = getPatternEdgePoint(endEdge, endOffset, width, height, seed * 23)
    const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
    const duration = distance / patternSpeed
    const rotationStart = randomRange(seed * 29, -rotationLimit, rotationLimit)
    const spinAmount = (randomFromSeed(seed * 31) > 0.5 ? 1 : -1) * randomRange(seed * 37, 110, 310)

    return {
      id: `${image}-${spriteIndex}`,
      image,
      style: {
        '--pattern-start-x': `${startPoint.x}px`,
        '--pattern-start-y': `${startPoint.y}px`,
        '--pattern-end-x': `${endPoint.x}px`,
        '--pattern-end-y': `${endPoint.y}px`,
        '--pattern-size': `${size}px`,
        '--pattern-duration': `${duration}s`,
        '--pattern-delay': `${-randomFromSeed(seed * 41) * duration}s`,
        '--pattern-rotation-start': `${rotationStart}deg`,
        '--pattern-rotation-end': `${rotationStart + spinAmount}deg`,
        '--pattern-z-index': seed + 1,
      },
    }
  })
})

let observer
const homeIntroTimeouts = []
const homeIntroFrames = []

function getPatternEdgePoint(edge, offset, width, height, seed) {
  const x = randomRange(seed, 0.04, 0.96) * width
  const y = randomRange(seed + 3, 0.04, 0.96) * height

  if (edge === 0) {
    return { x, y: -offset }
  }

  if (edge === 1) {
    return { x: width + offset, y }
  }

  if (edge === 2) {
    return { x, y: height + offset }
  }

  return { x: -offset, y }
}

function updateViewportSize() {
  viewportSize.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function setSectionElement(element, id) {
  if (element && !sectionElements.value.some((section) => section.id === id)) {
    sectionElements.value.push({ element, id })
  }
}

function selectSection(id) {
  selectedSection.value = selectedSection.value === id ? '' : id
}

function clearSelectedSection() {
  selectedSection.value = ''
}

function openOrderDialog(campaign) {
  selectedOrderCampaign.value = campaign
  clearSelectedSection()
}

function closeOrderDialog() {
  selectedOrderCampaign.value = null
}

function confirmOrderDialog() {
  // Placeholder: the real ordering flow lives in /ordenar and needs table/item mapping.
}

function closeOrderDialogOnScroll() {
  if (selectedOrderCampaign.value) {
    closeOrderDialog()
  }
}

function updateSelectedImageRatio(event) {
  const { naturalWidth, naturalHeight } = event.target

  if (naturalWidth && naturalHeight) {
    selectedImageRatio.value = naturalWidth / naturalHeight
  }
}

onMounted(() => {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }

  window.scrollTo(0, 0)
  updateViewportSize()
  window.addEventListener('resize', updateViewportSize)
  window.addEventListener('scroll', closeOrderDialogOnScroll, { passive: true })
  homeIntroTimeouts.push(window.setTimeout(() => {
    isLogoIntroVisible.value = false
  }, 1000))
  homeIntroTimeouts.push(window.setTimeout(() => {
    isHomeReady.value = true
  }, 1520))
  homeIntroTimeouts.push(window.setTimeout(() => {
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        arePatternsReady.value = true
      })
      homeIntroFrames.push(secondFrame)
    })
    homeIntroFrames.push(firstFrame)
  }, 2300))

  observer = new IntersectionObserver(
    (entries) => {
      const centeredEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]

      if (centeredEntry) {
        const centeredSectionId = centeredEntry.target.dataset.sectionId
        activeSection.value = centeredSectionId

        if (selectedSection.value && selectedSection.value !== centeredSectionId) {
          selectedSection.value = ''
        }
      }
    },
    {
      root: null,
      rootMargin: '-32% 0px -32% 0px',
      threshold: [0.2, 0.45, 0.7],
    },
  )

  sectionElements.value.forEach(({ element, id }) => {
    element.dataset.sectionId = id
    observer.observe(element)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportSize)
  window.removeEventListener('scroll', closeOrderDialogOnScroll)
  homeIntroTimeouts.forEach((timeout) => window.clearTimeout(timeout))
  homeIntroFrames.forEach((frame) => window.cancelAnimationFrame(frame))
  observer?.disconnect()
})
</script>

<template>
  <main
    class="home-view"
    :class="{ 'is-ready': isHomeReady, 'patterns-ready': arePatternsReady }"
    :style="{ '--home-background-logo': `url(${backgroundLogo})` }"
  >
    <Transition name="home-logo-intro">
      <section v-if="isLogoIntroVisible" class="home-logo-intro" aria-label="Belly Monster Bites">
        <div class="home-logo-intro__card">
          <img :src="backgroundLogo" alt="Belly Monster Bites" />
        </div>
      </section>
    </Transition>

    <div class="home-watermark-pattern" aria-hidden="true">
      <div class="home-watermark-pattern__lines">
        <div v-for="line in 34" :key="line" class="home-watermark-pattern__line">
          <span v-for="item in 48" :key="item">Belly Monster Bites</span>
        </div>
      </div>
    </div>

    <Transition name="order-dismiss">
      <button
        v-if="hasOrderDialog"
        class="order-dialog-backdrop"
        type="button"
        aria-label="Cerrar orden"
        @click="closeOrderDialog"
      ></button>
    </Transition>

    <Transition name="order-dismiss">
      <article
        v-if="selectedOrderCampaign"
        class="order-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-dialog-title"
        @click.stop
      >
        <div class="order-dialog__media">
          <img :src="selectedOrderCampaign.image" :alt="selectedOrderCampaign.name" />
        </div>

        <div class="order-dialog__content">
          <p class="eyebrow">{{ selectedOrderCampaign.eyebrow }}</p>
          <h2 id="order-dialog-title">Quieres ordenar este articulo?</h2>
          <p>{{ selectedOrderCampaign.name }}</p>

          <div class="order-dialog__actions">
            <button type="button" @click="confirmOrderDialog">Si</button>
            <button type="button" @click="closeOrderDialog">No</button>
          </div>
        </div>
      </article>
    </Transition>

    <div class="background-patterns" aria-hidden="true">
      <img
        v-for="sprite in patternSprites"
        :key="sprite.id"
        class="background-pattern"
        :src="sprite.image"
        alt=""
        :style="sprite.style"
      />
    </div>

    <div class="home-shell">
      <div class="home-empty-space" aria-hidden="true"></div>

      <div class="home-stack">
        <section
          :ref="(element) => setSectionElement(element, 'home-intro')"
          class="home-intro focus-section"
          :class="{
            'in-view': activeSection === 'home-intro',
          }"
          aria-label="Presentacion principal"
        >
          <div class="intro-title">
            <p class="eyebrow">{{ introContent.eyebrow }}</p>
            <h1>{{ introContent.title }}</h1>
          </div>

          <div class="intro-text">
            <p>{{ introContent.body }}</p>
          </div>
        </section>

        <h2 class="monthly-dishes-title">Platillos del mes</h2>

        <section class="campaign-list" aria-label="Campanas">
          <article
            v-for="campaign in campaigns"
            :key="campaign.id"
            :ref="(element) => setSectionElement(element, campaign.id)"
            class="campaign-card focus-section"
            :class="{
              'in-view': activeSection === campaign.id,
            }"
            @click.stop="openOrderDialog(campaign)"
          >
            <div class="campaign-media">
              <img :src="campaign.image" :alt="campaign.name" />
            </div>

            <div class="campaign-copy">
              <p class="eyebrow">{{ campaign.eyebrow }}</p>
              <h1>{{ campaign.name }}</h1>
              <p class="description">{{ campaign.description }}</p>
            </div>
          </article>
        </section>
      </div>
    </div>

    <div class="home-footer-spacer" aria-hidden="true"></div>
  </main>
</template>

<style scoped>
.home-view {
  --logo-size: min(78vw, 760px);
  --stage-blue: #8fd3ff;

  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns:
    minmax(clamp(16px, 4vw, 48px), 1fr)
    minmax(0, 1280px)
    minmax(clamp(16px, 4vw, 48px), 1fr);
  width: 100%;
  min-height: max(0px, calc(100svh - var(--app-header-height) - var(--app-footer-min-height)));
  margin: 0;
  padding: clamp(28px, 5vw, 64px) 0 0;
  overflow-x: clip;
}

.home-view > :not(.home-logo-intro) {
  opacity: 0;
  transition: opacity 520ms ease;
}

.home-view.is-ready > :not(.home-logo-intro) {
  opacity: 1;
}

.home-view .background-patterns {
  opacity: 0;
}

.home-view.patterns-ready .background-patterns {
  opacity: 1;
}

.home-logo-intro {
  position: fixed;
  inset: var(--app-header-height) 0 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: var(--color-background);
}

.home-logo-intro__card {
  display: grid;
  place-items: center;
  width: min(72vw, 520px);
  aspect-ratio: 1;
}

.home-logo-intro__card img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.home-logo-intro-enter-active,
.home-logo-intro-leave-active {
  transition:
    opacity 520ms ease,
    filter 520ms ease;
}

.home-logo-intro-enter-from,
.home-logo-intro-leave-to {
  opacity: 0;
  filter: blur(8px);
}

.home-logo-intro-enter-to,
.home-logo-intro-leave-from {
  opacity: 1;
  filter: blur(0);
}

.home-watermark-pattern {
  position: fixed;
  inset: var(--app-header-height) 0 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.home-watermark-pattern__lines {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  gap: clamp(18px, 2.4vmax, 38px);
  width: 300vmax;
  min-width: 300vmax;
  transform: translate(-50%, -50%) rotate(45deg);
  transform-origin: center;
}

.home-watermark-pattern__line {
  display: flex;
  gap: clamp(18px, 2.6vmax, 44px);
  width: max-content;
  white-space: nowrap;
}

.home-watermark-pattern__line:nth-child(even) {
  transform: translateX(clamp(54px, 8vmax, 180px));
}

.home-watermark-pattern__line span {
  color: rgb(255 255 255 / 10%);
  font-family: var(--font-display);
  font-size: clamp(0.5rem, 0.85vw, 0.76rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.background-patterns {
  position: fixed;
  inset: var(--app-header-height) 0 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
  transition: opacity 520ms ease;
}

.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--pattern-size);
  height: var(--pattern-size);
  z-index: var(--pattern-z-index);
  object-fit: cover;
  animation: pattern-travel var(--pattern-duration) linear infinite;
  animation-delay: var(--pattern-delay);
  will-change: transform;
}

.section-focus-backdrop,
.order-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  border: 0;
  background:
    radial-gradient(ellipse at left center, rgb(143 211 255 / 44%), transparent 46%),
    radial-gradient(ellipse at right center, rgb(143 211 255 / 44%), transparent 46%),
    radial-gradient(ellipse at 50% 46%, rgb(143 211 255 / 24%), transparent 42%),
    rgb(7 16 28 / 30%);
  backdrop-filter: blur(10px);
}

.order-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 41;
  display: grid;
  grid-template-columns: minmax(160px, 0.72fr) minmax(220px, 1fr);
  gap: clamp(16px, 4vw, 34px);
  align-items: center;
  width: min(calc(100vw - 32px), 720px);
  padding: clamp(16px, 3vw, 28px);
  border: 2px solid var(--stage-blue);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-third);
  box-shadow:
    0 0 22px rgb(143 211 255 / 58%),
    0 0 76px rgb(143 211 255 / 32%),
    var(--shadow-panel);
  transform: translate(-50%, -50%);
}

.order-dialog__media {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 6px;
  background: #0f1115;
  overflow: hidden;
}

.order-dialog__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-dialog__content {
  display: grid;
  gap: clamp(10px, 2vw, 16px);
}

.order-dialog__content h2 {
  margin: 0;
  color: var(--color-third);
  font-size: clamp(1.7rem, 4vw, 3rem);
  line-height: 0.98;
}

.order-dialog__content p {
  margin: 0;
  color: var(--color-third);
  font-weight: 900;
}

.order-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.order-dialog__actions button {
  min-width: 92px;
  min-height: 44px;
  border: 2px solid var(--stage-blue);
  border-radius: 6px;
  background: #0f1115;
  color: #ffffff;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.order-dialog__actions button:last-child {
  background: var(--color-surface);
  color: var(--color-third);
}

.zoom-fade-enter-active,
.zoom-fade-leave-active {
  transition:
    opacity 360ms ease,
    filter 360ms ease;
}

.zoom-fade-enter-from,
.zoom-fade-leave-to {
  opacity: 0;
  filter: blur(8px);
}

.zoom-fade-enter-to,
.zoom-fade-leave-from {
  opacity: 1;
  filter: blur(0);
}

.order-dismiss-enter-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    filter 160ms ease;
}

.order-dismiss-leave-active {
  transition:
    opacity 90ms ease,
    transform 90ms ease,
    filter 90ms ease;
}

.order-dismiss-enter-from,
.order-dismiss-leave-to {
  opacity: 0;
  filter: blur(4px);
}

.order-dialog.order-dismiss-enter-from,
.order-dialog.order-dismiss-leave-to {
  transform: translate(-50%, -48%) scale(0.98);
}

.order-dismiss-enter-to,
.order-dismiss-leave-from {
  opacity: 1;
  filter: blur(0);
}

.order-dialog.order-dismiss-enter-to,
.order-dialog.order-dismiss-leave-from {
  transform: translate(-50%, -50%) scale(1);
}

.focus-preview {
  --focus-preview-inset: clamp(16px, 4vw, 56px);
  --focus-preview-top-inset: calc(var(--app-header-height) + clamp(16px, 5vw, 64px));

  position: fixed;
  inset:
    var(--focus-preview-top-inset)
    var(--focus-preview-inset)
    var(--focus-preview-inset);
  z-index: 41;
  width: auto;
  max-width: none;
  height: auto;
  max-height: none;
  box-sizing: border-box;
  cursor: pointer;
  overflow: visible;
  filter: saturate(1.06);
}

.focus-preview::before,
.focus-preview::after {
  position: absolute;
  inset: -18px;
  z-index: 0;
  border-radius: inherit;
  content: "";
  pointer-events: none;
}

.focus-preview::before {
  box-shadow:
    -86px 0 112px rgb(143 211 255 / 58%),
    86px 0 112px rgb(143 211 255 / 58%),
    0 -28px 72px rgb(143 211 255 / 34%),
    0 28px 72px rgb(143 211 255 / 34%),
    0 0 110px rgb(143 211 255 / 38%);
  filter: blur(18px);
}

.focus-preview::after {
  border: 2px solid rgb(143 211 255 / 86%);
  background:
    radial-gradient(circle at top left, rgb(143 211 255 / 22%), transparent 18%),
    radial-gradient(circle at top right, rgb(143 211 255 / 22%), transparent 18%),
    radial-gradient(circle at bottom left, rgb(143 211 255 / 22%), transparent 18%),
    radial-gradient(circle at bottom right, rgb(143 211 255 / 22%), transparent 18%);
  box-shadow:
    0 0 20px rgb(143 211 255 / 72%),
    0 0 58px rgb(143 211 255 / 50%),
    0 0 104px rgb(143 211 255 / 30%),
    inset 0 0 22px rgb(143 211 255 / 24%);
}

.focus-preview > * {
  position: relative;
  z-index: 1;
}

.focus-preview.home-intro {
  width: auto;
  min-height: 0;
  box-shadow: none;
}

.focus-preview.home-intro::after {
  background:
    linear-gradient(90deg, transparent, rgb(143 211 255 / 54%) 44%, rgb(143 211 255 / 54%) 56%, transparent),
    radial-gradient(ellipse at center, rgb(143 211 255 / 42%), transparent 62%);
  filter: blur(20px);
}

.focus-preview.home-intro .intro-title,
.focus-preview.home-intro .intro-text {
  box-shadow:
    0 0 18px rgb(143 211 255 / 60%),
    0 0 48px rgb(143 211 255 / 34%);
}

.focus-campaign-preview {
  display: grid;
  grid-template-columns:
    minmax(
      220px,
      min(
        46%,
        calc((min(620px, calc(100svh - var(--app-header-height) - (var(--focus-preview-inset) * 2))) - clamp(28px, 4vw, 44px)) * var(--preview-image-ratio))
      )
    )
    minmax(260px, 1fr);
  gap: clamp(22px, 5vw, 64px);
  align-items: stretch;
  box-sizing: border-box;
  height: auto;
  min-height: 0;
  padding: clamp(14px, 2vw, 22px);
  border: 2px solid var(--stage-blue);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-third);
  box-shadow: var(--shadow-panel);
}

.focus-campaign-preview .campaign-media {
  align-self: stretch;
  height: 100%;
  min-height: 0;
  padding: clamp(8px, 1vw, 16px);
  background: #0f1115;
}

.focus-campaign-preview .campaign-media img {
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 3px;
}

@keyframes pattern-travel {
  from {
    transform:
      translate3d(var(--pattern-start-x), var(--pattern-start-y), 0)
      rotate(var(--pattern-rotation-start));
  }

  to {
    transform:
      translate3d(var(--pattern-end-x), var(--pattern-end-y), 0)
      rotate(var(--pattern-rotation-end));
  }
}

.home-shell {
  position: relative;
  grid-column: 2;
  width: min(100% - 32px, 1180px);
  margin: 0 auto;
  background: transparent;
  box-shadow: var(--shadow-panel);
  overflow: visible;
}

.focus-section {
  position: relative;
  z-index: 2;
  cursor: default;
  overflow: visible;
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 260ms ease,
    transform 280ms ease,
    box-shadow 280ms ease,
    filter 280ms ease;
}

.focus-section::before,
.focus-section::after {
  position: absolute;
  inset: -18px;
  z-index: 0;
  border-radius: inherit;
  opacity: 0;
  content: "";
  pointer-events: none;
  transition: none;
}

.focus-section::before {
  box-shadow:
    -86px 0 112px rgb(143 211 255 / 58%),
    86px 0 112px rgb(143 211 255 / 58%),
    0 -28px 72px rgb(143 211 255 / 34%),
    0 28px 72px rgb(143 211 255 / 34%),
    0 0 110px rgb(143 211 255 / 38%);
  filter: blur(18px);
}

.focus-section::after {
  border: 2px solid rgb(143 211 255 / 86%);
  background:
    radial-gradient(circle at top left, rgb(143 211 255 / 22%), transparent 18%),
    radial-gradient(circle at top right, rgb(143 211 255 / 22%), transparent 18%),
    radial-gradient(circle at bottom left, rgb(143 211 255 / 22%), transparent 18%),
    radial-gradient(circle at bottom right, rgb(143 211 255 / 22%), transparent 18%);
  box-shadow:
    0 0 20px rgb(143 211 255 / 72%),
    0 0 58px rgb(143 211 255 / 50%),
    0 0 104px rgb(143 211 255 / 30%),
    inset 0 0 22px rgb(143 211 255 / 24%);
}

.focus-section.in-view {
  transform: scale(1.025);
}

.focus-section.is-selected {
  opacity: 0;
  filter: blur(8px);
}

.focus-section > * {
  position: relative;
  z-index: 1;
}

.home-empty-space {
  width: 100%;
  min-height: 16.66vh;
  background: transparent;
}

.home-stack {
  display: grid;
  gap: clamp(22px, 4vw, 38px);
  width: 100%;
  padding: clamp(20px, 4vw, 46px) 0;
}

.home-intro {
  --intro-gap: clamp(12px, 2.5vw, 24px);

  display: grid;
  grid-template-columns: 1fr;
  gap: var(--intro-gap);
  align-items: start;
  justify-items: center;
  width: 100%;
  min-height: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  overflow: visible;
}

.intro-title,
.intro-text {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  border: 2px solid var(--stage-blue);
  border-radius: 6px;
  padding: clamp(22px, 4vw, 44px);
  box-shadow: none;
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.intro-title {
  width: min(100%, 620px);
  background: #0f1115;
  color: #ffffff;
  cursor: pointer;
}

.intro-title h1 {
  color: #ffffff;
}

.intro-text {
  width: min(100%, 760px);
  background: #f6f2ee;
  color: #0f1115;
  cursor: pointer;
}

.intro-text p {
  max-width: none;
  margin: 0;
  color: #0f1115;
  font-size: clamp(1.15rem, 2vw, 1.65rem);
  font-weight: 800;
  line-height: 1.35;
}

.monthly-dishes-title {
  width: min(100%, 760px);
  margin: clamp(4px, 1vw, 10px) auto 0;
  color: #ffffff;
  font-size: clamp(2.3rem, 7vw, 5.5rem);
  line-height: 0.9;
}

.campaign-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(18px, 3vw, 30px);
  width: 100%;
}

.campaign-card {
  display: grid;
  grid-template-columns: minmax(280px, 0.92fr) minmax(260px, 1fr);
  gap: clamp(22px, 5vw, 64px);
  align-items: center;
  width: 100%;
  min-height: clamp(430px, 58vw, 680px);
  padding: clamp(16px, 2.4vw, 28px);
  border: 2px solid var(--stage-blue);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-third);
  box-shadow: var(--shadow-panel);
  overflow: visible;
  cursor: pointer;
}

.campaign-media {
  display: grid;
  place-items: center;
  width: 100%;
  height: clamp(390px, 54vw, 620px);
  border-radius: 6px;
  background: #0f1115;
  overflow: hidden;
}

.campaign-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.home-footer-spacer {
  grid-column: 1 / -1;
  min-height: 16.66vh;
  background: transparent;
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 11ch;
  margin: 0;
  font-size: clamp(2.5rem, 6vw, 6rem);
  line-height: 0.92;
}

.description {
  max-width: 34rem;
  margin: clamp(18px, 3vw, 30px) 0 0;
  color: #0f1115;
  font-size: clamp(1.1rem, 2vw, 1.55rem);
  font-weight: 800;
  line-height: 1.25;
}

.focus-preview.home-intro {
  width: auto;
  min-height: 0;
}

@media (max-width: 820px) {
  .order-dialog {
    grid-template-columns: 1fr;
    width: min(calc(100vw - 28px), 460px);
    max-height: calc(100svh - var(--app-header-height) - 28px);
    overflow: auto;
  }

  .order-dialog__media {
    max-height: 42svh;
  }

  .focus-preview {
    --focus-preview-inset: clamp(14px, 4vw, 28px);
    --focus-preview-top-inset: calc(var(--app-header-height) + clamp(14px, 4vw, 28px));

    overflow: hidden;
  }

  .focus-campaign-preview {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 72%) minmax(0, 28%);
    gap: clamp(12px, 3vw, 20px);
  }

  .focus-campaign-preview .campaign-media {
    height: 100%;
    min-height: 0;
  }

  .focus-campaign-preview .campaign-copy {
    min-height: 0;
    overflow: hidden;
  }

  .focus-campaign-preview h1 {
    font-size: clamp(1.75rem, 8vw, 2.65rem);
    line-height: 0.98;
  }

  .focus-campaign-preview .description {
    margin-top: clamp(8px, 2vw, 12px);
    font-size: clamp(0.82rem, 3.7vw, 1.05rem);
    line-height: 1.12;
  }

  .home-intro {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .campaign-card {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .campaign-media {
    height: clamp(360px, 110vw, 620px);
  }

  h1 {
    max-width: none;
  }
}

@media (max-width: 520px) {
  .focus-preview {
    --focus-preview-inset: 14px;
    --focus-preview-top-inset: calc(var(--app-header-height) + 14px);
  }

  .focus-campaign-preview {
    padding: 14px;
    grid-template-rows: minmax(0, 73%) minmax(0, 27%);
    gap: 10px;
  }

  .home-stack {
    padding: 14px;
  }

  .campaign-card {
    padding: 14px;
  }

  .campaign-media {
    height: 360px;
  }

  .description {
    font-size: 1.05rem;
  }
}
</style>
