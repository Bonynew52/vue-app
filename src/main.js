import { createApp } from 'vue'
import { convexVue } from 'convex-vue'
import { clerkPlugin } from '@clerk/vue'
import { esMX } from '@clerk/localizations'
import App from './App.vue'
import { router } from './router'
import './assets/styles/main.css'

const app = createApp(App)

app.use(router)

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (convexUrl) {
  app.use(convexVue, { url: convexUrl })
}

// Clerk only powers the Pick&Go customer flow. If the key is missing, skip it
// entirely so /, /menu, /ordenar and the staff flows keep working.
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (clerkPublishableKey) {
  app.use(clerkPlugin, { publishableKey: clerkPublishableKey, localization: esMX })
}

app.mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
