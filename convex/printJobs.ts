import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { printJobStatus } from "./schema";

function cleanText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

async function readPrintJobItems(ctx: QueryCtx | MutationCtx, printJobId: Id<"printJobs">) {
  return await ctx.db
    .query("printJobItems")
    .withIndex("by_printJobId_and_sortIndex", (q) => q.eq("printJobId", printJobId))
    .order("asc")
    .take(100);
}

function presentPrintJob(job: Doc<"printJobs">, items: Doc<"printJobItems">[]) {
  return {
    id: job._id,
    orderId: job.orderId,
    shortCode: job.shortCode,
    tableId: job.tableId,
    destination: job.destination,
    destinationLabel: job.destinationLabel,
    status: job.status,
    attemptCount: job.attemptCount,
    lockedBy: job.lockedBy,
    lockedAt: job.lockedAt,
    printedAt: job.printedAt,
    failedAt: job.failedAt,
    lastError: job.lastError,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    items: items.map((item) => ({
      id: item._id,
      orderItemId: item.orderItemId,
      name: item.name,
      quantity: item.quantity,
      note: item.note,
      fulfillmentType: item.fulfillmentType,
      sortIndex: item.sortIndex,
    })),
  };
}

export const list = query({
  args: {
    status: v.union(v.literal("active"), v.literal("all"), printJobStatus),
  },
  handler: async (ctx, args) => {
    const activeStatuses = ["pending", "printing", "failed"] as const;
    const jobs =
      args.status === "all"
        ? await ctx.db.query("printJobs").withIndex("by_status_and_createdAt").order("desc").take(200)
        : args.status === "active"
          ? (
              await Promise.all(
                activeStatuses.map((status) =>
                  ctx.db
                    .query("printJobs")
                    .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
                    .order("asc")
                    .take(80),
                ),
              )
            )
              .flat()
              .sort((a, b) => a.createdAt - b.createdAt)
              .slice(0, 200)
          : await ctx.db
              .query("printJobs")
              .withIndex("by_status_and_createdAt", (q) => q.eq("status", args.status))
              .order("asc")
              .take(200);

    return await Promise.all(jobs.map(async (job) => presentPrintJob(job, await readPrintJobItems(ctx, job._id))));
  },
});

export const claimNext = internalMutation({
  args: {
    deviceId: v.string(),
    claimToken: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const deviceId = cleanText(args.deviceId, 120);
    if (!deviceId) {
      throw new Error("Missing printer device id.");
    }

    const pending = await ctx.db
      .query("printJobs")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(1);
    const job = pending[0];
    if (!job) {
      return null;
    }

    await ctx.db.patch(job._id, {
      status: "printing",
      attemptCount: job.attemptCount + 1,
      lockedBy: deviceId,
      lockedAt: args.now,
      claimToken: cleanText(args.claimToken, 120),
      lastError: null,
      updatedAt: args.now,
    });
    await ctx.db.insert("orderEvents", {
      orderId: job.orderId,
      eventType: "print_claimed",
      actor: "printer-agent",
      detail: {
        printJobId: job._id,
        destination: job.destination,
        deviceId,
        attemptCount: job.attemptCount + 1,
      },
      createdAt: args.now,
    });

    const updated = await ctx.db.get(job._id);
    if (!updated) {
      throw new Error("Print job disappeared after claim.");
    }
    return presentPrintJob(updated, await readPrintJobItems(ctx, updated._id));
  },
});

export const complete = internalMutation({
  args: {
    printJobId: v.id("printJobs"),
    deviceId: v.string(),
    claimToken: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.printJobId);
    if (!job) {
      return { ok: false, reason: "not_found" };
    }
    const deviceId = cleanText(args.deviceId, 120);
    const claimToken = cleanText(args.claimToken, 120);

    if (job.lockedBy !== deviceId || job.claimToken !== claimToken || job.status !== "printing") {
      return { ok: false, reason: "claim_mismatch", jobStatus: job.status };
    }

    const patch = args.success
      ? {
          status: "printed" as const,
          printedBy: deviceId,
          printedAt: args.now,
          failedAt: null,
          lastError: null,
          updatedAt: args.now,
        }
      : {
          status: "failed" as const,
          printedBy: null,
          printedAt: null,
          failedAt: args.now,
          lastError: cleanText(args.errorMessage || "Unknown print failure", 500),
          updatedAt: args.now,
        };

    await ctx.db.patch(args.printJobId, patch);
    await ctx.db.insert("orderEvents", {
      orderId: job.orderId,
      eventType: args.success ? "print_completed" : "print_failed",
      actor: "printer-agent",
      detail: {
        printJobId: job._id,
        destination: job.destination,
        deviceId,
        errorMessage: args.success ? null : patch.lastError,
      },
      createdAt: args.now,
    });

    const updated = await ctx.db.get(args.printJobId);
    if (!updated) {
      return { ok: false, reason: "not_found_after_complete" };
    }
    return { ok: true, job: presentPrintJob(updated, await readPrintJobItems(ctx, updated._id)) };
  },
});
