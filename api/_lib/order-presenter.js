export function presentOrders(rows) {
  const orders = new Map()

  for (const row of rows) {
    if (!orders.has(row.order_id)) {
      orders.set(row.order_id, {
        id: row.order_id,
        shortCode: row.short_code,
        tableId: row.table_id,
        status: row.status,
        customerNote: row.customer_note,
        subtotalCents: row.subtotal_cents,
        hasUnpriced: row.has_unpriced,
        itemCount: row.item_count,
        source: row.source,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        closedAt: row.closed_at,
        items: [],
      })
    }

    if (row.item_id) {
      orders.get(row.order_id).items.push({
        id: row.item_id,
        menuItemId: row.menu_item_id,
        name: row.item_name,
        sourceName: row.source_name,
        categoryName: row.category_name,
        quantity: row.quantity,
        unitPriceCents: row.unit_price_cents,
        lineTotalCents: row.line_total_cents,
        note: row.note,
        imageUrl: row.image_url,
      })
    }
  }

  return Array.from(orders.values())
}
