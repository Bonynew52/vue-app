<script setup>
import { onMounted } from 'vue'
import { reactive, ref } from 'vue'

const form = reactive({
  name: 'Cristian',
  email: 'test@example.com',
  favorite: 'Cinnamon Roll Tres Leches',
  message: 'Este es un envio de prueba desde Vue hacia Laravel.',
})

const isSubmitting = ref(false)
const responseMessage = ref('')
const responseData = ref(null)
const errorMessage = ref('')
const submissions = ref([])
const isLoadingSubmissions = ref(false)

async function loadSubmissions() {
  isLoadingSubmissions.value = true

  try {
    const response = await fetch('/api/test-form', {
      headers: {
        Accept: 'application/json',
      },
    })
    const payload = await response.json()
    submissions.value = payload.data || []
  } catch {
    submissions.value = []
  } finally {
    isLoadingSubmissions.value = false
  }
}

async function submitForm() {
  isSubmitting.value = true
  responseMessage.value = ''
  responseData.value = null
  errorMessage.value = ''

  try {
    const response = await fetch('/api/test-form', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    })

    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.message || 'No se pudo enviar el formulario.')
    }

    responseMessage.value = payload.message
    responseData.value = payload.data
    await loadSubmissions()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadSubmissions()
})
</script>

<template>
  <main class="test-form-view">
    <section class="form-shell">
      <div class="form-copy">
        <p class="eyebrow">Formulario de prueba</p>
        <h1>Datos para mandar al backend</h1>
        <p>
          Esta pantalla envia un POST a Laravel con datos simples para probar la conexion.
        </p>
      </div>

      <form class="test-form" @submit.prevent="submitForm">
        <label>
          Nombre
          <input v-model="form.name" name="name" type="text" required />
        </label>

        <label>
          Email
          <input v-model="form.email" name="email" type="email" required />
        </label>

        <label>
          Producto favorito
          <input v-model="form.favorite" name="favorite" type="text" required />
        </label>

        <label>
          Mensaje
          <textarea v-model="form.message" name="message" rows="5" required></textarea>
        </label>

        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Enviando...' : 'Enviar prueba' }}
        </button>

        <p v-if="responseMessage" class="status success">{{ responseMessage }}</p>
        <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>

        <pre v-if="responseData">{{ responseData }}</pre>
      </form>

      <section class="received-panel" aria-label="Datos recibidos por el backend">
        <div class="received-header">
          <h2>Recibido por backend</h2>
          <button class="ghost-button" type="button" @click="loadSubmissions">
            {{ isLoadingSubmissions ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>

        <p v-if="!submissions.length" class="empty-state">
          Todavia no hay envios guardados.
        </p>

        <article
          v-for="submission in submissions"
          :key="submission.id"
          class="submission-card"
        >
          <strong>{{ submission.name }}</strong>
          <span>{{ submission.email }}</span>
          <span>{{ submission.favorite }}</span>
          <p>{{ submission.message }}</p>
          <small>{{ submission.received_at }}</small>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
.test-form-view {
  display: flex;
  justify-content: center;
  width: min(100%, 1180px);
  min-height: calc(100vh - 100px);
  margin: 0 auto;
  padding: clamp(28px, 5vw, 64px) clamp(16px, 4vw, 48px);
}

.form-shell {
  display: grid;
  grid-template-columns: minmax(240px, 0.8fr) minmax(280px, 1fr);
  gap: clamp(24px, 5vw, 64px);
  align-items: start;
  width: 100%;
  padding: clamp(18px, 3vw, 32px);
  border: 2px solid var(--color-third);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-third);
  box-shadow: var(--shadow-panel);
}

.received-panel {
  grid-column: 1 / -1;
  display: grid;
  gap: 14px;
  border-top: 2px solid color-mix(in srgb, var(--color-third) 32%, white);
  padding-top: clamp(18px, 3vw, 28px);
}

.received-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0;
  color: var(--color-third);
  font-size: clamp(1.7rem, 3vw, 2.5rem);
  line-height: 1;
}

.form-copy {
  max-width: 360px;
  align-self: start;
  overflow-wrap: anywhere;
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--color-third);
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 9ch;
  margin: 0;
  color: var(--color-third);
  font-size: clamp(2.4rem, 5vw, 4.8rem);
  line-height: 0.92;
}

p {
  max-width: 32rem;
  margin: 22px 0 0;
  color: #0f1115;
  font-size: clamp(1rem, 1.7vw, 1.3rem);
  font-weight: 800;
  line-height: 1.3;
}

.test-form {
  display: grid;
  gap: 18px;
}

label {
  display: grid;
  gap: 8px;
  color: #0f1115;
  font-weight: 900;
}

input,
textarea {
  width: 100%;
  border: 2px solid color-mix(in srgb, var(--color-third) 48%, white);
  border-radius: 6px;
  padding: 14px 16px;
  background: #ffffff;
  color: #0f1115;
  font-weight: 700;
}

input:focus,
textarea:focus {
  outline: 3px solid color-mix(in srgb, var(--color-third) 28%, transparent);
  border-color: var(--color-third);
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

.ghost-button {
  border: 2px solid var(--color-third);
  background: transparent;
  color: var(--color-third);
}

button:disabled {
  opacity: 0.65;
}

.status {
  margin: 0;
  font-size: 1rem;
}

.success {
  color: #1d6b3a;
}

.error {
  color: #9f1d1d;
}

.empty-state {
  margin: 0;
}

.submission-card {
  display: grid;
  gap: 4px;
  border: 2px solid color-mix(in srgb, var(--color-third) 35%, white);
  border-radius: 6px;
  padding: 14px;
  background: #f6f2ee;
  color: #0f1115;
}

.submission-card strong {
  color: var(--color-third);
  font-size: 1.1rem;
}

.submission-card span,
.submission-card small {
  font-weight: 800;
}

.submission-card p {
  margin: 8px 0;
  font-size: 1rem;
}

pre {
  margin: 0;
  overflow: auto;
  border-radius: 6px;
  padding: 14px;
  background: #0f1115;
  color: #ffffff;
  font-size: 0.9rem;
}

@media (max-width: 820px) {
  .form-shell {
    grid-template-columns: 1fr;
  }

  .form-copy {
    position: static;
  }

  h1 {
    max-width: 11ch;
  }
}
</style>
