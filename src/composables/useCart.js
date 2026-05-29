import { computed, ref, watch } from 'vue'

function storageKey(tableId) {
  return `belly-monster-cart:${tableId || 'sin-mesa'}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && window.sessionStorage
}

// Cart state stays local until the diner submits the order to the staff board.
export function useCart(tableId) {
  const items = ref({})
  const key = storageKey(tableId)

  if (canUseStorage()) {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(key) || '{}')
      if (saved && typeof saved === 'object') {
        items.value = saved
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

  const entries = computed(() =>
    // Stable, menu-like order so customer review and staff tickets read predictably.
    Object.values(items.value).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0)),
  )
  const count = computed(() =>
    entries.value.reduce((total, entry) => total + Number(entry.quantity || 0), 0),
  )
  const lineCount = computed(() => entries.value.length)
  const estimatedTotal = computed(() =>
    entries.value.reduce(
      (total, entry) => (entry.hasPrice ? total + entry.price * entry.quantity : total),
      0,
    ),
  )
  const hasUnpriced = computed(() => entries.value.some((entry) => !entry.hasPrice))
  const isEmpty = computed(() => entries.value.length === 0)

  function snapshot(item, extra) {
    return {
      id: item.id,
      name: item.name,
      sourceName: item.sourceName || item.name,
      categoryName: item.categoryName || '',
      price: item.price,
      hasPrice: item.hasPrice,
      image: item.image || '',
      note: '',
      quantity: 1,
      addedAt: Object.keys(items.value).length,
      ...extra,
    }
  }

  function add(item, { quantity = 1, note } = {}) {
    const current = items.value[item.id]
    if (current) {
      items.value = {
        ...items.value,
        [item.id]: {
          ...current,
          quantity: current.quantity + quantity,
          note: note === undefined ? current.note : note,
        },
      }
      return
    }
    items.value = {
      ...items.value,
      [item.id]: snapshot(item, { quantity: Math.max(1, quantity), note: note || '' }),
    }
  }

  function increment(itemId) {
    const current = items.value[itemId]
    if (!current) {
      return
    }
    items.value = {
      ...items.value,
      [itemId]: { ...current, quantity: current.quantity + 1 },
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

  function setQuantity(itemId, quantity) {
    const current = items.value[itemId]
    if (!current) {
      return
    }
    if (quantity <= 0) {
      remove(itemId)
      return
    }
    items.value = {
      ...items.value,
      [itemId]: { ...current, quantity },
    }
  }

  function setNote(itemId, note) {
    const current = items.value[itemId]
    if (!current) {
      return
    }
    items.value = {
      ...items.value,
      [itemId]: { ...current, note },
    }
  }

  function remove(itemId) {
    const next = { ...items.value }
    delete next[itemId]
    items.value = next
  }

  function clear() {
    items.value = {}
  }

  function quantityFor(itemId) {
    return items.value[itemId]?.quantity || 0
  }

  function noteFor(itemId) {
    return items.value[itemId]?.note || ''
  }

  return {
    items,
    entries,
    count,
    lineCount,
    estimatedTotal,
    hasUnpriced,
    isEmpty,
    add,
    increment,
    decrement,
    setQuantity,
    setNote,
    remove,
    clear,
    quantityFor,
    noteFor,
  }
}
