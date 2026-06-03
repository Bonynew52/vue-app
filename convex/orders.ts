import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { orderStatus } from "./schema";

const activeStatuses = ["new", "capturing", "preparing", "ready"] as const;
const allStatuses = [...activeStatuses, "served", "cancelled"] as const;

const orderItemInput = v.object({
  menuItemId: v.string(),
  name: v.string(),
  sourceName: v.string(),
  categoryName: v.string(),
  quantity: v.number(),
  unitPriceCents: v.union(v.number(), v.null()),
  lineTotalCents: v.union(v.number(), v.null()),
  note: v.string(),
  imageUrl: v.string(),
  sortIndex: v.number(),
});

function makeShortCode(orderId: Id<"orders">) {
  return orderId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
}

function cleanText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function plainText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fulfillmentForItem(item: { name: string; categoryName: string }) {
  const category = plainText(item.categoryName);
  const name = plainText(item.name);
  const counterCategory =
    category.includes("cofy") ||
    category.includes("chiller") ||
    category.includes("bebida") ||
    category.includes("te helado") ||
    category.includes("te caliente") ||
    category.includes("reposteria") ||
    category.includes("frappe");
  const counterName =
    name.includes("frappe") ||
    name.includes("latte") ||
    name.includes("americano") ||
    name.includes("capuchino") ||
    name.includes("espresso") ||
    name.includes("limonada") ||
    name.includes("agua ") ||
    name.includes("te helado") ||
    name.includes("te caliente") ||
    name.includes("rol de ");

  return counterCategory || counterName ? "counter" : "table";
}

function normalizeItem(item: {
  menuItemId: string;
  name: string;
  sourceName: string;
  categoryName: string;
  quantity: number;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
  note: string;
  imageUrl: string;
  sortIndex: number;
}) {
  const quantity = Math.max(1, Math.min(99, Math.floor(item.quantity) || 1));
  const unitPriceCents = item.unitPriceCents == null ? null : Math.max(0, Math.round(item.unitPriceCents));
  const fulfillmentType = fulfillmentForItem(item);

  return {
    menuItemId: cleanText(item.menuItemId, 160),
    name: cleanText(item.name, 160),
    sourceName: cleanText(item.sourceName, 180),
    categoryName: cleanText(item.categoryName, 120),
    quantity,
    unitPriceCents,
    lineTotalCents: unitPriceCents == null ? null : unitPriceCents * quantity,
    note: cleanText(item.note, 240),
    imageUrl: cleanText(item.imageUrl, 600),
    fulfillmentType,
    pickupStatus: fulfillmentType === "counter" ? "pending" : null,
    pickupReadyAt: null,
    sortIndex: Math.max(0, Math.floor(item.sortIndex) || 0),
  };
}

async function presentOrder(ctx: QueryCtx | MutationCtx, order: Doc<"orders">) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId_and_sortIndex", (q) => q.eq("orderId", order._id))
    .order("asc")
    .take(100);

  return {
    id: order._id,
    shortCode: order.shortCode,
    tableId: order.tableId,
    status: order.status,
    customerNote: order.customerNote,
    subtotalCents: order.subtotalCents,
    hasUnpriced: order.hasUnpriced,
    itemCount: order.itemCount,
    source: order.source,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    closedAt: order.closedAt,
    items: items.map((item: Doc<"orderItems">) => {
      const fulfillmentType = item.fulfillmentType || fulfillmentForItem(item);

      return {
        id: item._id,
        menuItemId: item.menuItemId,
        name: item.name,
        sourceName: item.sourceName,
        categoryName: item.categoryName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
        note: item.note,
        imageUrl: item.imageUrl,
        fulfillmentType,
        pickupStatus: item.pickupStatus || (fulfillmentType === "counter" ? "pending" : null),
        pickupReadyAt: item.pickupReadyAt || null,
      };
    }),
  };
}

export const create = mutation({
  args: {
    tableId: v.string(),
    customerNote: v.optional(v.string()),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const tableId = cleanText(args.tableId, 32);
    if (!tableId) {
      throw new Error("Falta el numero de mesa.");
    }
    if (args.items.length === 0) {
      throw new Error("Agrega al menos un producto.");
    }

    const items = args.items.slice(0, 100).map(normalizeItem);
    const now = Date.now();
    const subtotalCents = items.reduce((total, item) => total + (item.lineTotalCents || 0), 0);
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const hasUnpriced = items.some((item) => item.unitPriceCents == null);

    const orderId = await ctx.db.insert("orders", {
      shortCode: "",
      tableId,
      status: "new",
      customerNote: cleanText(args.customerNote || "", 300),
      subtotalCents,
      hasUnpriced,
      itemCount,
      source: "qr-table",
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    });

    await ctx.db.patch(orderId, { shortCode: makeShortCode(orderId) });

    for (const item of items) {
      await ctx.db.insert("orderItems", {
        orderId,
        ...item,
      });
    }

    await ctx.db.insert("orderEvents", {
      orderId,
      eventType: "created",
      actor: "customer",
      detail: { tableId, itemCount },
      createdAt: now,
    });

    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("No se pudo crear el pedido.");
    }
    return await presentOrder(ctx, order);
  },
});

export const list = query({
  args: {
    status: v.union(v.literal("active"), v.literal("all")),
  },
  handler: async (ctx, args) => {
    const orders =
      args.status === "all"
        ? await ctx.db.query("orders").withIndex("by_createdAt").order("desc").take(200)
        : (
            await Promise.all(
              activeStatuses.map((status) =>
                ctx.db
                  .query("orders")
                  .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
                  .order("desc")
                  .take(60),
              ),
            )
          )
            .flat()
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 200);

    return await Promise.all(orders.map((order) => presentOrder(ctx, order)));
  },
});

export const get = query({
  args: {
    orderId: v.union(v.id("orders"), v.null()),
  },
  handler: async (ctx, args) => {
    if (args.orderId == null) {
      return null;
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }
    return await presentOrder(ctx, order);
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatus,
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Pedido no encontrado.");
    }
    if (!allStatuses.includes(args.status)) {
      throw new Error("Estado invalido.");
    }

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: now,
      closedAt: args.status === "served" || args.status === "cancelled" ? now : null,
    });
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      eventType: "status_changed",
      actor: "staff",
      detail: { status: args.status, source: "staff-dashboard" },
      createdAt: now,
    });

    const updated = await ctx.db.get(args.orderId);
    if (!updated) {
      throw new Error("Pedido no encontrado.");
    }
    return await presentOrder(ctx, updated);
  },
});
