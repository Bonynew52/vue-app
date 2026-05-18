<script setup>
import BaseButton from '../components/ui/BaseButton.vue'
import StatCard from '../components/ui/StatCard.vue'
import { projectStats, starterFolders } from '../data/starterPreset'
import { useCounter } from '../composables/useCounter'

const { count, increment } = useCounter()
</script>

<template>
  <main class="home-view">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Preset basico</p>
        <h1>Base Vue lista para construir sin desorden</h1>
        <p class="intro">
          Componentes, vistas, composables, datos y estilos globales separados desde el inicio.
        </p>
        <div class="actions">
          <BaseButton @click="increment">Clicks: {{ count }}</BaseButton>
          <BaseButton variant="secondary" href="https://vuejs.org/">Docs Vue</BaseButton>
        </div>
      </div>

      <div class="folder-panel" aria-label="Distribucion de carpetas">
        <div v-for="folder in starterFolders" :key="folder.path" class="folder-row">
          <code>{{ folder.path }}</code>
          <span>{{ folder.description }}</span>
        </div>
      </div>
    </section>

    <section class="stats" aria-label="Resumen del preset">
      <StatCard
        v-for="stat in projectStats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :detail="stat.detail"
      />
    </section>
  </main>
</template>

<style scoped>
.home-view {
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(32px, 6vw, 72px) clamp(20px, 5vw, 56px);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr);
  gap: clamp(28px, 5vw, 56px);
  align-items: center;
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--color-secondary-dark);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 680px;
  margin: 0;
  color: var(--color-text);
  font-size: clamp(2.25rem, 8vw, 4.8rem);
  line-height: 0.98;
}

.intro {
  max-width: 620px;
  margin: 22px 0 0;
  color: var(--color-text-muted);
  font-size: 1.1rem;
  line-height: 1.65;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.folder-panel {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.folder-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 16px;
  align-items: center;
  padding: 14px;
  border-radius: 6px;
  background: var(--color-surface-muted);
}

code {
  color: var(--color-text);
  font-size: 0.92rem;
  font-weight: 800;
}

.folder-row span {
  color: var(--color-text-muted);
  line-height: 1.45;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: clamp(28px, 5vw, 52px);
}

@media (max-width: 860px) {
  .hero,
  .stats {
    grid-template-columns: 1fr;
  }

  .folder-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
