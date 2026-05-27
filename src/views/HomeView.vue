<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import backgroundLogo from '../assets/background/belly_monster_logo-removed.png'
import { campaigns } from '../data/campaigns'

const patternModules = import.meta.glob('../assets/background/background_patterns_transparent/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

const patternImages = Object.values(patternModules)
const patternSpriteCount = 30
const rotationLimit = 60
const patternSpeed = 42
const introContent = {
  eyebrow: 'Belly Monster Bites',
  title: 'Postres con presencia',
  body:
    'Este bloque funciona como un espacio principal para presentar la marca, destacar una campana activa o dejar un mensaje temporal mientras se define el contenido final. La idea es que tome bastante espacio visual en la parte superior del Home y sirva como entrada antes de mostrar las campanas.',
}

function randomFromSeed(seed) {
  const value = Math.sin(seed * 999.91) * 10000

  return value - Math.floor(value)
}

const activeSection = ref('')
const selectedSection = ref('')
const sectionElements = ref([])
const selectedImageRatio = ref(0.8)
const viewportSize = ref({
  width: typeof window === 'undefined' ? 1440 : window.innerWidth,
  height: typeof window === 'undefined' ? 900 : window.innerHeight,
})
const selectedCampaign = computed(() =>
  campaigns.find((campaign) => campaign.id === selectedSection.value),
)
const isIntroSelected = computed(() => selectedSection.value === 'home-intro')
const patternSprites = computed(() => {
  if (!patternImages.length) {
    return []
  }

  const { width, height } = viewportSize.value

  return Array.from({ length: patternSpriteCount }, (_, spriteIndex) => {
    const seed = spriteIndex + 1
    const image = patternImages[Math.floor(randomFromSeed(seed * 3) * patternImages.length)]
    const size = 78 + Math.round(randomFromSeed(seed * 5) * 72)
    const verticalLane = height * (0.06 + randomFromSeed(seed * 7) * 0.84)
    const drift = (randomFromSeed(seed * 11) * 2 - 1) * height * 0.18
    const startFromLeft = randomFromSeed(seed * 13) > 0.5
    const startOffset = size * (1.1 + randomFromSeed(seed * 17) * 1.2)
    const endOffset = size * (1.1 + randomFromSeed(seed * 19) * 1.2)
    const startX = startFromLeft ? -startOffset : width + startOffset
    const endX = startFromLeft ? width + endOffset : -endOffset
    const endY = verticalLane + drift
    const distance = Math.hypot(endX - startX, endY - verticalLane)
    const duration = distance / patternSpeed
    const rotationStart = -rotationLimit + randomFromSeed(seed * 23) * (rotationLimit * 2)
    const spinAmount = (randomFromSeed(seed * 29) > 0.5 ? 1 : -1) * (90 + randomFromSeed(seed * 31) * 180)

    return {
      id: `${image}-${spriteIndex}`,
      image,
      style: {
        '--pattern-start-x': `${startX}px`,
        '--pattern-start-y': `${verticalLane}px`,
        '--pattern-end-x': `${endX}px`,
        '--pattern-end-y': `${endY}px`,
        '--pattern-size': `${size}px`,
        '--pattern-duration': `${duration}s`,
        '--pattern-delay': `${-randomFromSeed(seed * 37) * duration}s`,
        '--pattern-rotation-start': `${rotationStart}deg`,
        '--pattern-rotation-end': `${rotationStart + spinAmount}deg`,
        '--pattern-z-index': seed + 1,
      },
    }
  })
})

let observer

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

function updateSelectedImageRatio(event) {
  const { naturalWidth, naturalHeight } = event.target

  if (naturalWidth && naturalHeight) {
    selectedImageRatio.value = naturalWidth / naturalHeight
  }
}

onMounted(() => {
  updateViewportSize()
  window.addEventListener('resize', updateViewportSize)

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
  observer?.disconnect()
})
</script>

<template>
  <main class="home-view" :style="{ '--home-background-logo': `url(${backgroundLogo})` }">
    <Transition name="zoom-fade">
      <button
        v-if="selectedSection"
        class="section-focus-backdrop"
        type="button"
        aria-label="Cerrar enfoque"
        @click="clearSelectedSection"
      ></button>
    </Transition>

    <Transition name="zoom-fade">
      <section
        v-if="isIntroSelected"
        class="focus-preview home-intro"
        aria-label="Presentacion principal seleccionada"
        @click.stop="clearSelectedSection"
      >
        <div class="intro-title">
          <p class="eyebrow">{{ introContent.eyebrow }}</p>
          <h1>{{ introContent.title }}</h1>
        </div>

        <div class="intro-text">
          <p>{{ introContent.body }}</p>
        </div>
      </section>

      <article
        v-else-if="selectedCampaign"
        class="focus-preview focus-campaign-preview"
        :style="{ '--preview-image-ratio': selectedImageRatio }"
        @click.stop="clearSelectedSection"
      >
        <div class="campaign-media">
          <img
            :src="selectedCampaign.image"
            :alt="selectedCampaign.name"
            @load="updateSelectedImageRatio"
          />
        </div>

        <div class="campaign-copy">
          <p class="eyebrow">{{ selectedCampaign.eyebrow }}</p>
          <h1>{{ selectedCampaign.name }}</h1>
          <p class="description">{{ selectedCampaign.description }}</p>
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
          @click.stop="selectSection('home-intro')"
        >
          <div class="intro-title">
            <p class="eyebrow">{{ introContent.eyebrow }}</p>
            <h1>{{ introContent.title }}</h1>
          </div>

          <div class="intro-text">
            <p>{{ introContent.body }}</p>
          </div>
        </section>

        <section class="campaign-list" aria-label="Campanas">
          <article
            v-for="campaign in campaigns"
            :key="campaign.id"
            :ref="(element) => setSectionElement(element, campaign.id)"
            class="campaign-card focus-section"
            :class="{
              'in-view': activeSection === campaign.id,
            }"
            @click.stop="selectSection(campaign.id)"
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

