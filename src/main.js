import { createApp } from 'vue'
import { convexVue } from 'convex-vue'
import App from './App.vue'
import { router } from './router'
import { setupSentry } from './lib/sentry'
import './assets/styles/main.css'

const app = createApp(App)

setupSentry(app, router)

app.use(router)

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (convexUrl) {
  app.use(convexVue, { url: convexUrl })
}

app.mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
