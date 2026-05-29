<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatMXN } from '../utils/formatPrice'
import { menuCategories } from '../data/menu'

const sectionPalettes = [
  { primary: '#f0d8c8', secondary: '#fff8f2', tertiary: '#7a4d35' },
  { primary: '#dfebf2', secondary: '#ffffff', tertiary: '#426a78' },
  { primary: '#f0d8c8', secondary: '#fff8f2', tertiary: '#7a4d35' },
  { primary: '#dfebf2', secondary: '#ffffff', tertiary: '#426a78' },
  { primary: '#ffffff', secondary: '#eaf7fb', tertiary: '#9a6a4d' },
  { primary: '#e8dce7', secondary: '#fff8ff', tertiary: '#7d5876' },
]

const fallbackSections = Array.from({ length: 6 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  name: `Seccion ${index + 1}`,
  items: Array.from({ length: 8 }, (__, itemIndex) => ({
    id: `placeholder-${index + 1}-${itemIndex + 1}`,
    name: `Producto ${itemIndex + 1}`,
    description: 'Espacio temporal para acomodar productos del menu.',
    price: 0,
    hasPrice: false,
    image: '',
  })),
}))

const menuSections = computed(() => {
  const sections = menuCategories
    .filter((category) => category.items?.length)
    .slice(0, 6)

  if (sections.length >= 6) {
    return sections
  }

  return [...sections, ...fallbackSections.slice(sections.length)]
})

const displayedMenuSections = computed(() => {
  const sections = [...menuSections.value]

  if (sections.length >= 4) {
    ;[sections[2], sections[3]] = [sections[3], sections[2]]
  }

  return sections
})

const sectionElements = ref([])
const selectedItem = ref(null)
const selectedPreviewPosition = ref({ x: 0, y: 0 })
let paletteFrame = 0
let activePaletteIndex = -1

function setSectionElement(element, index) {
  if (element) {
    sectionElements.value[index] = element
  }
}

function applySectionPalette(index = 0) {
  const palette = sectionPalettes[index % sectionPalettes.length]
  const root = document.documentElement

  root.style.setProperty('--background-left', palette.primary)
  root.style.setProperty('--background-right', palette.primary)
  root.style.setProperty('--color-first', palette.primary)
  root.style.setProperty('--color-second', palette.secondary)
  root.style.setProperty('--color-third', palette.tertiary)
  root.style.setProperty('--color-background', palette.primary)
  root.style.setProperty('--color-surface', palette.secondary)
  root.style.setProperty('--color-surface-muted', palette.primary)
  root.style.setProperty('--color-primary', palette.tertiary)
  root.style.setProperty('--color-secondary', palette.secondary)
  root.style.setProperty('--color-secondary-dark', palette.tertiary)
  root.style.setProperty('--color-accent', palette.tertiary)
  root.style.setProperty('--color-highlight', palette.secondary)
  root.style.setProperty('--color-text', palette.tertiary)
  root.style.setProperty('--color-text-muted', palette.tertiary)
  root.style.setProperty('--color-border', palette.tertiary)
}

function priceLabel(item) {
  return item.hasPrice ? formatMXN(item.price) : 'Precio por confirmar'
}

const selectedPreviewStyle = computed(() => ({
  '--preview-x': `${selectedPreviewPosition.value.x}px`,
  '--preview-y': `${selectedPreviewPosition.value.y}px`,
}))

function selectItem(item) {
  selectedPreviewPosition.value = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }
  selectedItem.value = selectedItem.value?.id === item.id ? null : item
}

function clearSelectedItem() {
  selectedItem.value = null
}

function syncActivePalette() {
  paletteFrame = 0
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0

  if (scrollTop <= 4) {
    activePaletteIndex = 0
    applySectionPalette(0)

    return
  }

  const activationLine = window.innerHeight * 0.62
  const sections = sectionElements.value.filter(Boolean)
  const activeSection = sections.find((element) => {
    const rect = element.getBoundingClientRect()

    return rect.top <= activationLine && rect.bottom >= activationLine
  })

  if (!activeSection) {
    return
  }

  const nextIndex = Number(activeSection.dataset.sectionIndex || 0)

  if (nextIndex !== activePaletteIndex) {
    activePaletteIndex = nextIndex
    applySectionPalette(nextIndex)
  }
}

