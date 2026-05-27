import { computed, ref, watch } from 'vue'

function storageKey(tableId) {
  return `belly-monster-cart:${tableId || 'sin-mesa'}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && window.sessionStorage
}

export function useCart(tableId) {
  const items = ref({})
  const key = storageKey(tableId)

  if (canUseStorage()) {
    try {
      const savedItems = JSON.parse(window.sessionStorage.getItem(key) || '{}')
      if (savedItems && typeof savedItems === 'object') {
        items.value = savedItems
      }
    } catch {
      items.value = {}
    }
  }

  watch(
    items,
    (value) => {
      if (!canUseStorage()) {
        return
      }

      window.sessionStorage.setItem(key, JSON.stringify(value))
    },
    { deep: true },
  )

  const entries = computed(() => Object.values(items.value))
  const count = computed(() =>
    entries.value.reduce((total, entry) => total + Number(entry.quantity || 0), 0),
  )
  const estimatedTotal = computed(() =>
    entries.value.reduce((total, entry) => {
      if (!entry.hasPrice) {
        return total
      }

      return total + entry.price * entry.quantity
    }, 0),
  )
  const hasUnpriced = computed(() => entries.value.some((entry) => !entry.hasPrice))

  function add(item) {
    const current = items.value[item.id]

    items.value = {
      ...items.value,
      [item.id]: current
        ? { ...current, quantity: current.quantity + 1 }
        : {
            id: item.id,
            name: item.name,
            categoryName: item.categoryName,
            price: item.price,
            hasPrice: item.hasPrice,
            quantity: 1,
          },
    }
  }

  function decrement(itemId) {
    const current = items.value[itemId]
    if (!current) {
      return
    }

    if (current.quantity <= 1) {
      remove(itemId)
      return
    }

    items.value = {
      ...items.value,
      [itemId]: { ...current, quantity: current.quantity - 1 },
    }
  }

  function remove(itemId) {
    const nextItems = { ...items.value }
    delete nextItems[itemId]
    items.value = nextItems
  }

  function clear() {
    items.value = {}
  }

  function quantityFor(itemId) {
    return items.value[itemId]?.quantity || 0
  }

  return {
    items,
    entries,
    count,
    estimatedTotal,
    hasUnpriced,
    add,
    decrement,
    remove,
    clear,
    quantityFor,
  }
}
