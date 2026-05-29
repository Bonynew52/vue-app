<script setup>
import { computed } from 'vue'
import { formatMXN } from '../utils/formatPrice'
import { menuCategories } from '../data/menu'

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

function priceLabel(item) {
  return item.hasPrice ? formatMXN(item.price) : 'Precio por confirmar'
}
</script>

<template>
  <main class="menu-view">
    <section
      v-for="section in menuSections"
      :key="section.id"
      class="menu-section"
      :aria-label="section.name"
    >
      <header class="section-header">
        <p>Menu</p>
        <h1>{{ section.name }}</h1>
      </header>

      <div class="section-rail" tabindex="0" :aria-label="`Productos de ${section.name}`">
        <article v-for="item in section.items" :key="item.id" class="menu-card">
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
  display: grid;
  gap: clamp(34px, 7vw, 72px);
  width: min(100%, 1440px);
  min-height: max(0px, calc(100svh - var(--app-header-height) - var(--app-footer-min-height)));
  margin: 0 auto;
  padding: clamp(28px, 5vw, 64px) 0 clamp(38px, 7vw, 78px);
  animation: menu-fade-in 520ms ease both;
}

.menu-section {
  display: grid;
  gap: clamp(16px, 3vw, 24px);
}

.section-header {
  width: min(100% - 32px, 1180px);
  margin: 0 auto;
  color: var(--color-text);
}

.section-header p {
  margin: 0 0 8px;
  color: var(--color-third);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.section-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(2rem, 6vw, 4.75rem);
  line-height: 0.95;
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
  outline: 3px solid rgb(143 211 255 / 45%);
  outline-offset: -3px;
}

.section-rail::-webkit-scrollbar {
  height: 10px;
}

.section-rail::-webkit-scrollbar-track {
  background: rgb(255 255 255 / 12%);
}

.section-rail::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--color-third);
}

.menu-card {
  display: grid;
  grid-template-rows: 260px 1fr;
  min-height: 470px;
  border: 2px solid var(--stage-blue, #8fd3ff);
  border-radius: 8px;
  background: var(--color-surface);
  color: #0f1115;
  box-shadow: var(--shadow-panel);
  overflow: hidden;
  scroll-snap-align: start;
}

.menu-card__image {
  display: grid;
  place-items: center;
  min-height: 0;
  background: #0f1115;
  overflow: hidden;
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
    var(--color-third);
}

.menu-card__copy {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 18px;
}

.menu-card__copy h2 {
  margin: 0;
  color: var(--color-third);
  font-size: 1.35rem;
  line-height: 1.05;
}

.menu-card__copy p {
  display: -webkit-box;
  min-height: 3.6em;
  margin: 0;
  overflow: hidden;
  color: #0f1115;
  font-weight: 700;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.menu-card__copy strong {
  margin-top: 4px;
  color: #0f1115;
  font-size: 1.05rem;
  font-weight: 900;
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
