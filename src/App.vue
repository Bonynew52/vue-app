<script setup>
import AppLayout from './components/layout/AppLayout.vue'
import { useBetterAuthConvexBridge } from './composables/useBetterAuthConvexBridge'
import { useClerkConvexBridge } from './composables/useClerkConvexBridge'

useBetterAuthConvexBridge()
useClerkConvexBridge()
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
