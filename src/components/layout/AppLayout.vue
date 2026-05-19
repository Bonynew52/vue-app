<script setup>
import mascotIcon from '../../assets/brand/mascot.svg'
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <a class="brand" href="/" aria-label="Volver al inicio">
        <span class="brand-mark">
          <img :src="mascotIcon" alt="" />
        </span>
        <span>Home</span>
      </a>
    </header>

    <slot />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  min-height: 72px;
  padding: 0 clamp(20px, 5vw, 56px);
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-background) 88%, white);
  backdrop-filter: blur(16px);
  transition:
    background-color 420ms ease,
    border-color 420ms ease;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text);
  font-weight: 800;
  text-decoration: none;
  transition: color 420ms ease;
}

.brand-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  overflow: hidden;
}

.brand-mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@media (max-width: 640px) {
  .app-header {
    min-height: 72px;
  }
}
</style>
