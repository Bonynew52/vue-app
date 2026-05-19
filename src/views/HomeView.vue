<script setup>
import { campaigns } from '../data/campaigns'
</script>

<template>
  <main class="home-view">
    <section class="campaign-list" aria-label="Campanas">
      <article
        v-for="campaign in campaigns"
        :key="campaign.id"
        class="campaign-card"
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
  </main>
</template>

<style scoped>
.home-view {
  display: flex;
  justify-content: center;
  width: min(100%, 1280px);
  min-height: calc(100vh - 100px);
  margin: 0 auto;
  padding: clamp(28px, 5vw, 64px) clamp(16px, 4vw, 48px);
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
  border: 2px solid var(--color-third);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-third);
  box-shadow: var(--shadow-panel);
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
  .home-view {
    padding-inline: 12px;
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
