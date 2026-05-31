import * as Sentry from '@sentry/vue'

function numericEnv(name, fallback) {
  const value = Number.parseFloat(import.meta.env[name])

  return Number.isFinite(value) ? value : fallback
}

export function setupSentry(app, router) {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    return
  }

  const integrations = [
    Sentry.browserTracingIntegration({
      router,
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/(www\.)?bellymonsterbites\.com\/api\//,
      ],
    }),
  ]

  if (import.meta.env.VITE_SENTRY_ENABLE_REPLAY === 'true') {
    integrations.push(Sentry.replayIntegration())
  }

  Sentry.init({
    app,
    dsn,
    environment: import.meta.env.VITE_VERCEL_ENV || import.meta.env.MODE,
    integrations,
    sendDefaultPii: false,
    tracesSampleRate: numericEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', 0.1),
    replaysSessionSampleRate: numericEnv('VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE', 0),
    replaysOnErrorSampleRate: numericEnv('VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE', 0),
  })

  Sentry.setTag('app', 'belly-monster-bites')
}
