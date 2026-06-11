<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { SignIn, UserButton, useAuth, useUser } from '@clerk/vue'
import OrderView from './OrderView.vue'
import brandLogo from '../assets/background/belly_monster_logo.png'

// Clerk is optional: without the key this route degrades to a friendly notice
// instead of breaking the rest of the site. The composables are only invoked
// when main.js actually installed the Clerk plugin (same key check).
const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
const auth = hasClerk ? useAuth() : null
const userCtx = hasClerk ? useUser() : null

const isLoaded = computed(() => Boolean(auth?.isLoaded.value))
const isSignedIn = computed(() => Boolean(auth?.isSignedIn.value))

const prefillName = computed(() => {
  const user = userCtx?.user.value
  return user?.fullName || user?.firstName || ''
})
const customerPhone = computed(() => {
  const user = userCtx?.user.value
  return user?.primaryPhoneNumber?.phoneNumber || ''
})
const firstName = computed(() => {
  const user = userCtx?.user.value
  return user?.firstName || user?.fullName || ''
})

const signInAppearance = {
  variables: {
    colorPrimary: '#2f7f57',
    colorText: '#2e1c12',
    colorTextSecondary: '#7f6655',
    colorBackground: '#ffffff',
    colorInputBackground: '#fffdf9',
    colorInputText: '#2e1c12',
    borderRadius: '8px',
    fontFamily: 'var(--font-body)',
  },
  elements: {
    rootBox: {
      width: '100%',
    },
    cardBox: {
      width: '100%',
      border: '1px solid #efe1cb',
      borderRadius: '8px',
      boxShadow: '0 12px 28px rgb(46 28 18 / 8%)',
    },
    card: {
      padding: '18px',
      boxShadow: 'none',
    },
    headerTitle: {
      color: '#2e1c12',
      fontSize: '20px',
      fontWeight: '900',
    },
    headerSubtitle: {
      color: '#7f6655',
      fontWeight: '700',
    },
    socialButtonsBlockButton: {
      minHeight: '48px',
      border: '1px solid #dfcab0',
      borderRadius: '8px',
      color: '#2e1c12',
      fontWeight: '900',
    },
    formButtonPrimary: {
      minHeight: '48px',
      borderRadius: '8px',
      backgroundColor: '#2f7f57',
      fontWeight: '900',
    },
    formFieldInput: {
      minHeight: '48px',
      border: '1px solid #dfcab0',
      borderRadius: '8px',
      color: '#2e1c12',
      fontWeight: '800',
    },
    footerActionLink: {
      color: '#d36c00',
      fontWeight: '900',
    },
  },
}

const userButtonAppearance = {
  elements: {
    userButtonAvatarBox: {
      width: '44px',
      height: '44px',
    },
  },
}
</script>

<template>
  <!-- Plain div on purpose: when signed in, OrderView renders the page's
       single <main> landmark inside this shell. -->
  <div class="pickup-shell">
    <!-- Signed in: the proven ordering experience, in pickup mode. -->
    <template v-if="hasClerk && isLoaded && isSignedIn">
      <div class="pickup-bar">
        <span class="pickup-bar__hello">
          Pick&amp;Go<template v-if="firstName"> · Hola, {{ firstName }}</template>
        </span>
        <UserButton after-sign-out-url="/recoger" :appearance="userButtonAppearance" />
      </div>
      <OrderView mode="pickup" :prefill-name="prefillName" :customer-phone="customerPhone" />
    </template>

    <!-- Signed out / loading / unavailable: branded gate (the landmark in this state). -->
    <main v-else class="gate" aria-label="Pick&Go: inicia sesión para ordenar">
      <div class="gate__card">
        <!-- Above-the-fold LCP image: load eagerly. -->
        <img class="gate__logo" :src="brandLogo" alt="Belly Monster Bites" />
        <h1 class="gate__title">Pide y pasa a recoger</h1>
        <p class="gate__sub">
          Inicia sesión, arma tu pedido y te avisamos cuándo pasar por él. Pagas al recoger.
        </p>
      </div>

      <p v-if="!hasClerk" class="gate__notice">
        Pick&amp;Go no está disponible en este entorno.
      </p>
      <p v-else-if="!isLoaded" class="gate__notice" role="status">Cargando...</p>
      <div v-else class="gate__signin">
        <SignIn routing="hash" :with-sign-up="true" :appearance="signInAppearance" />
      </div>

      <RouterLink class="gate__back" :to="{ name: 'home' }">Volver al inicio</RouterLink>
    </main>
  </div>
</template>

<style scoped>
.pickup-shell {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  min-height: 100svh;
  background: #0f1114;
}

/* ---- Signed-in top bar ---- */
.pickup-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: calc(8px + env(safe-area-inset-top)) 16px 8px;
  background: #0f1114;
  color: #fff;
}

.pickup-bar__hello {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8fe5bf;
  font-size: 0.88rem;
  font-weight: 800;
}

/* ---- Gate (LoginView-style card) ---- */
.gate {
  --bg: #fff8ef;
  --surface: #ffffff;
  --line: #efe1cb;
  --ink: #2e1c12;
  --muted: #9c8473;
  --orange: #d36c00;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  min-height: 100svh;
  padding: max(28px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
  background:
    radial-gradient(120% 70% at 50% -8%, rgb(248 217 74 / 28%) 0%, rgb(248 217 74 / 0%) 55%),
    var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
}

.gate__card {
  position: relative;
  width: min(100%, 390px);
  margin-top: 58px;
  padding: 62px 28px 22px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow:
    0 2px 4px rgb(46 28 18 / 5%),
    0 22px 50px rgb(46 28 18 / 9%);
  text-align: center;
}

.gate__logo {
  position: absolute;
  top: -52px;
  left: 50%;
  width: 104px;
  height: 104px;
  transform: translateX(-50%);
  border-radius: 50%;
  box-shadow: 0 8px 22px rgb(126 71 67 / 22%);
}

.gate__title {
  margin: 0 0 6px;
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.1;
}

.gate__sub {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
}

.gate__notice {
  width: min(100%, 390px);
  margin: 0;
  padding: 12px 14px;
  border: 1px solid rgb(211 108 0 / 28%);
  border-radius: 8px;
  background: rgb(211 108 0 / 8%);
  color: var(--orange);
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
}

.gate__signin {
  display: flex;
  justify-content: center;
  width: min(100%, 390px);
}

.gate__back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 16px;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
}

.gate__back:hover {
  color: var(--ink);
  text-decoration: underline;
}
</style>
