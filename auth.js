import { betterAuth } from 'better-auth'
import pg from 'pg'

const { Pool } = pg

function getBaseUrl() {
  if (process.env.NODE_ENV !== 'production') {
    return process.env.LOCAL_BETTER_AUTH_URL || 'http://localhost:3000'
  }

  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

function getTrustedOrigins() {
  return [
    'https://bellymonsterbites.com',
    'https://www.bellymonsterbites.com',
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ].filter(Boolean)
}

const authPool =
  globalThis.__bellyAuthPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__bellyAuthPool = authPool
}

export const auth = betterAuth({
  appName: 'Belly Monster Bites',
  basePath: '/api/auth',
  baseURL: getBaseUrl(),
  database: authPool,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.ALLOW_STAFF_SIGNUP !== 'true',
  },
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: getTrustedOrigins(),
})
