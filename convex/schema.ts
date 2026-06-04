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
export const printJobStatus = v.union(
  v.literal("pending"),
  v.literal("printing"),
  v.literal("printed"),
  v.literal("failed"),
  v.literal("cancelled"),
);
export const printJobDestination = v.union(v.literal("kitchen"), v.literal("counter"));
const orderItemModifier = v.object({
  groupId: v.string(),
  groupName: v.string(),
  optionId: v.string(),
  optionName: v.string(),
  priceDeltaCents: v.number(),
  sortIndex: v.number(),
});

export default defineSchema({
  orders: defineTable({
    shortCode: v.string(),
    tableId: v.string(),
    customerName: v.optional(v.string()),
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
    modifiers: v.optional(v.array(orderItemModifier)),
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

  printJobs: defineTable({
    orderId: v.id("orders"),
    shortCode: v.string(),
    tableId: v.string(),
    customerName: v.optional(v.string()),
    destination: printJobDestination,
    destinationLabel: v.string(),
    status: printJobStatus,
    attemptCount: v.number(),
    lockedBy: v.union(v.string(), v.null()),
    lockedAt: v.union(v.number(), v.null()),
    claimToken: v.union(v.string(), v.null()),
    printedBy: v.union(v.string(), v.null()),
    printedAt: v.union(v.number(), v.null()),
    failedAt: v.union(v.number(), v.null()),
    lastError: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_status_and_lockedAt", ["status", "lockedAt"])
    .index("by_orderId_and_createdAt", ["orderId", "createdAt"]),

  printJobItems: defineTable({
    printJobId: v.id("printJobs"),
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    name: v.string(),
    quantity: v.number(),
    modifiers: v.optional(v.array(orderItemModifier)),
    note: v.string(),
    fulfillmentType: fulfillmentType,
    sortIndex: v.number(),
  }).index("by_printJobId_and_sortIndex", ["printJobId", "sortIndex"]),

  menuCatalogSnapshots: defineTable({
    key: v.string(),
    catalog: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
