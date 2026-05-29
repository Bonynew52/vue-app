if (!process.env.STAFF_PASSWORD) {
  console.error('Set STAFF_PASSWORD before creating the staff user.')
  process.exit(1)
}

process.env.ALLOW_STAFF_SIGNUP = 'true'

const { auth } = await import('../auth.js')

const email = process.env.STAFF_EMAIL || 'staff@bellymonsterbites.com'
const name = process.env.STAFF_NAME || 'Belly Monster Staff'

try {
  await auth.api.signUpEmail({
    body: {
      email,
      password: process.env.STAFF_PASSWORD,
      name,
    },
    headers: new Headers(),
  })
  console.log(`Created staff user: ${email}`)
} catch (error) {
  const message = error?.body?.message || error?.message || String(error)
  if (/already|existe|exists|duplic/i.test(message)) {
    console.log(`Staff user already exists: ${email}`)
  } else {
    throw error
  }
}
