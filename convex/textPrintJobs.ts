import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

function cleanText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanBody(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, 1200);
}

function requestPassword() {
  return process.env.DM_REQUEST_PASSWORD || "";
}

function assertPassword(password: string) {
  const expected = requestPassword();
  if (!expected || password.trim() !== expected) {
    throw new Error("Contrasena incorrecta.");
  }
}

function codeFromId(id: string) {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
}

export const create = mutation({
  args: {
    password: v.string(),
    name: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    assertPassword(args.password);

    const label = cleanText(args.name, 80);
    const text = cleanBody(args.text);
    if (!label || !text) {
      throw new Error("Agrega nombre y texto antes de enviar.");
    }

    const now = Date.now();
    const id = await ctx.db.insert("textPrintJobs", {
      code: "DM",
      label,
      text,
      status: "pending",
      attemptCount: 0,
      lockedBy: null,
      lockedAt: null,
      claimToken: null,
      printedBy: null,
      printedAt: null,
      failedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    });

    const code = codeFromId(id);
    await ctx.db.patch(id, { code, updatedAt: now });
    return { ok: true, id, code };
  },
});

export const listRecent = query({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    assertPassword(args.password);

    return await ctx.db
      .query("textPrintJobs")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(20);
  },
});

export const claimNext = internalMutation({
  args: {
    deviceId: v.string(),
    claimToken: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("textPrintJobs")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "pending"))
      .order("asc")
      .first();

    if (!job) {
      return null;
    }

    await ctx.db.patch(job._id, {
      status: "printing",
      attemptCount: job.attemptCount + 1,
      lockedBy: args.deviceId,
      lockedAt: args.now,
      claimToken: args.claimToken,
      updatedAt: args.now,
    });

    return {
      id: job._id,
      code: job.code,
      label: job.label,
      text: job.text,
    };
  },
});

export const complete = internalMutation({
  args: {
    textPrintJobId: v.id("textPrintJobs"),
    deviceId: v.string(),
    claimToken: v.string(),
    success: v.boolean(),
    errorMessage: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.textPrintJobId);
    if (!job || job.lockedBy !== args.deviceId || job.claimToken !== args.claimToken) {
      return { ok: false, error: "claim_mismatch" };
    }

    await ctx.db.patch(args.textPrintJobId, {
      status: args.success ? "printed" : "failed",
      printedBy: args.success ? args.deviceId : null,
      printedAt: args.success ? args.now : null,
      failedAt: args.success ? null : args.now,
      lastError: args.success ? null : args.errorMessage.slice(0, 500),
      lockedBy: null,
      lockedAt: null,
      claimToken: null,
      updatedAt: args.now,
    });

    return { ok: true };
  },
});
