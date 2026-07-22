import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

export async function requireStaff(ctx: QueryCtx | MutationCtx) {
  return await authComponent.getAuthUser(ctx);
}
