import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,

  // Replay is only used in the browser — 10% of sessions, 100% on error
  integrations: [
    Sentry.replayIntegration(),
  ],

  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only enable when DSN is provided
  enabled: Boolean(SENTRY_DSN),
})
