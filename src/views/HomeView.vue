<script setup>
import { onMounted, ref } from 'vue'
import PaletteSwitcher from '../components/ui/PaletteSwitcher.vue'
import { imagePalettes } from '../data/imagePalettes'

const activePalette = ref(imagePalettes[0])

function applyPalette(palette) {
  activePalette.value = palette

  const root = document.documentElement
  root.style.setProperty('--color-first', palette.colors.first)
  root.style.setProperty('--color-second', palette.colors.second)
  root.style.setProperty('--color-third', palette.colors.third)
}

onMounted(() => {
  applyPalette(activePalette.value)
})
</script>

<template>
  <main class="home-view">
    <PaletteSwitcher
      :palettes="imagePalettes"
      :active-palette-id="activePalette.id"
      @select="applyPalette"
    />

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
  display: flex;
  flex-direction: column;
  width: min(100%, 1180px);
  min-height: calc(100vh - 72px);
  margin: 0 auto;
  padding: clamp(32px, 6vw, 72px) clamp(20px, 5vw, 56px) 0;
}

.footer-shell {
  width: 100vw;
  margin-top: clamp(48px, 10vw, 96px);
  flex: 1;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: clamp(34px, 7vw, 72px) clamp(20px, 5vw, 56px);
  background: var(--color-second);
  transition: background-color 420ms ease;
}

.site-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 22px;
  align-items: center;
  justify-content: center;
  width: min(100%, 1180px);
  min-height: 112px;
  margin: 0 auto;
  padding: 24px 0;
  color: var(--color-text);
  font-size: 0.92rem;
  font-weight: 700;
  transition: color 420ms ease;
}

.site-footer a {
  color: var(--color-text);
  text-decoration: none;
  transition: color 420ms ease;
}

.site-footer a:hover {
  text-decoration: underline;
}
</style>
