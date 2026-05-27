<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import mascotIcon from '../../assets/brand/mascot.svg'
import instagramLogo from '../../assets/social_media/instagram.svg'
import whatsappLogo from '../../assets/social_media/Whatsapp.png'
import youtubeLogo from '../../assets/social_media/youtube.svg'

const isMenuOpen = ref(false)
const route = useRoute()

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}
</script>

<template>
  <div class="app-layout" :class="`${route.name || 'home'}-layout`">
    <header class="app-header">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Ir a Home" @click="closeMenu">
        <span class="brand-mark">
          <img :src="mascotIcon" alt="" />
        </span>
        <span>Home</span>
      </RouterLink>

      <nav class="header-actions" aria-label="Redes sociales y menu">
        <a class="icon-button" href="/" aria-label="WhatsApp">
          <img :src="whatsappLogo" alt="" />
        </a>

        <a
          class="icon-button"
          href="https://www.instagram.com/bellymonsterbites/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
        >
          <img :src="instagramLogo" alt="" />
        </a>

        <a class="icon-button" href="/" aria-label="YouTube">
          <img :src="youtubeLogo" alt="" />
        </a>

        <button
          class="menu-button"
          :class="{ open: isMenuOpen }"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="side-menu"
          aria-label="Abrir menu lateral"
          @click="toggleMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    </header>

    <button
      v-if="isMenuOpen"
      class="menu-backdrop"
      type="button"
      aria-label="Cerrar menu lateral"
      @click="closeMenu"
    ></button>

    <aside id="side-menu" class="side-menu" :class="{ open: isMenuOpen }" aria-label="Menu lateral">
      <RouterLink :to="{ name: 'home' }" @click="closeMenu">Home</RouterLink>
      <RouterLink :to="{ name: 'menu' }" @click="closeMenu">Menu</RouterLink>
      <RouterLink :to="{ name: 'orders' }" @click="closeMenu">Ordenes</RouterLink>
      <RouterLink :to="{ name: 'login' }" @click="closeMenu">Login</RouterLink>
      <RouterLink :to="{ name: 'home' }" @click="closeMenu">Contacto</RouterLink>
    </aside>

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

  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: clip;
}

.app-layout.home-layout,
.app-layout.orders-layout,
.app-layout.login-layout,
.app-layout.order-layout {
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

.app-layout.order-layout {
  --app-header-height: 0px;
  --app-footer-min-height: 0px;
  background: #fffaf3;
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
.orders-layout .app-header,
.login-layout .app-header,
.order-layout .app-header {
  background: #0f1115;
  transition: none;
}

.order-layout .app-header,
.order-layout .app-footer {
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
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(82vw, 320px);
  height: 100vh;
  padding: 124px 28px 28px;
  background: color-mix(in srgb, var(--color-background) 92%, white);
  border-left: 1px solid var(--color-border);
  box-shadow: -18px 0 48px rgb(0 0 0 / 12%);
  transform: translateX(100%);
  visibility: hidden;
  transition:
    transform 260ms ease,
    visibility 0s linear 260ms,
    background-color 420ms ease,
    border-color 420ms ease;
}

.app-content {
  flex: 1 0 auto;
  min-width: 0;
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

.menu-layout .app-footer {
  background: var(--color-second);
  transition: background-color 420ms ease;
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
  color: var(--color-text);
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

.side-menu a {
  display: block;
  padding: 14px 0;
  color: var(--color-text);
  font-size: 1.15rem;
  font-weight: 900;
  text-decoration: none;
  transition: color 420ms ease;
}

.home-layout .side-menu a,
.home-layout .icon-button,
.home-layout .menu-button,
.home-layout .brand,
.orders-layout .side-menu a,
.orders-layout .icon-button,
.orders-layout .menu-button,
.orders-layout .brand,
.login-layout .side-menu a,
.login-layout .icon-button,
.login-layout .menu-button,
.login-layout .brand,
.order-layout .side-menu a,
.order-layout .icon-button,
.order-layout .menu-button,
.order-layout .brand {
  transition: none;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 24px;
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
  gap: 16px;
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
  width: 62px;
  height: 62px;
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
    width: 44px;
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
