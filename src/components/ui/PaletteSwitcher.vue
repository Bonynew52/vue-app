<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  palettes: {
    type: Array,
    required: true,
  },
  activePaletteId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['select'])

const cardElements = ref([])

function setCardElement(element, index) {
  if (element) {
    cardElements.value[index] = element
  }
}

function emitPaletteSelection(index) {
  const isTwoColumn = window.matchMedia('(min-width: 980px)').matches
  const rowStart = isTwoColumn ? index - (index % 2) : index
  const leftPalette = props.palettes[rowStart]
  const rightPalette = props.palettes[rowStart + 1] || leftPalette

  emit('select', props.palettes[index], {
    isTwoColumn,
    leftPalette,
    rightPalette,
  })
}

function selectCenteredPalette() {
  const viewportCenter = window.innerHeight / 2
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY

  cardElements.value.forEach((element, index) => {
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    const cardCenter = rect.top + rect.height / 2
    const distance = Math.abs(cardCenter - viewportCenter)

    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  emitPaletteSelection(closestIndex)
}

let animationFrame = 0

function handleScroll() {
  if (animationFrame) {
    return
  }

  animationFrame = window.requestAnimationFrame(() => {
    selectCenteredPalette()
    animationFrame = 0
  })
}

onMounted(() => {
  selectCenteredPalette()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleScroll)
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
  }
})
</script>

<template>
  <section class="palette-switcher" aria-label="Paletas por imagen">
    <button
      v-for="(palette, index) in palettes"
      :key="palette.id"
      :ref="(element) => setCardElement(element, index)"
      class="palette-card"
      :class="{ active: palette.id === activePaletteId }"
      :style="{
        '--card-first': palette.colors.first,
        '--card-second': palette.colors.second,
        '--card-third': palette.colors.third,
      }"
      type="button"
      @click="emitPaletteSelection(index)"
    >
      <span v-if="palette.placeholder" class="placeholder-image" aria-hidden="true"></span>
      <img v-else :src="palette.image" :alt="palette.name" />
      <span>{{ palette.name }}</span>
    </button>
  </section>
</template>

<style scoped>
.palette-switcher {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: auto;
  gap: clamp(16px, 3vw, 28px);
}

@media (min-width: 980px) {
  .palette-switcher {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.palette-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: stretch;
  width: min(100%, 560px);
  min-height: 560px;
  margin: 0 auto;
  padding: clamp(16px, 2vw, 22px);
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--card-second);
  color: var(--card-third);
  text-align: left;
  transition:
    background-color 420ms ease,
    border-color 420ms ease,
    color 420ms ease;
}

.palette-card.active {
  border-color: var(--card-third);
}

.palette-card img {
  width: 100%;
  height: min(66vw, 460px);
  min-height: 360px;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--card-first);
  object-fit: contain;
}

.placeholder-image {
  display: block;
  width: 100%;
  height: min(66vw, 460px);
  min-height: 360px;
  border-radius: 6px;
  background: var(--card-first);
}

.palette-card span {
  font-weight: 800;
  transition: color 420ms ease;
}

@media (max-width: 760px) {
  .palette-card {
    grid-template-columns: 1fr;
    width: 100%;
    min-height: 410px;
    padding: 20px;
  }

  .palette-card img,
  .placeholder-image {
    width: 100%;
    height: 340px;
    min-height: 340px;
  }
}
</style>
