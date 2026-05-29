<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'
import brandLogo from '../assets/background/belly_monster_logo-removed.png'

const router = useRouter()

const form = reactive({
  email: 'staff@bellymonsterbites.com',
  password: '',
})

const isSubmitting = ref(false)
const error = ref('')

async function signIn() {
  isSubmitting.value = true
  error.value = ''

  try {
    const result = await authClient.signIn.email({
      email: form.email.trim(),
      password: form.password,
      rememberMe: true,
    })

    if (result?.error) {
      throw new Error(result.error.message || 'No se pudo iniciar sesion.')
    }

    await router.replace({ name: 'orders' })
  } catch (authError) {
    error.value = authError.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="staff-login">
    <div class="login-card">
      <img class="login-logo" :src="brandLogo" alt="Belly Monster Bites" />

      <h1 class="login-title">Acceso del personal</h1>
      <p class="login-sub">Tablero de pedidos de mesa · uso interno</p>

      <form class="login-form" name="staff-login" @submit.prevent="signIn">
        <div class="field">
          <label for="staff-email">Correo</label>
          <input
            id="staff-email"
            v-model="form.email"
            name="email"
            type="email"
            autocomplete="username"
            inputmode="email"
            autocapitalize="off"
            spellcheck="false"
            required
          />
        </div>

        <div class="field">
          <label for="staff-password">Contraseña</label>
          <input
            id="staff-password"
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" class="login-error" role="alert">{{ error }}</p>

        <button class="login-submit" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Entrando…' : 'Entrar al tablero' }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.staff-login {
  --bg: #fff8ef;
  --surface: #ffffff;
  --line: #efe1cb;
  --ink: #2e1c12;
  --coffee: #7e4743;
  --muted: #9c8473;
  --faint: #c2ad97;
  --orange: #d36c00;
  --orange-press: #b85e00;
  --danger: #c0392b;

  display: grid;
  place-items: center;
  min-height: 100svh;
  padding: max(28px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
  background:
    radial-gradient(120% 70% at 50% -8%, rgb(248 217 74 / 28%) 0%, rgb(248 217 74 / 0%) 55%),
    var(--bg);
  color: var(--ink);
  font-family: 'Archivo', system-ui, -apple-system, sans-serif;
}

.login-card {
  position: relative;
  width: min(100%, 390px);
  padding: 64px 32px 30px;
  margin-top: 52px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: 0 2px 4px rgb(46 28 18 / 5%), 0 22px 50px rgb(46 28 18 / 9%);
  text-align: center;
}

.login-logo {
  position: absolute;
  top: -52px;
  left: 50%;
  width: 104px;
  height: 104px;
  transform: translateX(-50%);
  border-radius: 50%;
  box-shadow: 0 8px 22px rgb(126 71 67 / 22%);
}

.login-title {
  margin: 0 0 5px;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.login-sub {
  margin: 0 0 26px;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 600;
}

.login-form {
  display: grid;
  gap: 16px;
  text-align: left;
}

.field {
  display: grid;
  gap: 7px;
}

.field label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--coffee);
}

.field input {
  width: 100%;
  min-height: 52px;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fffaf3;
  color: var(--ink);
  font-size: 1rem;
  font-weight: 600;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.field input:focus {
  outline: none;
  border-color: var(--orange);
  box-shadow: 0 0 0 3px rgb(211 108 0 / 18%);
}

.login-error {
  margin: -2px 0 0;
  padding: 10px 12px;
  border: 1px solid rgb(192 57 43 / 24%);
  border-radius: 10px;
  background: rgb(192 57 43 / 7%);
  color: var(--danger);
  font-size: 0.88rem;
  font-weight: 700;
}

.login-submit {
  min-height: 54px;
  margin-top: 4px;
  border: 0;
  border-radius: 13px;
  background: var(--orange);
  color: #fff;
  font-size: 1.04rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  box-shadow: 0 6px 16px rgb(211 108 0 / 28%);
  transition: background-color 140ms ease, transform 80ms ease;
}

.login-submit:hover {
  background: var(--orange-press);
}

.login-submit:active {
  transform: translateY(1px);
}

.login-submit:disabled {
  cursor: progress;
  opacity: 0.62;
  box-shadow: none;
}
</style>