function requestPaletteSync() {
  if (!paletteFrame) {
    paletteFrame = window.requestAnimationFrame(syncActivePalette)
  }
}

function handleWindowScroll() {
  clearSelectedItem()
  requestPaletteSync()
}

onMounted(() => {
  applySectionPalette(0)
  activePaletteIndex = -1

  sectionElements.value.forEach((element, index) => {
    element.dataset.sectionIndex = String(index)
  })

  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  window.addEventListener('resize', requestPaletteSync)
  window.requestAnimationFrame(syncActivePalette)
  window.setTimeout(syncActivePalette, 80)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowScroll)
  window.removeEventListener('resize', requestPaletteSync)

  if (paletteFrame) {
    window.cancelAnimationFrame(paletteFrame)
  }
})
</script>

<template>
  <main class="menu-view">
    <Teleport to="body">
      <Transition name="backdrop-fade">
        <button
          v-if="selectedItem"
          class="item-preview-backdrop"
          type="button"
          aria-label="Cerrar producto seleccionado"
          @click="clearSelectedItem"
        ></button>
      </Transition>

      <Transition name="item-preview-fade">
        <aside
          v-if="selectedItem"
          class="item-preview"
          :style="selectedPreviewStyle"
          :aria-label="`Producto seleccionado: ${selectedItem.name}`"
          @click="clearSelectedItem"
        >
          <img v-if="selectedItem.image" :src="selectedItem.image" :alt="selectedItem.name" />
          <span v-else aria-hidden="true"></span>
        </aside>
      </Transition>
    </Teleport>

    <section
      v-for="(section, sectionIndex) in displayedMenuSections"
      :key="section.id"
      :ref="(element) => setSectionElement(element, sectionIndex)"
      class="menu-section"
      :aria-label="section.name"
    >
      <header class="section-header">
        <p>Menu</p>
        <h1>{{ section.name }}</h1>
      </header>

      <div
        class="section-rail"
        tabindex="0"
        :aria-label="`Productos de ${section.name}`"
        @scroll.passive="clearSelectedItem"
      >
        <article
          v-for="item in section.items"
          :key="item.id"
          class="menu-card"
          role="button"
          tabindex="0"
          @click="selectItem(item)"
          @keydown.enter.prevent="selectItem(item)"
          @keydown.space.prevent="selectItem(item)"
        >
          <div class="menu-card__image">
            <img v-if="item.image" :src="item.image" :alt="item.name" />
            <span v-else aria-hidden="true"></span>
          </div>

          <div class="menu-card__copy">
            <h2>{{ item.name }}</h2>
            <p>{{ item.description || 'Descripcion temporal del producto.' }}</p>
            <strong>{{ priceLabel(item) }}</strong>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.menu-view {
  position: relative;
  display: grid;
  gap: clamp(34px, 7vw, 72px);
  width: min(100%, 1440px);
  min-height: max(0px, calc(100svh - var(--app-header-height) - var(--app-footer-min-height)));
  margin: 0 auto;
  padding: clamp(28px, 5vw, 64px) 0 clamp(38px, 7vw, 78px);
  animation: menu-fade-in 520ms ease both;
}

.item-preview-backdrop {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100svh;
  z-index: 35;
  border: 0;
  background: rgb(15 17 21 / 42%);
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.item-preview {
  position: fixed;
  top: var(--preview-y);
  left: var(--preview-x);
  z-index: 36;
  display: grid;
  place-items: center;
  width: min(620px, calc(100vw - 32px));
  height: min(420px, calc(100svh - 32px));
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-surface) 86%, transparent);
  box-shadow: 0 24px 82px rgb(15 17 21 / 34%);
  overflow: hidden;
  transform: translate(-50%, -50%);
}

