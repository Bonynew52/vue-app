<script setup>
import mascotIcon from '../../assets/brand/mascot.svg'

const navItems = ['Inicio', 'Proyecto', 'Recursos']
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

      <nav class="nav" aria-label="Navegacion principal">
        <a v-for="item in navItems" :key="item" href="/">
          {{ item }}
        </a>
      </nav>
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
  justify-content: space-between;
  gap: 24px;
  min-height: 72px;
  padding: 0 clamp(20px, 5vw, 56px);
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-background) 88%, white);
  backdrop-filter: blur(16px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text);
  font-weight: 800;
  text-decoration: none;
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

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav a {
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--color-text-muted);
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
}

.nav a:hover {
  background: var(--color-secondary);
  color: var(--color-text);
}

@media (max-width: 640px) {
  .app-header {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    min-height: 118px;
    padding-block: 18px;
  }

  .nav {
    width: 100%;
    overflow-x: auto;
  }

  .nav a {
    white-space: nowrap;
  }
}
</style>
