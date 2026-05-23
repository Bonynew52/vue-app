<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import backgroundLogo from '../assets/background/belly_monster_logo-removed.png'
import { campaigns } from '../data/campaigns'

const patternModules = import.meta.glob('../assets/background/background_patterns/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

const patternImages = Object.values(patternModules)
const spritesPerImage = 24
const rotationLimit = 60

const patternSprites = patternImages.flatMap((image, imageIndex) =>
  Array.from({ length: spritesPerImage }, (_, spriteIndex) => {
    const seed = imageIndex * spritesPerImage + spriteIndex
    const verticalLane = 8 + ((seed * 23) % 78)
    const drift = ((seed * 17) % 28) - 14
    const startFromLeft = seed % 2 === 0
    const startX = startFromLeft ? -28 - (seed % 3) * 14 : 112 + (seed % 3) * 14
    const endX = startFromLeft ? 112 + (seed % 4) * 12 : -34 - (seed % 4) * 12
    const rotationStart = -rotationLimit + ((seed * 37) % (rotationLimit * 2 + 1))
    const spinAmount = (seed % 2 === 0 ? 1 : -1) * (120 + ((seed * 29) % 121))

    return {
      id: `${imageIndex}-${spriteIndex}`,
      image,
      style: {
        '--pattern-start-x': `${startX}vw`,
        '--pattern-start-y': `${verticalLane}vh`,
        '--pattern-end-x': `${endX}vw`,
        '--pattern-end-y': `${verticalLane + drift}vh`,
        '--pattern-size': `${86 + ((seed * 19) % 52)}px`,
        '--pattern-duration': `${24 + ((seed * 7) % 18)}s`,
        '--pattern-delay': `${-(spriteIndex * 0.9 + ((seed * 11) % 7) / 10)}s`,
        '--pattern-rotation-start': `${rotationStart}deg`,
        '--pattern-rotation-end': `${rotationStart + spinAmount}deg`,
        '--pattern-z-index': seed + 1,
      },
    }
  }),
)

const activeSection = ref('')
const selectedSection = ref('')
const sectionElements = ref([])

let observer

function setSectionElement(element, id) {
  if (element) {
    sectionElements.value.push({ element, id })
  }
}

function selectSection(id) {
  selectedSection.value = selectedSection.value === id ? '' : id
}

function clearSelectedSection() {
  selectedSection.value = ''
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const centeredEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]

      if (centeredEntry) {
        activeSection.value = centeredEntry.target.dataset.sectionId
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
  observer?.disconnect()
})
</script>

<template>
  <main class="home-view" :style="{ '--home-background-logo': `url(${backgroundLogo})` }">
    <button
      v-if="selectedSection"
      class="section-focus-backdrop"
      type="button"
      aria-label="Cerrar enfoque"
      @click="clearSelectedSection"
    ></button>

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
            selected: selectedSection === 'home-intro',
          }"
          aria-label="Presentacion principal"
          @click="selectSection('home-intro')"
        >
          <div class="intro-title">
            <p class="eyebrow">Belly Monster Bites</p>
            <h1>Postres con presencia</h1>
          </div>

          <div class="intro-text">
            <p>
              Este bloque funciona como un espacio principal para presentar la marca,
              destacar una campana activa o dejar un mensaje temporal mientras se define
              el contenido final. La idea es que tome bastante espacio visual en la parte
              superior del Home y sirva como entrada antes de mostrar las campanas.
            </p>
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
              selected: selectedSection === campaign.id,
            }"
            @click="selectSection(campaign.id)"
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

    <footer class="footer-shell">
      <div class="site-footer">
        <span>&copy; 2026 Belly Monster Bites</span>
        <a href="/">Terminos y condiciones</a>
        <a href="/">Privacidad</a>
        <a href="/">Contacto</a>
      </div>
    </footer>
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
  min-height: calc(100vh - 100px);
  margin: 0;
  padding: clamp(28px, 5vw, 64px) 0 0;
}

.home-view::before {
  position: fixed;
  top: calc(100px + 12vh + (var(--logo-size) * 52 / 225));
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
  inset: 100px 0 0;
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
  inset: 100px 0 0;
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
  z-index: 4;
  border: 0;
  background:
    radial-gradient(ellipse at left center, rgb(143 211 255 / 44%), transparent 46%),
    radial-gradient(ellipse at right center, rgb(143 211 255 / 44%), transparent 46%),
    radial-gradient(ellipse at 50% 46%, rgb(143 211 255 / 24%), transparent 42%),
    rgb(7 16 28 / 30%);
  backdrop-filter: blur(10px);
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
  overflow: hidden;
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
  inset: -34px;
  z-index: 0;
  border-radius: inherit;
  opacity: 0;
  content: "";
  pointer-events: none;
  transition: opacity 280ms ease;
}

.focus-section::before {
  background:
    linear-gradient(90deg, rgb(143 211 255 / 70%), transparent 28% 72%, rgb(143 211 255 / 70%)),
    radial-gradient(ellipse at left center, rgb(143 211 255 / 55%), transparent 64%),
    radial-gradient(ellipse at right center, rgb(143 211 255 / 55%), transparent 64%);
  filter: blur(26px);
}

.focus-section::after {
  border: 2px solid rgb(143 211 255 / 86%);
  box-shadow:
    0 0 20px rgb(143 211 255 / 75%),
    0 0 58px rgb(143 211 255 / 55%),
    0 0 110px rgb(143 211 255 / 34%),
    inset 0 0 22px rgb(143 211 255 / 24%);
}

.focus-section.in-view {
  transform: scale(1.025);
}

.focus-section.selected::before,
.focus-section.selected::after {
  opacity: 1;
}

.focus-section.selected {
  z-index: 5;
  transform: scale(1.04);
  box-shadow:
    var(--shadow-panel),
    0 0 0 2px rgb(143 211 255 / 70%),
    0 0 42px rgb(143 211 255 / 70%),
    0 0 120px rgb(143 211 255 / 44%);
  filter: saturate(1.06);
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
  padding: clamp(16px, 2.4vw, 28px);
}

.home-intro {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(280px, 1.1fr);
  gap: clamp(20px, 4vw, 48px);
  align-items: stretch;
  width: 100%;
  min-height: clamp(360px, 45vw, 560px);
  border: 2px solid var(--stage-blue);
  border-radius: 8px;
  background: var(--color-surface);
  overflow: visible;
}

.intro-title,
.intro-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
  border-radius: 6px;
  padding: clamp(22px, 4vw, 44px);
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

.footer-shell {
  position: relative;
  grid-column: 1 / -1;
  z-index: 4;
  width: 100vw;
  min-height: clamp(360px, 42vw, 620px);
  display: grid;
  place-items: center;
  padding: clamp(34px, 7vw, 72px) clamp(20px, 5vw, 56px);
  border-top: 2px solid var(--stage-blue);
  background: #0f1115;
}

.site-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 22px;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  margin: 0 auto;
  padding: 24px 0;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 700;
}

.site-footer a {
  color: #ffffff;
  text-decoration: none;
}

.site-footer a:hover {
  text-decoration: underline;
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

@media (max-width: 820px) {
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
