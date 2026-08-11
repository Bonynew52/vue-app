<script setup>
import { computed, ref } from 'vue'
import { useConvexMutation } from 'convex-vue'
import { api } from '../../convex/_generated/api'
import brandLogo from '../assets/background/belly_monster_logo.png'

const TOKEN_STORAGE_KEY = 'belly-dm-request-token'

function readStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) || ''
}

function saveStoredToken(value) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, value)
}

const password = ref(readStoredToken())
const isUnlocked = ref(Boolean(password.value))
const showTokenConfig = ref(false)
const passwordError = ref('')
const customerName = ref('')
const messageText = ref('')
const submitMessage = ref('')
const submitError = ref('')
const isSubmitting = ref(false)
const hasConvex = Boolean(import.meta.env.VITE_CONVEX_URL)
const createTextPrintJob = hasConvex ? useConvexMutation(api.textPrintJobs.create) : null

const canSubmit = computed(() => customerName.value.trim() && messageText.value.trim() && !isSubmitting.value)

function unlock() {
  passwordError.value = ''
  const token = password.value.trim()
  if (!token) {
    passwordError.value = 'Agrega el token antes de entrar.'
    return
  }
  password.value = token
  saveStoredToken(token)
  isUnlocked.value = true
  showTokenConfig.value = false
}

function openTokenConfig() {
  passwordError.value = ''
  showTokenConfig.value = true
}

function closeTokenConfig() {
  password.value = readStoredToken()
  passwordError.value = ''
  showTokenConfig.value = false
}

async function submitRequest() {
  submitMessage.value = ''
  submitError.value = ''
  const token = password.value.trim()
  if (!token) {
    submitError.value = 'Configura el token antes de enviar.'
    showTokenConfig.value = true
    return
  }

  if (!canSubmit.value) {
    submitError.value = 'Agrega nombre y texto antes de enviar.'
    return
  }

  if (!hasConvex) {
    submitError.value = 'No hay conexion al backend.'
    return
  }

  isSubmitting.value = true
  try {
    const result = await createTextPrintJob.mutate({
      password: token,
      name: customerName.value,
      text: messageText.value,
    })

    saveStoredToken(token)
    submitMessage.value = `Se envio la peticion #${result.code}.`
    customerName.value = ''
    messageText.value = ''
  } catch (error) {
    submitError.value = error?.message || 'No se pudo enviar la peticion.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="dm-placeholder" aria-label="Pedidos DM">
    <section class="dm-card">
      <img class="dm-logo" :src="brandLogo" alt="Belly Monster Bites" />
      <p class="dm-eyebrow">Beta interna</p>
      <h1>Pedidos DM</h1>

      <form v-if="!isUnlocked" class="dm-form" @submit.prevent="unlock">
        <label>
          Token
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Token de pedidos"
          />
        </label>
        <p v-if="passwordError" class="dm-error" role="alert">{{ passwordError }}</p>
        <button type="submit">Entrar</button>
      </form>

      <form v-else class="dm-form" @submit.prevent="submitRequest">
        <div class="dm-toolbar">
          <span>Token configurado</span>
          <button type="button" class="dm-secondary" @click="openTokenConfig">Cambiar</button>
        </div>

        <div v-if="showTokenConfig" class="dm-config">
          <label>
            Token
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="Token de pedidos"
            />
          </label>
          <div class="dm-actions">
            <button type="button" class="dm-secondary" @click="closeTokenConfig">Cancelar</button>
            <button type="button" @click="unlock">Guardar token</button>
          </div>
          <p v-if="passwordError" class="dm-error" role="alert">{{ passwordError }}</p>
        </div>

        <label>
          Nombre
          <input v-model="customerName" type="text" autocomplete="name" placeholder="Nombre del cliente" />
        </label>

        <label>
          Texto
          <textarea v-model="messageText" rows="5" placeholder="Pedido o mensaje recibido" />
        </label>

        <button type="submit" :disabled="!canSubmit">
          {{ isSubmitting ? 'Enviando...' : 'Enviar peticion' }}
        </button>
        <p v-if="submitError" class="dm-error" role="alert">{{ submitError }}</p>
        <p v-if="submitMessage" class="dm-success" role="status">{{ submitMessage }}</p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.dm-placeholder {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 16px;
  background: #f8f1e8;
  color: #25170f;
}

.dm-card {
  width: min(100%, 440px);
  border: 1px solid #e6d4bd;
  border-radius: 8px;
  padding: 18px;
  background: #fffaf3;
}

.dm-logo {
  display: block;
  width: 72px;
  height: 72px;
  margin: 0 auto 10px;
  object-fit: contain;
}

.dm-eyebrow {
  margin: 0;
  color: #7b5f4a;
  font-size: 0.82rem;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
}

h1 {
  margin: 2px 0 18px;
  font-size: 2rem;
  text-align: center;
}

.dm-form {
  display: grid;
  gap: 12px;
}

.dm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #2f7f57;
  font-size: 0.9rem;
  font-weight: 900;
}

.dm-config {
  display: grid;
  gap: 10px;
  border: 1px solid #e6d4bd;
  border-radius: 8px;
  padding: 12px;
  background: #fff4e6;
}

.dm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

label {
  display: grid;
  gap: 6px;
  color: #694f3d;
  font-size: 0.9rem;
  font-weight: 900;
}

input,
textarea {
  width: 100%;
  border: 1px solid #d8c3aa;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  color: #25170f;
  font: inherit;
}

textarea {
  resize: vertical;
}

button {
  min-height: 46px;
  border: 1px solid #2f7f57;
  border-radius: 8px;
  background: #2f7f57;
  color: #fff;
  font-weight: 900;
}

.dm-secondary {
  border-color: #c9b396;
  background: #fffaf3;
  color: #694f3d;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dm-error {
  margin: 0;
  color: #a43322;
  font-weight: 900;
}

.dm-success {
  margin: 0;
  color: #2f7f57;
  font-weight: 900;
}
</style>
