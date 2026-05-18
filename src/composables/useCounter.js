import { ref } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)

  function increment() {
    count.value += 1
  }

  function reset() {
    count.value = initialValue
  }

  return {
    count,
    increment,
    reset,
  }
}
