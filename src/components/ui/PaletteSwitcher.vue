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

  emit('select', props.palettes[closestIndex])
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
      type="button"
      @click="emit('select', palette)"
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
  gap: 16px;
}

@media (min-width: 980px) {
  .palette-switcher {
    grid-template-columns: minmax(0, 1fr);
  }
}

.palette-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: stretch;
  width: min(100%, 66.666%);
  min-height: 620px;
  margin: 0 auto;
  padding: 24px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--color-surface-muted);
  color: var(--color-text);
  text-align: left;
  transition:
    background-color 420ms ease,
    border-color 420ms ease,
    color 420ms ease;
}

.palette-card.active {
  border-color: var(--color-text);
}

.palette-card img {
  width: 100%;
  height: 520px;
  min-height: 520px;
  flex-shrink: 0;
  border-radius: 6px;
  object-fit: cover;
}

.placeholder-image {
  display: block;
  width: 100%;
  height: 520px;
  min-height: 520px;
  border-radius: 6px;
  background: #000000;
}

.palette-card span {
  font-weight: 800;
  transition: color 420ms ease;
}

@media (max-width: 760px) {
  .palette-card {
    grid-template-columns: 1fr;
    width: 100%;
    min-height: 430px;
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