.home-view::before {
  position: fixed;
  top: calc(var(--app-header-height) + 12svh + (var(--logo-size) * 52 / 225));
  left: calc(50% - (var(--logo-size) / 2) + (var(--logo-size) * 42 / 225));
  z-index: 0;
  width: calc(var(--logo-size) * 68 / 225);
  height: calc(var(--logo-size) * 68 / 225);
  border-radius: 999px;
  background: #ffffff;
  box-shadow: calc(var(--logo-size) * 72 / 225) 0 0 #ffffff;
  content: "";
  pointer-events: none;
}

.home-view::after {
  position: fixed;
  inset: var(--app-header-height) 0 0;
  z-index: 1;
  background-image: var(--home-background-logo);
  background-repeat: no-repeat;
  background-position: center 12vh;
  background-size: var(--logo-size) auto;
  content: "";
  pointer-events: none;
}

.background-patterns {
  position: fixed;
  inset: var(--app-header-height) 0 0;
  z-index: 1;
  overflow: hidden;
  opacity: 0.18;
  pointer-events: none;
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

.section-focus-backdrop {
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
  width: 100%;
  background: transparent;
  box-shadow: var(--shadow-panel);
  overflow: visible;
}

.focus-section {
  position: relative;
  z-index: 2;
  cursor: pointer;
  overflow: visible;
  transform: scale(1);
  transition:
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
  padding: clamp(22px, 4vw, 52px);
}

.home-intro {
  --intro-gap: clamp(20px, 4vw, 48px);

  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(280px, 1.1fr);
  gap: var(--intro-gap);
  align-items: stretch;
  width: 100%;
  min-height: clamp(360px, 45vw, 560px);
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
  min-height: 100%;
  border: 2px solid var(--stage-blue);
  border-radius: 6px;
  padding: clamp(22px, 4vw, 44px);
  box-shadow: none;
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.intro-title {
  background: #0f1115;
  color: #ffffff;
}

.intro-title h1 {
  color: #ffffff;
}

.intro-text {
  background: #f6f2ee;
  color: #0f1115;
}

.intro-text p {
  max-width: 46rem;
  margin: 0;
  color: #0f1115;
  font-size: clamp(1.15rem, 2vw, 1.65rem);
  font-weight: 800;
  line-height: 1.35;
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
