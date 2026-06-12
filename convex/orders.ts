import { v, type Infer } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { orderStatus, pickupStatus } from "./schema";

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
  modifiers: v.optional(
    v.array(
      v.object({
        groupId: v.string(),
        groupName: v.string(),
        optionId: v.string(),
        optionName: v.string(),
        priceDeltaCents: v.number(),
        sortIndex: v.number(),
      }),
    ),
  ),
  note: v.string(),
  imageUrl: v.string(),
  sortIndex: v.number(),
});

type OrderItemInput = Infer<typeof orderItemInput>;

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

function normalizeModifiers(
  modifiers:
    | Array<{
        groupId: string;
        groupName: string;
        optionId: string;
        optionName: string;
        priceDeltaCents: number;
        sortIndex: number;
      }>
    | undefined,
) {
  return (modifiers || [])
    .slice(0, 24)
    .map((modifier, index) => ({
      groupId: cleanText(modifier.groupId, 160),
      groupName: cleanText(modifier.groupName, 120),
      optionId: cleanText(modifier.optionId, 180),
      optionName: cleanText(modifier.optionName, 160),
      priceDeltaCents: Math.max(0, Math.round(modifier.priceDeltaCents) || 0),
      sortIndex: Math.max(0, Math.floor(modifier.sortIndex) || index),
    }))
    .filter((modifier) => modifier.groupName && modifier.optionName)
    .sort((a, b) => a.sortIndex - b.sortIndex);
}

function destinationForItem(item: { fulfillmentType: "table" | "counter" }) {
  return item.fulfillmentType === "counter" ? "counter" : "kitchen";
}

function destinationLabel(destination: "kitchen" | "counter") {
  return destination === "counter" ? "BARRA / PICKUP" : "COCINA / MESA";
}

function normalizeItem(item: {
  menuItemId: string;
  name: string;
  sourceName: string;
  categoryName: string;
  quantity: number;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
  modifiers?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceDeltaCents: number;
    sortIndex: number;
  }>;
  note: string;
  imageUrl: string;
  sortIndex: number;
}) {
  const quantity = Math.max(1, Math.min(99, Math.floor(item.quantity) || 1));
  const unitPriceCents = item.unitPriceCents == null ? null : Math.max(0, Math.round(item.unitPriceCents));
  const fulfillmentType = fulfillmentForItem(item);
  const modifiers = normalizeModifiers(item.modifiers);

  return {
    menuItemId: cleanText(item.menuItemId, 160),
    name: cleanText(item.name, 160),
    sourceName: cleanText(item.sourceName, 180),
    categoryName: cleanText(item.categoryName, 120),
    quantity,
    unitPriceCents,
    lineTotalCents: unitPriceCents == null ? null : unitPriceCents * quantity,
    modifiers,
    note: cleanText(item.note, 240),
    imageUrl: cleanText(item.imageUrl, 600),
    fulfillmentType,
    pickupStatus: fulfillmentType === "counter" ? "pending" : null,
    pickupReadyAt: null,
    sortIndex: Math.max(0, Math.floor(item.sortIndex) || 0),
  };
}

type NormalizedOrderItem = ReturnType<typeof normalizeItem>;

async function createPrintJobsForOrder(
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    shortCode: string;
    tableId: string;
    customerName: string;
    items: Array<{ id: Id<"orderItems">; item: NormalizedOrderItem }>;
    createdAt: number;
  },
) {
  const groups: Record<"kitchen" | "counter", Array<{ id: Id<"orderItems">; item: NormalizedOrderItem }>> = {
    kitchen: [],
    counter: [],
  };

  for (const item of args.items) {
    groups[destinationForItem(item.item)].push(item);
  }

  const printJobIds: Id<"printJobs">[] = [];

  for (const destination of ["kitchen", "counter"] as const) {
    const items = groups[destination];
    if (items.length === 0) {
      continue;
    }

    const printJobId = await ctx.db.insert("printJobs", {
      orderId: args.orderId,
      shortCode: args.shortCode,
      tableId: args.tableId,
      customerName: args.customerName,
      destination,
      destinationLabel: destinationLabel(destination),
      status: "pending",
      attemptCount: 0,
      lockedBy: null,
      lockedAt: null,
      claimToken: null,
      printedBy: null,
      printedAt: null,
      failedAt: null,
      lastError: null,
      createdAt: args.createdAt,
      updatedAt: args.createdAt,
    });
    printJobIds.push(printJobId);

    for (const { id, item } of items) {
      await ctx.db.insert("printJobItems", {
        printJobId,
        orderId: args.orderId,
        orderItemId: id,
        name: item.name,
        quantity: item.quantity,
        modifiers: item.modifiers,
        note: item.note,
        fulfillmentType: item.fulfillmentType,
        sortIndex: item.sortIndex,
      });
    }
  }

  return printJobIds;
}

