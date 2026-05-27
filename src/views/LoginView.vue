<script setup>
import { reactive, ref } from 'vue'

const loginForm = reactive({
  email: 'cliente@example.com',
  password: 'secret123',
})

const registerForm = reactive({
  name: 'Cliente de prueba',
  email: 'cliente@example.com',
  password: 'secret123',
})

const user = ref(null)
const message = ref('')
const error = ref('')
const isLoading = ref(false)

async function sendAuthRequest(path, data) {
  isLoading.value = true
  message.value = ''
  error.value = ''

  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.message || 'No se pudo completar la solicitud.')
    }

    user.value = payload.user
    message.value = payload.message
  } catch (authError) {
    error.value = authError.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="login-view">
    <section class="login-shell">
      <div class="login-copy">
        <p class="eyebrow">Cuentas</p>
        <h1>Login conectado a MySQL</h1>
        <p>Estas pruebas crean y validan usuarios desde la base de datos del backend.</p>
      </div>

      <div class="auth-panels">
        <form class="auth-card" @submit.prevent="sendAuthRequest('/api/auth/register', registerForm)">
          <h2>Crear cuenta</h2>

          <label>
            Nombre
            <input v-model="registerForm.name" type="text" required />
          </label>

          <label>
            Email
            <input v-model="registerForm.email" type="email" required />
          </label>

          <label>
            Password
            <input v-model="registerForm.password" type="password" required />
          </label>

          <button type="submit" :disabled="isLoading">
            {{ isLoading ? 'Procesando...' : 'Registrar' }}
          </button>
        </form>

        <form class="auth-card" @submit.prevent="sendAuthRequest('/api/auth/login', loginForm)">
          <h2>Iniciar sesion</h2>

          <label>
            Email
            <input v-model="loginForm.email" type="email" required />
          </label>

          <label>
            Password
            <input v-model="loginForm.password" type="password" required />
          </label>

          <button type="submit" :disabled="isLoading">
            {{ isLoading ? 'Procesando...' : 'Entrar' }}
          </button>
        </form>
      </div>

      <section class="auth-result" aria-label="Resultado de autenticacion">
        <p v-if="message" class="success">{{ message }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <pre v-if="user">{{ user }}</pre>
      </section>
    </section>
  </main>
</template>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  width: min(100%, 1180px);
  min-height: max(0px, calc(100svh - var(--app-header-height) - var(--app-footer-min-height)));
  margin: 0 auto;
  padding: clamp(28px, 5vw, 64px) clamp(16px, 4vw, 48px);
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(240px, 0.75fr) minmax(320px, 1.15fr);
  gap: clamp(24px, 5vw, 64px);
  width: 100%;
  padding: clamp(18px, 3vw, 32px);
  border: 2px solid var(--color-third);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-third);
  box-shadow: var(--shadow-panel);
}

.login-copy {
  max-width: 360px;
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--color-third);
  font-size: 0.9rem;
  font-weight: 900;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--color-third);
  font-size: clamp(2.4rem, 5vw, 4.8rem);
  line-height: 0.92;
}

.login-copy p {
  margin: 22px 0 0;
  color: #0f1115;
  font-size: clamp(1rem, 1.7vw, 1.3rem);
  font-weight: 800;
  line-height: 1.3;
}

.auth-panels {
  display: grid;
  gap: 18px;
}

.auth-card {
  display: grid;
  gap: 14px;
  border: 2px solid color-mix(in srgb, var(--color-third) 35%, white);
  border-radius: 6px;
  padding: 18px;
  background: #f6f2ee;
}

h2 {
  margin: 0;
  color: var(--color-third);
}

label {
  display: grid;
  gap: 8px;
  color: #0f1115;
  font-weight: 900;
}

input {
  width: 100%;
  border: 2px solid color-mix(in srgb, var(--color-third) 48%, white);
  border-radius: 6px;
  padding: 14px 16px;
  background: #ffffff;
  color: #0f1115;
  font-weight: 700;
}

button {
  width: fit-content;
  border: 0;
  border-radius: 6px;
  padding: 14px 22px;
  background: var(--color-third);
  color: #ffffff;
  font-weight: 900;
}

.auth-result {
  grid-column: 1 / -1;
}

.success {
  color: #1d6b3a;
  font-weight: 900;
}

.error {
  color: #9f1d1d;
  font-weight: 900;
}

pre {
  overflow: auto;
  border-radius: 6px;
  padding: 14px;
  background: #0f1115;
  color: #ffffff;
}

@media (max-width: 820px) {
  .login-shell {
    grid-template-columns: 1fr;
  }
}
</style>
