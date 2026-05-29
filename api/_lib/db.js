import pg from 'pg'

const { Pool } = pg

export const pool =
  globalThis.__bellyOrdersPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__bellyOrdersPool = pool
}

let schemaReady = false

export async function query(text, params = []) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  await ensureAppSchema()
  return pool.query(text, params)
}

export async function withTransaction(callback) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  await ensureAppSchema()
  const client = await pool.connect()

  try {
    await client.query('begin')
    const result = await callback(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function ensureAppSchema() {
  if (schemaReady) {
    return
  }

  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists orders (
      id uuid primary key default gen_random_uuid(),
      short_code text not null unique,
      table_id text not null,
      status text not null default 'new',
      customer_note text not null default '',
      subtotal_cents integer not null default 0,
      has_unpriced boolean not null default false,
      item_count integer not null default 0,
      source text not null default 'qr-table',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      closed_at timestamptz
    );

    create table if not exists order_items (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references orders(id) on delete cascade,
      menu_item_id text not null,
      name text not null,
      source_name text not null default '',
      category_name text not null default '',
      quantity integer not null check (quantity > 0),
      unit_price_cents integer,
      line_total_cents integer,
      note text not null default '',
      image_url text not null default '',
      sort_index integer not null default 0
    );

    create table if not exists order_events (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references orders(id) on delete cascade,
      event_type text not null,
      actor text not null default 'system',
      detail jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create index if not exists orders_status_created_idx on orders(status, created_at desc);
    create index if not exists orders_created_idx on orders(created_at desc);
    create index if not exists order_items_order_idx on order_items(order_id, sort_index);
    create index if not exists order_events_order_idx on order_events(order_id, created_at desc);

    create or replace function set_updated_at()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;

    drop trigger if exists orders_set_updated_at on orders;
    create trigger orders_set_updated_at
      before update on orders
      for each row
      execute function set_updated_at();
  `)

  schemaReady = true
}