async function presentOrder(
  ctx: QueryCtx | MutationCtx,
  order: Doc<"orders">,
  options?: {
    /**
     * The phone number is PII. `list` and `get` are public, unauthenticated
     * queries, so they must never expose it; only owner-facing results (the
     * identity-gated `mine` query and the creator's own mutation return)
     * opt in. Staff surfaces get the phone back once they have an
     * authenticated path into Convex.
     */
    includePhone?: boolean;
  },
) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId_and_sortIndex", (q) => q.eq("orderId", order._id))
    .order("asc")
    .take(100);

  return {
    id: order._id,
    shortCode: order.shortCode,
    tableId: order.tableId ?? "",
    orderType: order.orderType ?? "table",
    customerName: order.customerName || "",
    customerPhone: options?.includePhone ? order.customerPhone ?? "" : "",
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
        modifiers: item.modifiers || [],
        note: item.note,
        imageUrl: item.imageUrl,
        fulfillmentType,
        pickupStatus: item.pickupStatus || (fulfillmentType === "counter" ? "pending" : null),
        pickupReadyAt: item.pickupReadyAt || null,
      };
    }),
  };
}

async function createOrderWithItems(
  ctx: MutationCtx,
  params: {
    orderType: "table" | "pickup";
    tableId?: string;
    /** Label used where the printed ticket shows the table. */
    printTableLabel: string;
    customerName: string;
    customerNote: string;
    customerUserId?: string;
    customerPhone?: string;
    source: string;
    items: OrderItemInput[];
  },
) {
  const items = params.items.slice(0, 100).map(normalizeItem);
  const now = Date.now();
  const subtotalCents = items.reduce((total, item) => total + (item.lineTotalCents || 0), 0);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const hasUnpriced = items.some((item) => item.unitPriceCents == null);

  const orderId = await ctx.db.insert("orders", {
    shortCode: "",
    tableId: params.tableId,
    orderType: params.orderType,
    customerName: params.customerName,
    customerUserId: params.customerUserId,
    customerPhone: params.customerPhone,
    status: "new",
    customerNote: params.customerNote,
    subtotalCents,
    hasUnpriced,
    itemCount,
    source: params.source,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  });

  await ctx.db.patch(orderId, { shortCode: makeShortCode(orderId) });

  const storedItems: Array<{ id: Id<"orderItems">; item: NormalizedOrderItem }> = [];
  for (const item of items) {
    const orderItemId = await ctx.db.insert("orderItems", {
      orderId,
      ...item,
    });
    storedItems.push({ id: orderItemId, item });
  }

  const order = await ctx.db.get(orderId);
  if (!order) {
    throw new Error("No se pudo crear el pedido.");
  }

  const shortCode = makeShortCode(orderId);
  const printJobIds = await createPrintJobsForOrder(ctx, {
    orderId,
    shortCode,
    tableId: params.printTableLabel,
    customerName: params.customerName,
    items: storedItems,
    createdAt: now,
  });

  await ctx.db.insert("orderEvents", {
    orderId,
    eventType: "created",
    actor: "customer",
    detail: {
      tableId: params.tableId ?? null,
      orderType: params.orderType,
      customerName: params.customerName,
      itemCount,
      printJobIds,
    },
    createdAt: now,
  });

  // The creator supplied the contact data, so returning the phone to them
  // is safe. Public queries (`list`/`get`) redact it.
  return await presentOrder(ctx, order, { includePhone: true });
}

export const create = mutation({
  args: {
    tableId: v.string(),
    customerName: v.string(),
    customerNote: v.optional(v.string()),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const tableId = cleanText(args.tableId, 32);
    const customerName = cleanText(args.customerName, 80);
    if (!tableId) {
      throw new Error("Falta el numero de mesa.");
    }
    if (!customerName) {
      throw new Error("Agrega tu nombre para identificar el pedido.");
    }
    if (args.items.length === 0) {
      throw new Error("Agrega al menos un producto.");
    }

    return await createOrderWithItems(ctx, {
      orderType: "table",
      tableId,
      // The printer agent prints this label verbatim (no "MESA " prefix of
      // its own), so table orders bake it in and pickups stay "Pick&Go".
      printTableLabel: `Mesa ${tableId}`,
      customerName,
      customerNote: cleanText(args.customerNote || "", 300),
      source: "qr-table",
      items: args.items,
    });
  },
});

