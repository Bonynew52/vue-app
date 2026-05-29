import { randomBytes } from 'node:crypto'
import { normalizeOrderItems } from '../_lib/menu-catalog.js'
import { methodNotAllowed, json, readJson } from '../_lib/http.js'
import { presentOrders } from '../_lib/order-presenter.js'
import { query, withTransaction } from '../_lib/db.js'
import { requireStaffSession } from '../_lib/auth-session.js'

function makeShortCode() {
  return randomBytes(3).toString('hex').toUpperCase()
}

async function createOrder(req, res) {
  const body = await readJson(req)
  const tableId = String(body.tableId || '').trim().slice(0, 32)

  if (!tableId) {
    return json(res, 400, { message: 'Falta el numero de mesa.' })
  }

  const items = normalizeOrderItems(body.items)
  const customerNote = String(body.customerNote || '').trim().slice(0, 300)
  const subtotalCents = items.reduce((total, item) => total + (item.lineTotalCents || 0), 0)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  const hasUnpriced = items.some((item) => item.unitPriceCents == null)

  const order = await withTransaction(async (client) => {
    let insertedOrder

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const result = await client.query(
          `
            insert into orders (
              short_code,
              table_id,
              customer_note,
              subtotal_cents,
              has_unpriced,
              item_count
            )
            values ($1, $2, $3, $4, $5, $6)
            returning *
          `,
          [makeShortCode(), tableId, customerNote, subtotalCents, hasUnpriced, itemCount],
        )
        insertedOrder = result.rows[0]
        break
      } catch (error) {
        if (error.code !== '23505' || attempt === 3) {
          throw error
        }
      }
    }

    for (const item of items) {
      await client.query(
        `
          insert into order_items (
            order_id,
            menu_item_id,
            name,
            source_name,
            category_name,
            quantity,
            unit_price_cents,
            line_total_cents,
            note,
            image_url,
            sort_index
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          insertedOrder.id,
          item.id,
          item.name,
          item.sourceName,
          item.categoryName,
          item.quantity,
          item.unitPriceCents,
          item.lineTotalCents,
          item.note,
          item.image,
          item.sortIndex,
        ],
      )
    }

    await client.query(
      `
        insert into order_events (order_id, event_type, actor, detail)
        values ($1, 'created', 'customer', $2::jsonb)
      `,
      [insertedOrder.id, JSON.stringify({ tableId, itemCount })],
    )

    return insertedOrder
  })

  return json(res, 201, {
    message: 'Pedido enviado.',
    data: {
      id: order.id,
      shortCode: order.short_code,
      tableId: order.table_id,
      status: order.status,
      subtotalCents: order.subtotal_cents,
      hasUnpriced: order.has_unpriced,
      itemCount: order.item_count,
      createdAt: order.created_at,
    },
  })
}

async function listOrders(req, res) {
  await requireStaffSession(req)

  const url = new URL(req.url || '/api/orders', 'http://localhost')
  const mode = url.searchParams.get('status') || 'active'
  const statuses =
    mode === 'all'
      ? ['new', 'capturing', 'preparing', 'ready', 'served', 'cancelled']
      : ['new', 'capturing', 'preparing', 'ready']

  const result = await query(
    `
      select
        orders.id as order_id,
        orders.short_code,
        orders.table_id,
        orders.status,
        orders.customer_note,
        orders.subtotal_cents,
        orders.has_unpriced,
        orders.item_count,
        orders.source,
        orders.created_at,
        orders.updated_at,
        orders.closed_at,
        order_items.id as item_id,
        order_items.menu_item_id,
        order_items.name as item_name,
        order_items.source_name,
        order_items.category_name,
        order_items.quantity,
        order_items.unit_price_cents,
        order_items.line_total_cents,
        order_items.note,
        order_items.image_url
      from orders
      left join order_items on order_items.order_id = orders.id
      where orders.status = any($1::text[])
      order by orders.created_at desc, order_items.sort_index asc
      limit 200
    `,
    [statuses],
  )

  return json(res, 200, { data: presentOrders(result.rows) })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      return await createOrder(req, res)
    }

    if (req.method === 'GET') {
      return await listOrders(req, res)
    }

    return methodNotAllowed(res, ['GET', 'POST'])
  } catch (error) {
    return json(res, error.statusCode || 500, {
      message: error.statusCode ? error.message : 'No se pudo procesar la orden.',
    })
  }
}
