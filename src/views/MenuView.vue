<script setup>
import { ref } from 'vue'
import PaletteSwitcher from '../components/ui/PaletteSwitcher.vue'
import { imagePalettes } from '../data/imagePalettes'

const activePalette = ref(imagePalettes[0])

function applyPalette(palette, backgroundPair = {}) {
  activePalette.value = palette

  const root = document.documentElement
  root.style.setProperty('--color-first', palette.colors.first)
  root.style.setProperty('--color-second', palette.colors.second)
  root.style.setProperty('--color-third', palette.colors.third)

  const leftColor = backgroundPair.isTwoColumn
    ? backgroundPair.leftPalette.colors.first
    : palette.colors.first
  const rightColor = backgroundPair.isTwoColumn
    ? backgroundPair.rightPalette.colors.first
    : palette.colors.second

  root.style.setProperty('--background-left', leftColor)
  root.style.setProperty('--background-right', rightColor)
}
</script>

<template>
  <main class="menu-view">
    <PaletteSwitcher
      :palettes="imagePalettes"
      :active-palette-id="activePalette.id"
      @select="applyPalette"
    />
  </main>
</template>

<style scoped>
.menu-view {
  display: flex;
  flex-direction: column;
  width: min(100%, 1180px);
  min-height: max(0px, calc(100svh - var(--app-header-height) - var(--app-footer-min-height)));
  margin: 0 auto;
  padding: clamp(32px, 6vw, 72px) clamp(20px, 5vw, 56px);
}
</style>