export const createPickup = mutation({
  args: {
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Inicia sesión para ordenar");
    }
    if (args.items.length === 0) {
      throw new Error("Agrega al menos un producto.");
    }

    // Identity (who the order belongs to) always comes from the verified JWT.
    // Name/phone are contact data: client-supplied values are acceptable, with
    // the token claims as fallback.
    const identityName =
      (typeof identity.name === "string" && identity.name) ||
      (typeof identity.givenName === "string" && identity.givenName) ||
      "Cliente";
    const customerName = cleanText(args.customerName || "", 80) || cleanText(identityName, 80) || "Cliente";
    const identityPhone = typeof identity.phoneNumber === "string" ? identity.phoneNumber : "";
    const customerPhone = cleanText(args.customerPhone || identityPhone, 32) || undefined;

    const created = await createOrderWithItems(ctx, {
      orderType: "pickup",
      printTableLabel: "Pick&Go",
      customerName,
      customerNote: "",
      customerUserId: identity.tokenIdentifier,
      customerPhone,
      source: "pickup-web",
      items: args.items,
    });

    // Confirmation WhatsApp on creation (no-ops without Twilio env / phone).
    await ctx.scheduler.runAfter(0, internal.notifications.sendOrderReady, {
      orderId: created.orderId,
      kind: "created",
    });

    return created;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerUserId_and_createdAt", (q) =>
        q.eq("customerUserId", identity.tokenIdentifier),
      )
      .order("desc")
      .take(10);

    // Identity-gated: the caller only ever sees their own orders, so the
    // phone they registered can be echoed back.
    return await Promise.all(
      orders.map((order) => presentOrder(ctx, order, { includePhone: true })),
    );
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

    // Pickup orders: tell the customer their order is ready. The action
    // no-ops without Twilio env vars and skips non-pickup/phone-less orders.
    if (args.status === "ready") {
      await ctx.scheduler.runAfter(0, internal.notifications.sendOrderReady, {
        orderId: args.orderId,
        kind: "ready",
      });
    }

    if (args.status === "cancelled") {
      const printJobs = await ctx.db
        .query("printJobs")
        .withIndex("by_orderId_and_createdAt", (q) => q.eq("orderId", args.orderId))
        .collect();
      const cancellableStatuses = new Set<string>(["pending", "printing", "failed"]);

      for (const job of printJobs) {
        if (!cancellableStatuses.has(job.status)) {
          continue;
        }
        await ctx.db.patch(job._id, {
          status: "cancelled",
          lockedBy: null,
          lockedAt: null,
          claimToken: null,
          failedAt: null,
          lastError: null,
          updatedAt: now,
        });
        await ctx.db.insert("orderEvents", {
          orderId: args.orderId,
          eventType: "print_cancelled",
          actor: "staff",
          detail: { printJobId: job._id, destination: job.destination, source: "order_cancelled" },
          createdAt: now,
        });
      }
    }

    const updated = await ctx.db.get(args.orderId);
    if (!updated) {
      throw new Error("Pedido no encontrado.");
    }
    return await presentOrder(ctx, updated);
  },
});

export const updatePickupStatus = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    status: pickupStatus,
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.orderItemId);
    if (!item) {
      throw new Error("Artículo no encontrado.");
    }

    const fulfillmentType = item.fulfillmentType || fulfillmentForItem(item);
    if (fulfillmentType !== "counter") {
      throw new Error("Solo los artículos de barra se pueden marcar para recoger.");
    }

    const now = Date.now();
    await ctx.db.patch(args.orderItemId, {
      pickupStatus: args.status,
      pickupReadyAt: args.status === "ready" ? now : null,
    });
    await ctx.db.insert("orderEvents", {
      orderId: item.orderId,
      eventType: "pickup_status_changed",
      actor: "staff",
      detail: {
        orderItemId: args.orderItemId,
        itemName: item.name,
        status: args.status,
        source: "staff-dashboard",
      },
      createdAt: now,
    });

    const order = await ctx.db.get(item.orderId);
    if (!order) {
      throw new Error("Pedido no encontrado.");
    }
    return await presentOrder(ctx, order);
  },
});
