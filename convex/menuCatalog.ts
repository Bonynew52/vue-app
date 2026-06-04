import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ACTIVE_KEY = "active";

function assertImportAuthorized(importToken: string) {
  const expected = process.env.MENU_IMPORT_TOKEN;
  if (!expected || importToken !== expected) {
    throw new Error("Invalid menu import token.");
  }
}

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const snapshot = await ctx.db
      .query("menuCatalogSnapshots")
      .withIndex("by_key", (q) => q.eq("key", ACTIVE_KEY))
      .unique();

    return snapshot?.catalog ?? null;
  },
});

export const replaceActive = mutation({
  args: {
    importToken: v.string(),
    catalog: v.any(),
  },
  handler: async (ctx, args) => {
    assertImportAuthorized(args.importToken);

    const now = Date.now();
    const existing = await ctx.db
      .query("menuCatalogSnapshots")
      .withIndex("by_key", (q) => q.eq("key", ACTIVE_KEY))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        catalog: args.catalog,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("menuCatalogSnapshots", {
        key: ACTIVE_KEY,
        catalog: args.catalog,
        updatedAt: now,
      });
    }

    return {
      ok: true,
      updatedAt: now,
      itemCount: args.catalog?.stats?.itemCount ?? null,
      imageMatchedCount: args.catalog?.stats?.imageMatchedCount ?? null,
      imageMissingCount: args.catalog?.stats?.imageMissingCount ?? null,
    };
  },
});
