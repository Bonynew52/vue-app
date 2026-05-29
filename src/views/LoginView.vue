<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'

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
    <section class="login-card">
      <p class="eyebrow">Belly Monster Bites</p>
      <h1>Panel del personal</h1>
      <p class="copy">Entra para ver pedidos de mesa y pasarlos a Parrot.</p>

      <form class="login-form" @submit.prevent="signIn">
        <label>
          Correo
          <input
            v-model="form.email"
            type="email"
            autocomplete="username"
            inputmode="email"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>

        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Entrando...' : 'Entrar' }}
        </button>

        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.staff-login {
  min-height: calc(100svh - var(--app-header-height, 0px));
  display: grid;
  place-items: center;
  padding: max(24px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom));
  background: #fff8ef;
  color: #2a1c14;
}

.login-card {
  width: min(100%, 390px);
  padding: 24px;
  border: 1px solid #eadfce;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 50px rgb(42 28 20 / 12%);
}

.eyebrow {
  margin: 0 0 8px;
  color: #8b7a6d;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1;
}

.copy {
  margin: 12px 0 22px;
  color: #6f4e37;
  line-height: 1.45;
}

.login-form {
  display: grid;
  gap: 16px;
}

label {
  display: grid;
  gap: 7px;
  color: #2a1c14;
  font-weight: 800;
}

input {
  width: 100%;
  min-height: 46px;
  border: 1px solid #ded0bf;
  border-radius: 8px;
  padding: 0 13px;
  background: #fffaf4;
  color: #2a1c14;
}

input:focus {
  outline: 3px solid rgb(31 157 87 / 18%);
  border-color: #1f9d57;
}

button {
  min-height: 50px;
  border: 0;
  border-radius: 8px;
  background: #1f9d57;
  color: #fff;
  font-weight: 900;
}

button:disabled {
  cursor: progress;
  opacity: 0.68;
}

.error {
  margin: 0;
  color: #b42a2a;
  font-weight: 800;
}
</style>
