<script setup>
import AppLayout from './components/layout/AppLayout.vue'
import { useClerkConvexBridge } from './composables/useClerkConvexBridge'

useClerkConvexBridge()
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
