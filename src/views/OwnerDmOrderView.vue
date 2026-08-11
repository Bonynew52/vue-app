<script setup>
import { computed, ref } from 'vue'
import brandLogo from '../assets/background/belly_monster_logo.png'

const TEST_PASSWORD = 'prueba 123'

const password = ref('')
const isUnlocked = ref(false)
const passwordError = ref('')
const customerName = ref('')
const messageText = ref('')
const submitMessage = ref('')

const canSubmit = computed(() => customerName.value.trim() && messageText.value.trim())

function unlock() {
  passwordError.value = ''
  if (password.value.trim() !== TEST_PASSWORD) {
    passwordError.value = 'Contrasena incorrecta.'
    return
  }
  isUnlocked.value = true
}

function submitRequest() {
  if (!canSubmit.value) {
    submitMessage.value = 'Agrega nombre y texto antes de enviar.'
    return
  }

  submitMessage.value = 'Se envio la peticion.'
  customerName.value = ''
  messageText.value = ''
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
          Contrasena
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Contrasena de prueba"
          />
        </label>
        <p v-if="passwordError" class="dm-error" role="alert">{{ passwordError }}</p>
        <button type="submit">Entrar</button>
      </form>

      <form v-else class="dm-form" @submit.prevent="submitRequest">
        <label>
          Nombre
          <input v-model="customerName" type="text" autocomplete="name" placeholder="Nombre del cliente" />
        </label>

        <label>
          Texto
          <textarea v-model="messageText" rows="5" placeholder="Pedido o mensaje recibido" />
        </label>

        <button type="submit">Enviar peticion</button>
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
