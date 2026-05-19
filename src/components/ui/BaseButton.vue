<script setup>
defineProps({
  href: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'primary',
  },
})
</script>

<template>
  <a v-if="href" class="base-button" :class="variant" :href="href">
    <slot />
  </a>
  <button v-else class="base-button" :class="variant" type="button">
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-weight: 800;
  text-decoration: none;
}

.primary {
  background: var(--color-second);
  color: var(--color-text);
}

.primary:hover {
  background: var(--color-accent);
}

.secondary {
  border-color: var(--color-secondary);
  background: var(--color-surface);
  color: var(--color-text);
}

.secondary:hover {
  background: var(--color-secondary);
}
</style>
