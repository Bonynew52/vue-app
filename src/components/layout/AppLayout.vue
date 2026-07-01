<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import wordmarkLogo from '../../assets/brand/belly-monster-wordmark.png'

const isMenuOpen = ref(false)
const isReservationCardOpen = ref(false)
const route = useRoute()

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}

function openReservationCard() {
  isReservationCardOpen.value = true
  closeMenu()
}

function closeReservationCard() {
  isReservationCardOpen.value = false
}
</script>

<template>
  <div class="app-layout" :class="`${route.name || 'home'}-layout`">
    <div v-if="route.name === 'home'" class="home-announcement-bar">
      <span>Todos los martes y miercoles 3x2 en galletas!</span>
    </div>

    <header class="app-header">
      <nav class="header-actions" aria-label="Menu">
        <button
          class="menu-button"
          :class="{ open: isMenuOpen }"
          type="button"
          aria-label="Abrir menu"
          :aria-expanded="isMenuOpen"
          aria-controls="side-menu"
          @click="toggleMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      <img
        v-if="route.name === 'home'"
        class="home-header-wordmark"
        :src="wordmarkLogo"
        alt="Belly Monster Bites"
      />

      <button v-if="route.name === 'home'" class="home-login-button" type="button" disabled>
        Ingresar
      </button>
    </header>

    <button
      v-if="isMenuOpen"
      class="menu-backdrop"
      type="button"
      aria-label="Cerrar menu lateral"
      @click="closeMenu"
    ></button>

    <aside id="side-menu" class="side-menu" :class="{ open: isMenuOpen }" aria-label="Menu lateral">
      <RouterLink :to="{ name: 'login' }" @click="closeMenu">Registrate</RouterLink>
      <RouterLink :to="{ name: 'menu' }" @click="closeMenu">Menu</RouterLink>
      <RouterLink :to="{ name: 'history' }" @click="closeMenu">Quienes somos</RouterLink>
      <a href="/#mood-title" @click="closeMenu">Contacto</a>
      <a href="/#comentarios" @click="closeMenu">Comentarios</a>
      <a
        href="https://www.google.com/maps?q=C.%20Rio%20Panuco%203610%2C%20Madero%2C%2088270%20Nuevo%20Laredo%2C%20Tamps."
        target="_blank"
        rel="noreferrer"
        @click="closeMenu"
      >
        Ubicacion
      </a>
      <button type="button" @click="openReservationCard">Reservaciones</button>
    </aside>

    <Teleport to="body">
      <Transition name="reservation-card">
        <section
          v-if="isReservationCardOpen"
          class="reservation-card-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reservation-card-title"
        >
          <button
            class="reservation-card-modal__backdrop"
            type="button"
            aria-label="Cerrar reservaciones"
            @click="closeReservationCard"
          ></button>
          <article class="reservation-card-modal__card">
            <p>TO EAT&nbsp;&nbsp;&nbsp; TO SHARE&nbsp;&nbsp;&nbsp; TO ENJOY</p>
            <h1 id="reservation-card-title">Reserva tu evento</h1>
            <div>
              <span>Nota: sujeto a disponibilidad</span>
              <a href="/reservar-evento" target="_blank" rel="noreferrer" @click="closeReservationCard">
                Mas informacion
              </a>
            </div>
          </article>
        </section>
      </Transition>
    </Teleport>

    <div class="app-content">
      <slot />
    </div>

    <footer class="app-footer" aria-label="Soporte del sitio">
      <div class="site-footer">
        <span>&copy; 2026 Belly Monster Bites</span>
        <a href="/">Terminos y condiciones</a>
        <a href="/">Privacidad</a>
        <a href="/">Contacto</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  --app-header-height: 100px;
  --app-footer-min-height: clamp(220px, 35svh, 520px);
  --stage-blue: #8fd3ff;

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: clip;
}

.app-layout.home-layout,
.app-layout.menu-layout,
.app-layout.orders-layout,
.app-layout.login-layout,
.app-layout.order-layout,
.app-layout.pickup-layout {
  --color-first: #0f1115;
  --color-second: #ffffff;
  --color-third: #6f4e37;
  --color-background: #0f1115;
  --color-surface: #ffffff;
  --color-surface-muted: #f6f2ee;
  --color-primary: #6f4e37;
  --color-secondary: #ffffff;
  --color-secondary-dark: #0f1115;
  --color-accent: #6f4e37;
  --color-highlight: #ffffff;
  --color-text: #ffffff;
  --color-text-muted: #f6f2ee;
  --color-border: #6f4e37;
  --shadow-panel: 0 18px 48px rgb(15 17 21 / 22%);
  background: #0f1115;
}

