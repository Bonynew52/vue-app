<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  detail: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <article class="stat-card">
    <p>{{ label }}</p>
    <strong>{{ value }}</strong>
    <span>{{ detail }}</span>
  </article>
</template>

<style scoped>
.stat-card {
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

p,
strong,
span {
  display: block;
}

p {
  margin: 0 0 12px;
  color: var(--color-secondary-dark);
  font-size: 0.86rem;
  font-weight: 700;
}

strong {
  color: var(--color-text);
  font-size: 1.8rem;
  line-height: 1;
}

span {
  margin-top: 10px;
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
