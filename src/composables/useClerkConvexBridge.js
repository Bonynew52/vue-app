import { watch } from 'vue'
import { useAuth } from '@clerk/vue'
import { useConvexClient } from 'convex-vue'
import { useRoute } from 'vue-router'

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
const hasConvex = Boolean(import.meta.env.VITE_CONVEX_URL)

/**
 * Bridges Clerk sessions into the Convex client so `ctx.auth.getUserIdentity()`
 * works in Convex functions. Call once from a component that is always mounted
 * (App.vue). No-ops when Clerk or Convex are not configured, so the table QR
 * flow and the staff dashboard never depend on Clerk.
 *
 * ConvexClient.setAuth(fetchToken) re-invokes the fetcher when a token expires,
 * but it does not poll while signed out, so we re-arm it whenever Clerk's
 * signed-in state flips (mirrors ConvexProviderWithClerk in convex/react-clerk).
 */
export function useClerkConvexBridge() {
  if (!hasClerk || !hasConvex) {
    return
  }

  const client = useConvexClient()
  const route = useRoute()
  // From @clerk/vue, these are ComputedRefs; getToken resolves once Clerk loads
  // and returns null when there is no session.
  const { isLoaded, isSignedIn, getToken } = useAuth()

  const fetchToken = async ({ forceRefreshToken }) => {
    try {
      const token = await getToken.value({
        template: 'convex',
        ...(forceRefreshToken ? { skipCache: true } : {}),
      })
      return token ?? null
    } catch {
      return null
    }
  }

  watch(
    [() => route.name, isLoaded, isSignedIn],
    ([routeName, loaded, signedIn]) => {
      if (routeName !== 'pickup') {
        return
      }
      if (!loaded) {
        return
      }
      if (signedIn) {
        client.setAuth(fetchToken)
      } else {
        client.client.clearAuth()
      }
    },
    { immediate: true },
  )
}