.app-layout.home-layout {
  --color-first: #ffffff;
  --color-second: #e4cfaa;
  --color-third: #71451f;
  --color-background: #e4cfaa;
  --color-surface: #d9c8a9;
  --color-surface-muted: #f3e4c7;
  --color-primary: #71451f;
  --color-secondary: #e4cfaa;
  --color-secondary-dark: #ffffff;
  --color-accent: #d97858;
  --color-highlight: #c0a55d;
  --color-text: #fff3d7;
  --color-text-muted: #d9c8a9;
  --color-border: #c0a55d;
  --stage-blue: #d97858;
  --shadow-panel: 0 18px 48px rgb(65 36 15 / 30%);
}

.app-layout.menu-layout {
  --color-first: #ffffff;
  --color-second: #ffffff;
  --color-third: #6f4e37;
  --color-background: #ffffff;
  --color-surface: #ffffff;
  --color-surface-muted: #fff8ef;
  --color-primary: #6f4e37;
  --color-secondary: #ffffff;
  --color-secondary-dark: #0f1115;
  --color-accent: #6f4e37;
  --color-highlight: #e4c250;
  --color-text: #0f1115;
  --color-text-muted: #6f4e37;
  --color-border: #0f1115;
  --stage-blue: #e4c250;
  --shadow-panel: 0 18px 48px rgb(15 17 21 / 14%);
}

.app-layout.order-layout,
.app-layout.pickup-layout {
  --color-third: #6f4e37;
  --color-primary: #6f4e37;
  --color-accent: #1f9d57;
  --color-border: #e6d8c4;
  --stage-blue: #8a6044;
}

.app-layout.home-layout,
.app-layout.menu-layout {
  --public-frame-width: 560px;
  --app-side-background: #090a0c;
  --app-side-pattern: url("data:image/svg+xml,%3Csvg width='1080' height='180' viewBox='0 0 1080 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05' font-family='Arial Black, Impact, sans-serif' font-size='13' font-weight='900' letter-spacing='1.2'%3E%3Ctext x='0' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='270' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='540' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='810' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='135' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='405' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='675' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='945' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='0' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='270' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='540' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='810' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='135' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='405' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='675' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='945' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3C/g%3E%3C/svg%3E");
  align-items: center;
  background: var(--app-side-background);
}

.app-layout.home-layout {
  --app-side-background: #f1f1ed;
  --app-frame-border: #0f1115;
}

.app-layout.menu-layout {
  --app-side-background: #f1f1ed;
  --app-frame-border: #0f1115;
  --app-side-pattern: none;
}

.app-layout.order-layout,
.app-layout.pickup-layout {
  --app-side-background: #090a0c;
  --app-frame-border: rgb(159 232 200 / 34%);
  --app-side-pattern: url("data:image/svg+xml,%3Csvg width='1080' height='180' viewBox='0 0 1080 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05' font-family='Arial Black, Impact, sans-serif' font-size='13' font-weight='900' letter-spacing='1.2'%3E%3Ctext x='0' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='270' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='540' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='810' y='25'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='135' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='405' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='675' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='945' y='75'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='0' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='270' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='540' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='810' y='125'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='135' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='405' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='675' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3Ctext x='945' y='175'%3EBELLY MONSTER BITES%3C/text%3E%3C/g%3E%3C/svg%3E");
  --app-header-height: 0px;
  --app-footer-min-height: 0px;
  background: var(--app-side-background);
}

.app-layout.orders-layout,
.app-layout.login-layout {
  --app-header-height: 0px;
  --app-footer-min-height: 0px;
  background: #fff8ef;
}

.home-layout::before,
.menu-layout::before,
.order-layout::before,
.pickup-layout::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--app-side-pattern);
  background-position: 0 0;
  background-repeat: repeat;
  background-size: clamp(620px, 68vmax, 1080px) auto;
  content: "";
  transform: rotate(45deg) scale(1.8);
  animation: app-side-watermark-drift 26s linear infinite;
  opacity: 1;
  transition: opacity 720ms ease;
  will-change: background-position;
}

.home-layout::before {
  opacity: 0;
}

.home-layout:has(.home-view.watermark-ready)::before {
  opacity: 1;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: clamp(24px, 4vw, 44px);
  min-height: 100px;
  padding: 0 clamp(20px, 5vw, 56px);
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-background) 88%, white);
  backdrop-filter: blur(16px);
  transition:
    background-color 420ms ease,
    border-color 420ms ease;
}

.home-layout .app-header,
.menu-layout .app-header,
.orders-layout .app-header,
.login-layout .app-header,
.order-layout .app-header {
  background: #0f1115;
  transition: none;
}

.home-layout .app-header {
  background: #ffffff;
}

.menu-layout .app-header {
  background: #ffffff;
}

