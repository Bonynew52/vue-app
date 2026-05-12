<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <main class="page">
    <section class="panel">
      <p class="eyebrow">Vue is running locally</p>
      <h1>New Project</h1>
      <p class="intro">
        Your Vue.js test page is ready. Edit <code>src/App.vue</code> to start building.
      </p>
      <button type="button" @click="count++">Count is {{ count }}</button>
    </section>
  </main>
</template>
