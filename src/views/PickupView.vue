<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth, useClerk, useSignIn, useSignUp, useUser } from '@clerk/vue'
import OrderView from './OrderView.vue'
import brandLogo from '../assets/background/belly_monster_logo.png'

// Clerk is optional: without the key this route degrades to a friendly notice
// instead of breaking the rest of the site. The composables are only invoked
// when main.js actually installed the Clerk plugin (same key check).
const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
const auth = hasClerk ? useAuth() : null
const userCtx = hasClerk ? useUser() : null
const clerk = hasClerk ? useClerk() : null
const signInCtx = hasClerk ? useSignIn() : null
const signUpCtx = hasClerk ? useSignUp() : null

const isLoaded = computed(() => Boolean(auth?.isLoaded.value))
const isSignedIn = computed(() => Boolean(auth?.isSignedIn.value))
const authReady = computed(() =>
  Boolean(isLoaded.value && signInCtx?.isLoaded.value && signUpCtx?.isLoaded.value),
)

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

const phoneInput = ref('')
const verificationCode = ref('')
const authStep = ref('phone')
const activeFlow = ref(null)
const activePhone = ref('')
const formError = ref('')
const formMessage = ref('')
const isSubmitting = ref(false)

const canSubmitPhone = computed(() => normalizePhone(phoneInput.value).length > 0 && !isSubmitting.value)
const canSubmitCode = computed(() => verificationCode.value.trim().length >= 4 && !isSubmitting.value)

function normalizePhone(value) {
  const compact = value.trim().replace(/[\s().-]/g, '')
  if (!compact) {
    return ''
  }
  if (compact.startsWith('+')) {
    return compact
  }
  if (/^\d{10}$/.test(compact)) {
    return `+52${compact}`
  }
  if (/^52\d{10}$/.test(compact)) {
    return `+${compact}`
  }
  return compact
}

function extractClerkError(error) {
  const primary = error?.errors?.[0] || error
  return {
    code: primary?.code || '',
    message: primary?.longMessage || primary?.message || '',
  }
}

function isMissingIdentifier(error) {
  const { code, message } = extractClerkError(error)
  const normalized = `${code} ${message}`.toLowerCase()
  return (
    normalized.includes('identifier_not_found') ||
    normalized.includes('not found') ||
    normalized.includes('no user') ||
    normalized.includes('not registered')
  )
}

function friendlyAuthError(error) {
  const { code, message } = extractClerkError(error)
  const normalized = `${code} ${message}`.toLowerCase()

  if (normalized.includes('phone') && normalized.includes('invalid')) {
    return 'Revisa el teléfono. Usa formato de México, por ejemplo +528671234567.'
  }
  if (normalized.includes('code') || normalized.includes('verification')) {
    return 'Ese código no pasó. Revisa los números o pide uno nuevo.'
  }
  if (normalized.includes('identifier') && normalized.includes('exists')) {
    return 'Ese teléfono ya tiene cuenta. Te mandamos un código para entrar.'
  }
  if (normalized.includes('captcha') || normalized.includes('bot')) {
    return 'Clerk necesita una verificación extra antes de crear la cuenta.'
  }
  if (message) {
    return message
  }
  return 'No pude completar el inicio de sesión. Inténtalo otra vez.'
}

function assertE164(phoneNumber) {
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    throw new Error('Revisa el teléfono. Usa formato de México, por ejemplo +528671234567.')
  }
}

async function resetAttempts() {
  await Promise.allSettled([signInCtx?.signIn.value?.reset?.(), signUpCtx?.signUp.value?.reset?.()])
}

async function startSignIn(phoneNumber) {
  const signIn = signInCtx?.signIn.value
  if (!signIn) {
    throw new Error('Clerk todavía no está listo.')
  }
  const created = await signIn.create({ identifier: phoneNumber })
  if (created?.error) {
    throw created.error
  }
  const sent = await signIn.phoneCode.sendCode({ phoneNumber, channel: 'sms' })
  if (sent?.error) {
    throw sent.error
  }
  activeFlow.value = 'sign-in'
}

async function startSignUp(phoneNumber) {
  const signUp = signUpCtx?.signUp.value
  if (!signUp) {
    throw new Error('Clerk todavía no está listo.')
  }
  const created = await signUp.create({
    phoneNumber,
    locale: 'es-MX',
    unsafeMetadata: { source: 'pickgo' },
  })
  if (created?.error) {
    throw created.error
  }
  const sent = await signUp.verifications.sendPhoneCode({ channel: 'sms' })
  if (sent?.error) {
    throw sent.error
  }
  activeFlow.value = 'sign-up'
}