.home-announcement-bar {
  position: relative;
  z-index: 11;
  display: grid;
  width: min(100%, var(--public-frame-width));
  min-height: 54px;
  place-items: center;
  padding: 8px 16px;
  border-right: 1px solid #0f1115;
  border-left: 1px solid #0f1115;
  background: #e4c250;
  color: #ffffff;
  font-family: var(--font-display);
  font-size: clamp(0.9rem, 3vw, 1.3rem);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
  overflow: hidden;
  white-space: nowrap;
}

.home-announcement-bar span {
  display: inline-block;
  padding-left: 100%;
  animation: home-announcement-scroll 14s linear infinite;
  will-change: transform;
}

@keyframes home-announcement-scroll {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-100%);
  }
}

.home-header-wordmark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(208px, 44vw);
  height: 58px;
  object-fit: contain;
  transform: translate(-50%, -50%) rotate(-1.5deg) skewX(-4deg);
  filter: brightness(0) saturate(100%) invert(53%) sepia(22%) saturate(1138%) hue-rotate(136deg)
    brightness(90%) contrast(87%);
  pointer-events: none;
}

.home-layout .header-actions {
  margin-right: auto;
  margin-left: 0;
}

.home-layout .menu-button {
  color: #0f1115;
  opacity: 1;
  cursor: pointer;
}

.home-login-button {
  position: absolute;
  top: 50%;
  right: clamp(14px, 4vw, 28px);
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #0f1115;
  border-radius: 6px;
  background: #ffffff;
  color: #0f1115;
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1;
  transform: translateY(-50%);
  cursor: default;
}

.order-layout .app-header,
.order-layout .app-footer,
.pickup-layout .app-header,
.pickup-layout .app-footer,
.orders-layout .app-header,
.orders-layout .app-footer,
.login-layout .app-header,
.login-layout .app-footer {
  display: none;
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  border: 0;
  background: rgb(0 0 0 / 18%);
  backdrop-filter: blur(2px);
}

.side-menu {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(82vw, 320px);
  height: 100vh;
  padding: 124px 28px 28px;
  border-right: 1px solid rgb(255 255 255 / 36%);
  background: #399ba4;
  box-shadow: 18px 0 48px rgb(0 0 0 / 18%);
  transform: translateX(-100%);
  visibility: hidden;
  transition:
    transform 260ms ease,
    visibility 0s linear 260ms,
    background-color 420ms ease,
    border-color 420ms ease;
}

.app-content {
  position: relative;
  z-index: 1;
  flex: 1 0 auto;
  min-width: 0;
}

.home-layout .app-header,
.menu-layout .app-header,
.home-layout .app-content,
.menu-layout .app-content,
.home-layout .app-footer,
.menu-layout .app-footer {
  width: min(100%, var(--public-frame-width));
  border-right: 1px solid var(--app-frame-border);
  border-left: 1px solid var(--app-frame-border);
}

.home-layout .app-content,
.menu-layout .app-content {
  display: flex;
  justify-content: center;
  overflow: hidden;
  background: #0f1115;
}

.home-layout .app-content {
  background: #ffffff;
}

.menu-layout .app-content {
  background: #ffffff;
}

.home-layout .app-content {
  z-index: 1;
}

.home-layout .app-content :deep(.home-view),
.menu-layout .app-content :deep(.menu-view) {
  width: 100%;
}

.menu-layout .app-content :deep(.menu-decoration) {
  display: none;
}

.order-layout .app-content,
.pickup-layout .app-content {
  display: flex;
  justify-content: center;
  background: transparent;
}

.order-layout .app-content :deep(.order),
.pickup-layout .app-content :deep(.pickup-shell) {
  border-right: 1px solid var(--app-frame-border);
  border-left: 1px solid var(--app-frame-border);
}

.app-footer {
  position: relative;
  z-index: 4;
  display: grid;
  flex: 0 0 auto;
  min-height: var(--app-footer-min-height);
  place-items: center;
  padding: clamp(34px, 7vw, 72px) clamp(20px, 5vw, 56px);
  border-top: 2px solid var(--stage-blue, var(--color-border));
  background: #0f1115;
}

.home-layout .app-footer {
  display: none;
  border-top-color: #d97858;
  background: #458753;
}

@keyframes app-side-watermark-drift {
  from {
    background-position: 0 0;
  }

  to {
    background-position: clamp(620px, 68vmax, 1080px) 180px;
  }
}

.menu-layout .app-footer {
  border-top-color: var(--color-border);
  background: var(--color-background);
  transition:
    background-color 420ms ease,
    border-color 420ms ease;
}

.order-layout .app-footer {
  min-height: 0;
  padding: 22px clamp(16px, 4vw, 32px);
  background: #0f1115;
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
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 700;
}

.menu-layout .site-footer {
  color: var(--color-border);
  transition: color 420ms ease;
}

.order-layout .site-footer {
  min-height: 0;
  padding: 0;
  color: #ffffff;
  font-size: 0.82rem;
}

