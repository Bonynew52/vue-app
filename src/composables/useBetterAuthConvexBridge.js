import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useConvexClient } from 'convex-vue'
import { authClient } from '../lib/auth-client'

const hasBetterAuth = Boolean(import.meta.env.VITE_CONVEX_SITE_URL)
const hasConvex = Boolean(import.meta.env.VITE_CONVEX_URL)

export function useBetterAuthConvexBridge() {
  if (!hasBetterAuth || !hasConvex) {
    return
  }

  const client = useConvexClient()
  const route = useRoute()
  const sessionState = authClient.useSession()
  let hadStaffSession = false

  const fetchToken = async () => {
    try {
      const result = await authClient.convex.token({ fetchOptions: { throw: false } })
      return result?.data?.token || null
    } catch {
      return null
    }
  }

  watch(
    [
      () => route.name,
      () => sessionState.value?.data?.session?.id,
    ],
    ([routeName, sessionId]) => {
      if (routeName === 'orders') {
        if (sessionId) {
          hadStaffSession = true
          client.setAuth(fetchToken)
        } else if (hadStaffSession) {
          client.client.clearAuth()
        } else {
          // A direct /ordenes load starts before useSession resolves. Setting
          // the fetcher immediately lets Convex wait for the stored session.
          client.setAuth(fetchToken)
        }
      } else if (routeName === 'login') {
        hadStaffSession = false
        client.client.clearAuth()
      }
    },
    { immediate: true },
  )
}