.item-preview img,
.item-preview span {
  width: min(72%, 540px);
  max-height: 72%;
  object-fit: contain;
  opacity: 0.34;
}

.item-preview span {
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 42% 38%, #ffffff 0 12%, transparent 13%),
    radial-gradient(circle at 58% 38%, #ffffff 0 12%, transparent 13%),
    var(--color-border);
}

.menu-section {
  display: grid;
  gap: clamp(16px, 3vw, 24px);
}

.section-header {
  width: min(100% - 32px, 1180px);
  margin: 0 auto;
  color: var(--color-text);
  transition: color 520ms ease;
}

.section-header p {
  margin: 0 0 8px;
  color: var(--color-text);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
  transition: color 520ms ease;
}

.section-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(2rem, 6vw, 4.75rem);
  line-height: 0.95;
  transition: color 520ms ease;
}

.section-rail {
  display: grid;
  grid-auto-columns: minmax(260px, 340px);
  grid-auto-flow: column;
  gap: clamp(14px, 2.4vw, 24px);
  width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-padding-inline: max(16px, calc((100vw - 1180px) / 2));
  scroll-snap-type: x proximity;
  padding: 4px max(16px, calc((100vw - 1180px) / 2)) 20px;
}

.section-rail:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-border) 45%, transparent);
  outline-offset: -3px;
}

.section-rail::-webkit-scrollbar {
  height: 10px;
}

.section-rail::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--color-secondary) 55%, transparent);
}

.section-rail::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--color-border);
}

.menu-card {
  display: grid;
  grid-template-rows: 260px 1fr;
  min-height: 470px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
  scroll-snap-align: start;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background-color 520ms ease,
    border-color 520ms ease,
    color 520ms ease;
}

.menu-card:hover,
.menu-card:focus-visible {
  transform: translateY(-3px);
}

.menu-card:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-border) 45%, transparent);
  outline-offset: 3px;
}

.menu-card__image {
  display: grid;
  place-items: center;
  min-height: 0;
  background: var(--color-primary);
  overflow: hidden;
  transition: background-color 520ms ease;
}

.menu-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.menu-card__image span {
  width: 56%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 42% 38%, #ffffff 0 12%, transparent 13%),
    radial-gradient(circle at 58% 38%, #ffffff 0 12%, transparent 13%),
    var(--color-border);
  transition: background-color 520ms ease;
}

.menu-card__copy {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 18px;
}

.menu-card__copy h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.35rem;
  line-height: 1.05;
  transition: color 520ms ease;
}

.menu-card__copy p {
  display: -webkit-box;
  min-height: 3.6em;
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-weight: 700;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  transition: color 520ms ease;
}

.menu-card__copy strong {
  margin-top: 4px;
  color: var(--color-text);
  font-size: 1.05rem;
  font-weight: 900;
  transition: color 520ms ease;
}

@keyframes menu-fade-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 180ms ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.backdrop-fade-enter-to,
.backdrop-fade-leave-from {
  opacity: 1;
}

.item-preview-fade-enter-active,
.item-preview-fade-leave-active {
  transition:
    opacity 280ms ease,
    transform 280ms ease,
    filter 280ms ease;
}

.item-preview-fade-enter-from,
.item-preview-fade-leave-to {
  opacity: 0;
  filter: blur(8px);
  transform: translate(-50%, -50%) scale(0.97);
}

.item-preview-fade-enter-to,
.item-preview-fade-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translate(-50%, -50%) scale(1);
}

@media (max-width: 640px) {
  .menu-view {
    gap: 38px;
  }

  .section-rail {
    grid-auto-columns: minmax(230px, 82vw);
    padding-inline: 16px;
    scroll-padding-inline: 16px;
  }

  .menu-card {
    grid-template-rows: 230px 1fr;
    min-height: 430px;
  }
}
</style>