.site-footer a {
  color: inherit;
  text-decoration: none;
}

.site-footer a:hover {
  text-decoration: underline;
}

.side-menu.open {
  transform: translateX(0);
  visibility: visible;
  transition:
    transform 260ms ease,
    visibility 0s,
    background-color 420ms ease,
    border-color 420ms ease;
}

.side-menu a,
.side-menu button {
  display: block;
  padding: 14px 0;
  border: 0;
  background: transparent;
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.1;
  text-align: left;
  text-decoration: none;
  transition: color 420ms ease;
}

.side-menu a:hover,
.side-menu button:hover {
  color: #ffe05d;
}

.reservation-card-modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 22px;
}

.reservation-card-modal__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(16 17 20 / 58%);
  backdrop-filter: blur(4px);
}

.reservation-card-modal__card {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(100%, 500px);
  gap: 16px;
  place-items: center;
  padding: 34px 24px 28px;
  background: #399ba4;
  color: #ffffff;
  box-shadow: 0 22px 54px rgb(0 0 0 / 28%);
  text-align: center;
}

.reservation-card-modal__card p {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1;
}

.reservation-card-modal__card h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(2.1rem, 10vw, 4rem);
  line-height: 0.88;
  text-transform: uppercase;
}

.reservation-card-modal__card div {
  display: grid;
  width: min(100%, 340px);
  gap: 14px;
  padding: 16px;
  border: 1px solid rgb(255 255 255 / 48%);
  background: rgb(255 255 255 / 10%);
}

.reservation-card-modal__card span {
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1.2;
  text-transform: uppercase;
}

.reservation-card-modal__card a {
  justify-self: center;
  min-height: 42px;
  padding: 12px 22px;
  border-radius: 9px;
  background: #ffffff;
  color: #101114;
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
}

.reservation-card-enter-active,
.reservation-card-leave-active {
  transition: opacity 180ms ease;
}

.reservation-card-enter-from,
.reservation-card-leave-to {
  opacity: 0;
}

.home-layout .side-menu a,
.home-layout .side-menu button,
.home-layout .icon-button,
.home-layout .menu-button,
.home-layout .brand,
.orders-layout .side-menu a,
.orders-layout .side-menu button,
.orders-layout .icon-button,
.orders-layout .menu-button,
.orders-layout .brand,
.login-layout .side-menu a,
.login-layout .side-menu button,
.login-layout .icon-button,
.login-layout .menu-button,
.login-layout .brand,
.order-layout .side-menu a,
.order-layout .side-menu button,
.order-layout .icon-button,
.order-layout .menu-button,
.order-layout .brand {
  transition: none;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0;
  margin-left: auto;
}

.icon-button,
.menu-button {
  display: grid;
  width: 80px;
  height: 80px;
  place-items: center;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text);
  transition:
    color 420ms ease;
}

.menu-button {
  width: 94px;
}

.icon-button {
  text-decoration: none;
}

.icon-button img {
  display: block;
  width: 54px;
  height: 54px;
  object-fit: contain;
}

.menu-button {
  display: inline-flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.menu-button span {
  display: block;
  width: 61px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  transition:
    opacity 180ms ease,
    transform 220ms ease;
  transform-origin: center;
}

.menu-button.open span:first-child {
  transform: translateY(15px) rotate(45deg);
}

.menu-button.open span:nth-child(2) {
  opacity: 0;
}

.menu-button.open span:last-child {
  transform: translateY(-15px) rotate(-45deg);
}

.brand {
  display: inline-flex;
  align-items: center;
  min-height: 80px;
  padding: 0 4px;
  color: var(--color-text);
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1;
  text-decoration: none;
  transition: color 420ms ease;
}

.brand-mark {
  display: grid;
  width: 184px;
  height: 62px;
  place-items: center;
}

.brand-mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(100%);
}

@media (max-width: 640px) {
  .app-layout {
    --app-header-height: 76px;
    --app-footer-min-height: clamp(190px, 32svh, 360px);
  }

  .app-header {
    min-height: 76px;
    gap: 10px;
    padding-inline: 14px;
  }

  .brand {
    gap: 8px;
    min-height: 56px;
    font-size: 1rem;
  }

  .brand-mark {
    width: 132px;
    height: 44px;
  }

  .header-actions {
    gap: 8px;
  }

  .icon-button,
  .menu-button {
    width: 40px;
    height: 48px;
  }

  .menu-button {
    width: 46px;
  }

  .icon-button img {
    width: 28px;
    height: 28px;
  }

  .menu-button span {
    width: 32px;
    height: 4px;
  }

  .menu-button.open span:first-child {
    transform: translateY(14px) rotate(45deg);
  }

  .menu-button.open span:last-child {
    transform: translateY(-14px) rotate(-45deg);
  }
}
</style>
