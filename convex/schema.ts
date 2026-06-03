import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orderStatus = v.union(
  v.literal("new"),
  v.literal("capturing"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("served"),
  v.literal("cancelled"),
);

export const fulfillmentType = v.union(v.literal("table"), v.literal("counter"));
export const pickupStatus = v.union(v.literal("pending"), v.literal("ready"));

export default defineSchema({
  orders: defineTable({
    shortCode: v.string(),
    tableId: v.string(),
    status: orderStatus,
    customerNote: v.string(),
    subtotalCents: v.number(),
    hasUnpriced: v.boolean(),
    itemCount: v.number(),
    source: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    closedAt: v.union(v.number(), v.null()),
  })
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    menuItemId: v.string(),
    name: v.string(),
    sourceName: v.string(),
    categoryName: v.string(),
    quantity: v.number(),
    unitPriceCents: v.union(v.number(), v.null()),
    lineTotalCents: v.union(v.number(), v.null()),
    note: v.string(),
    imageUrl: v.string(),
    fulfillmentType: v.optional(fulfillmentType),
    pickupStatus: v.optional(v.union(pickupStatus, v.null())),
    pickupReadyAt: v.optional(v.union(v.number(), v.null())),
    sortIndex: v.number(),
  }).index("by_orderId_and_sortIndex", ["orderId", "sortIndex"]),

  orderEvents: defineTable({
    orderId: v.id("orders"),
    eventType: v.string(),
    actor: v.string(),
    detail: v.any(),
    createdAt: v.number(),
  }).index("by_orderId_and_createdAt", ["orderId", "createdAt"]),
});
