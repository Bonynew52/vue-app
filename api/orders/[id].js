import { methodNotAllowed, json, readJson } from '../_lib/http.js'
import { presentOrders } from '../_lib/order-presenter.js'
import { query, withTransaction } from '../_lib/db.js'
import { requireStaffSession } from '../_lib/auth-session.js'

const ALLOWED_STATUSES = new Set([
  'new',
  'capturing',
  'preparing',
  'ready',
  'served',
  'cancelled',
])

async function getOrder(req, res, id) {
  await requireStaffSession(req)
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
      where orders.id = $1
      order by order_items.sort_index asc
    `,
    [id],
  )

  const [order] = presentOrders(result.rows)
  if (!order) {
    return json(res, 404, { message: 'Pedido no encontrado.' })
  }

  return json(res, 200, { data: order })
}

async function updateOrder(req, res, id) {
  const session = await requireStaffSession(req)
  const body = await readJson(req)
  const status = String(body.status || '').trim()

  if (!ALLOWED_STATUSES.has(status)) {
    return json(res, 400, { message: 'Estado invalido.' })
  }

  const order = await withTransaction(async (client) => {
    const result = await client.query(
      `
        update orders
        set
          status = $2,
          closed_at = case when $2 in ('served', 'cancelled') then now() else null end
        where id = $1
        returning *
      `,
      [id, status],
    )

    if (!result.rows[0]) {
      return null
    }

    await client.query(
      `
        insert into order_events (order_id, event_type, actor, detail)
        values ($1, 'status_changed', $2, $3::jsonb)
      `,
      [
        id,
        session.user.email || 'staff',
        JSON.stringify({
          status,
          source: 'staff-dashboard',
        }),
      ],
    )

    return result.rows[0]
  })

  if (!order) {
    return json(res, 404, { message: 'Pedido no encontrado.' })
  }

  return getOrder(req, res, id)
}

export default async function handler(req, res) {
  const rawId = req.query?.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId

  try {
    if (req.method === 'GET') {
      return await getOrder(req, res, id)
    }

    if (req.method === 'PATCH') {
      return await updateOrder(req, res, id)
    }

    return methodNotAllowed(res, ['GET', 'PATCH'])
  } catch (error) {
    return json(res, error.statusCode || 500, {
      message: error.statusCode ? error.message : 'No se pudo actualizar el pedido.',
    })
  }
}