async function submitPhone() {
  if (!authReady.value || isSubmitting.value) {
    return
  }

  const phoneNumber = normalizePhone(phoneInput.value)
  formError.value = ''
  formMessage.value = ''

  try {
    assertE164(phoneNumber)
    isSubmitting.value = true
    await resetAttempts()
    try {
      await startSignIn(phoneNumber)
    } catch (signInError) {
      if (!isMissingIdentifier(signInError)) {
        throw signInError
      }
      await startSignUp(phoneNumber)
    }
    activePhone.value = phoneNumber
    authStep.value = 'code'
    verificationCode.value = ''
    formMessage.value = `Te enviamos un código por SMS a ${phoneNumber}.`
  } catch (error) {
    formError.value = friendlyAuthError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function finalizeAttempt(resource) {
  const result = await resource.finalize()
  if (result?.error) {
    throw result.error
  }
}

async function submitCode() {
  if (!authReady.value || isSubmitting.value) {
    return
  }

  formError.value = ''
  formMessage.value = ''
  isSubmitting.value = true

  try {
    if (activeFlow.value === 'sign-in') {
      const signIn = signInCtx?.signIn.value
      const verified = await signIn.phoneCode.verifyCode({ code: verificationCode.value.trim() })
      if (verified?.error) {
        throw verified.error
      }
      if (signIn.status !== 'complete') {
        throw new Error('Falta completar una verificación adicional.')
      }
      await finalizeAttempt(signIn)
    } else {
      const signUp = signUpCtx?.signUp.value
      const verified = await signUp.verifications.verifyPhoneCode({
        code: verificationCode.value.trim(),
      })
      if (verified?.error) {
        throw verified.error
      }
      if (signUp.status !== 'complete') {
        throw new Error('Falta completar una verificación adicional.')
      }
      await finalizeAttempt(signUp)
    }
    formMessage.value = 'Listo. Ya puedes armar tu pedido.'
  } catch (error) {
    formError.value = friendlyAuthError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function resendCode() {
  if (!activePhone.value || isSubmitting.value) {
    return
  }

  formError.value = ''
  formMessage.value = ''
  isSubmitting.value = true

  try {
    if (activeFlow.value === 'sign-in') {
      const sent = await signInCtx?.signIn.value?.phoneCode.sendCode({
        phoneNumber: activePhone.value,
        channel: 'sms',
      })
      if (sent?.error) {
        throw sent.error
      }
    } else {
      const sent = await signUpCtx?.signUp.value?.verifications.sendPhoneCode({ channel: 'sms' })
      if (sent?.error) {
        throw sent.error
      }
    }
    formMessage.value = 'Te mandamos otro código.'
  } catch (error) {
    formError.value = friendlyAuthError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function startOver() {
  formError.value = ''
  formMessage.value = ''
  authStep.value = 'phone'
  activeFlow.value = null
  activePhone.value = ''
  verificationCode.value = ''
  await resetAttempts()
}

async function signOut() {
  await clerk?.value?.signOut({ redirectUrl: '/recoger' })
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
        <button class="pickup-bar__signout" type="button" @click="signOut">Salir</button>
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
      <p v-else-if="!authReady" class="gate__notice" role="status">Cargando...</p>
      <div v-else class="gate__auth">
        <form v-if="authStep === 'phone'" class="auth-form" @submit.prevent="submitPhone">
          <label class="auth-form__label" for="pickup-phone">Teléfono</label>
          <input
            id="pickup-phone"
            v-model="phoneInput"
            class="auth-form__input"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="+52 867 123 4567"
          />
          <button class="auth-form__button" type="submit" :disabled="!canSubmitPhone">
            {{ isSubmitting ? 'Enviando...' : 'Continuar con teléfono' }}
          </button>
        </form>

        <form v-else class="auth-form" @submit.prevent="submitCode">
          <span class="auth-form__eyebrow">Código SMS</span>
          <label class="auth-form__label" for="pickup-code">Escribe el código</label>
          <input
            id="pickup-code"
            v-model="verificationCode"
            class="auth-form__input auth-form__input--code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            placeholder="424242"
          />
          <button class="auth-form__button" type="submit" :disabled="!canSubmitCode">
            {{ isSubmitting ? 'Revisando...' : 'Entrar a Pick&Go' }}
          </button>
          <div class="auth-form__links">
            <button type="button" @click="resendCode">Reenviar</button>
            <button type="button" @click="startOver">Cambiar teléfono</button>
          </div>
        </form>

        <p v-if="formError" class="auth-form__message auth-form__message--error" role="alert">
          {{ formError }}
        </p>
        <p v-else-if="formMessage" class="auth-form__message" role="status">{{ formMessage }}</p>
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

.pickup-bar__signout {
  min-width: 64px;
  min-height: 44px;
  border: 1px solid rgb(143 229 191 / 48%);
  border-radius: 999px;
  background: rgb(143 229 191 / 10%);
  color: #eafff5;
  font-size: 0.82rem;
  font-weight: 900;
}

.pickup-bar__signout:hover {
  background: rgb(143 229 191 / 18%);
}

/* ---- Gate (LoginView-style card) ---- */
.gate {
  --bg: #fff8ef;
  --surface: #ffffff;
  --line: #efe1cb;
  --ink: #2e1c12;
  --muted: #9c8473;
  --orange: #d36c00;
  --green: #2f7f57;

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
  box-shadow: 0 2px 4px rgb(46 28 18 / 5%), 0 22px 50px rgb(46 28 18 / 9%);
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

.gate__auth {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  width: min(100%, 390px);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgb(46 28 18 / 8%);
}

.auth-form__eyebrow {
  color: var(--green);
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.auth-form__label {
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 900;
}

.auth-form__input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid #dfcab0;
  border-radius: 8px;
  background: #fffdf9;
  color: var(--ink);
  font-size: 1rem;
  font-weight: 800;
  outline: none;
}

.auth-form__input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgb(47 127 87 / 14%);
}

.auth-form__input--code {
  letter-spacing: 0.16em;
  text-align: center;
}

.auth-form__button {
  min-height: 48px;
  border: 0;
  border-radius: 8px;
  background: #2f7f57;
  color: #fff;
  font-size: 0.94rem;
  font-weight: 900;
}

.auth-form__button:hover {
  background: #276b4a;
}

.auth-form__button:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.auth-form__links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.auth-form__links button {
  min-height: 42px;
  border: 1px solid #dfcab0;
  border-radius: 8px;
  background: #fff8ef;
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 900;
}

.auth-form__message {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid rgb(47 127 87 / 24%);
  border-radius: 8px;
  background: rgb(47 127 87 / 8%);
  color: var(--green);
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1.35;
}

.auth-form__message--error {
  border-color: rgb(180 54 38 / 28%);
  background: rgb(180 54 38 / 8%);
  color: #9b2f24;
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
