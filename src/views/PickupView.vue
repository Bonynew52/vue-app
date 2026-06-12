<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { SignIn, useAuth, useClerk, useUser } from '@clerk/vue'
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

// App-level invariant: no verified phone, no ordering. Clerk only enforces
// "phone required" at sign-up, so a pre-existing (e.g. Google) account can
// arrive here phone-less — this gate closes that hole.
const hasVerifiedPhone = computed(() => {
  const user = userCtx?.user.value
  return Boolean(user?.phoneNumbers?.some((p) => p.verification?.status === 'verified'))
})

// --- Add-phone mini flow (verified against @clerk/shared types:
// user.createPhoneNumber -> phone.prepareVerification -> attemptVerification) ---
const phoneStep = ref('phone') // 'phone' | 'code'
const phoneInput = ref('')
const phoneCode = ref('')
const phoneError = ref('')
const phoneBusy = ref(false)
let pendingPhone = null

function normalizePhone(value) {
  const compact = value.trim().replace(/[\s().-]/g, '')
  if (!compact) return ''
  if (compact.startsWith('+')) return compact
  if (/^\d{10}$/.test(compact)) return `+52${compact}`
  if (/^52\d{10}$/.test(compact)) return `+${compact}`
  if (/^1\d{10}$/.test(compact)) return `+${compact}`
  return compact
}

async function submitPhone() {
  const user = userCtx?.user.value
  if (!user || phoneBusy.value) return
  phoneError.value = ''
  const phoneNumber = normalizePhone(phoneInput.value)
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    phoneError.value = 'Revisa el teléfono. Ejemplo: 867 123 4567.'
    return
  }
  phoneBusy.value = true
  try {
    pendingPhone = await user.createPhoneNumber({ phoneNumber })
    await pendingPhone.prepareVerification()
    phoneStep.value = 'code'
  } catch (error) {
    phoneError.value = error?.errors?.[0]?.longMessage || error?.message || 'No se pudo enviar el código.'
  } finally {
    phoneBusy.value = false
  }
}

async function submitPhoneCode() {
  const user = userCtx?.user.value
  if (!user || !pendingPhone || phoneBusy.value) return
  phoneError.value = ''
  phoneBusy.value = true
  try {
    const verified = await pendingPhone.attemptVerification({ code: phoneCode.value.trim() })
    await user.update({ primaryPhoneNumberId: verified.id })
    await user.reload()
  } catch (error) {
    phoneError.value = error?.errors?.[0]?.longMessage || error?.message || 'Ese código no pasó. Inténtalo otra vez.'
  } finally {
    phoneBusy.value = false
  }
}

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

const clerk = hasClerk ? useClerk() : null
const signingOut = ref(false)

async function signOut() {
  if (!clerk?.value || signingOut.value) return
  signingOut.value = true
  try {
    await clerk.value.signOut({ redirectUrl: '/recoger' })
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <!-- Plain div on purpose: when signed in, OrderView renders the page's
       single <main> landmark inside this shell. -->
  <div class="pickup-shell">
    <!-- Signed in but phone-less (e.g. legacy Google account): collect and
         verify a phone before any ordering. -->
    <main
      v-if="hasClerk && isLoaded && isSignedIn && !hasVerifiedPhone"
      class="gate"
      aria-label="Pick&Go: verifica tu teléfono"
    >
      <div class="gate__card">
        <img class="gate__logo" :src="brandLogo" alt="Belly Monster Bites" />
        <h1 class="gate__title">Falta tu teléfono</h1>
        <p class="gate__sub">
          Te avisamos por mensaje cuando tu pedido esté listo, así que necesitamos verificar tu
          número antes de ordenar.
        </p>
      </div>

      <form v-if="phoneStep === 'phone'" class="gate__form" @submit.prevent="submitPhone">
        <label class="gate__label" for="pickup-phone">Número de teléfono</label>
        <input
          id="pickup-phone"
          v-model="phoneInput"
          class="gate__input"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="867 123 4567"
        />
        <p v-if="phoneError" class="gate__error" role="alert">{{ phoneError }}</p>
        <button class="gate__button" type="submit" :disabled="phoneBusy">
          {{ phoneBusy ? 'Enviando…' : 'Enviar código' }}
        </button>
      </form>

      <form v-else class="gate__form" @submit.prevent="submitPhoneCode">
        <label class="gate__label" for="pickup-code">Código que te enviamos por SMS</label>
        <input
          id="pickup-code"
          v-model="phoneCode"
          class="gate__input gate__input--code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="······"
        />
        <p v-if="phoneError" class="gate__error" role="alert">{{ phoneError }}</p>
        <button class="gate__button" type="submit" :disabled="phoneBusy">
          {{ phoneBusy ? 'Verificando…' : 'Verificar' }}
        </button>
        <button class="gate__alt" type="button" :disabled="phoneBusy" @click="phoneStep = 'phone'">
          Cambiar número
        </button>
      </form>

      <RouterLink class="gate__back" :to="{ name: 'home' }">Volver al inicio</RouterLink>
    </main>

    <!-- Signed in: the proven ordering experience, in pickup mode. The session
         row is quiet page furniture (no Clerk widgets): greeting + plain exit. -->
    <template v-else-if="hasClerk && isLoaded && isSignedIn">
      <div class="pickup-bar">
        <span class="pickup-bar__hello">
          <template v-if="firstName">Hola, {{ firstName }}</template>
          <template v-else>Tu pedido para recoger</template>
        </span>
        <button class="pickup-bar__exit" type="button" :disabled="signingOut" @click="signOut">
          {{ signingOut ? 'Saliendo…' : 'Salir' }}
        </button>
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
        <!-- Combined sign-in-or-up: unknown numbers transfer inline to account
             creation. NOTE: the prop must be camelCase — the @clerk/vue wrapper
             checks `"withSignUp" in vnode.props`, so kebab-case silently no-ops. -->
        <SignIn
          routing="hash"
          :withSignUp="true"
          :appearance="signInAppearance"
          force-redirect-url="/recoger"
          sign-up-force-redirect-url="/recoger"
        />
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
  background: #fff8ef;
}

/* ---- Signed-in session row: quiet furniture above the menu ---- */
.pickup-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: calc(6px + env(safe-area-inset-top)) 16px 6px;
  border-bottom: 1px solid rgb(111 78 55 / 14%);
  background: #fff8ef;
  color: #2a1c14;
}

.pickup-bar__hello {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8b7a6d;
  font-size: 0.85rem;
  font-weight: 700;
}

.pickup-bar__exit {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 10px;
  border: none;
  background: none;
  color: #d36c00;
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
}

.pickup-bar__exit:disabled {
  opacity: 0.6;
  cursor: default;
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

.gate__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(100%, 390px);
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 12px 28px rgb(46 28 18 / 8%);
}

.gate__label {
  color: var(--ink);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.gate__input {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid #dfcab0;
  border-radius: 8px;
  background: #fffdf9;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 800;
}

.gate__input--code {
  letter-spacing: 0.4em;
  text-align: center;
}

.gate__input:focus {
  outline: 2px solid var(--orange);
  outline-offset: 1px;
}

.gate__error {
  margin: 0;
  color: #b3261e;
  font-size: 0.85rem;
  font-weight: 700;
}

.gate__button {
  min-height: 48px;
  border: none;
  border-radius: 8px;
  background: #1f9d57;
  color: #fff;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
}

.gate__button:disabled {
  opacity: 0.6;
  cursor: default;
}

.gate__alt {
  min-height: 44px;
  border: none;
  background: none;
  color: var(--orange);
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
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
