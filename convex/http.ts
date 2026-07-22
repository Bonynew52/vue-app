import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { authComponent, createAuth, trustedOrigins } from "./auth";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  basePath: "/api/auth",
  cors: true,
  trustedOrigins: trustedOrigins(),
});

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers || {}),
    },
  });
}

async function parseJson(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function authorized(req: Request) {
  const expected = process.env.PRINTER_AGENT_TOKEN;
  if (!expected) {
    return false;
  }

  const authorization = req.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const headerToken = req.headers.get("x-printer-agent-token") || "";
  return bearer === expected || headerToken === expected;
}

function textArg(body: Record<string, unknown>, key: string, maxLength = 200) {
  const value = body[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

http.route({
  path: "/printer/claim-next",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!authorized(req)) {
      return json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await parseJson(req);
    const deviceId = textArg(body, "deviceId", 120);
    if (!deviceId) {
      return json({ error: "deviceId_required" }, { status: 400 });
    }

    const claimToken = crypto.randomUUID();
    const job = await ctx.runMutation(internal.printJobs.claimNext, {
      deviceId,
      claimToken,
      now: Date.now(),
    });

    return json({ job, claimToken: job ? claimToken : null });
  }),
});

http.route({
  path: "/printer/complete",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!authorized(req)) {
      return json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await parseJson(req);
    const printJobId = textArg(body, "printJobId", 120);
    const deviceId = textArg(body, "deviceId", 120);
    const claimToken = textArg(body, "claimToken", 120);
    const success = body.success === true;
    const errorMessage = textArg(body, "errorMessage", 500);

    if (!printJobId || !deviceId || !claimToken) {
      return json({ error: "printJobId_deviceId_claimToken_required" }, { status: 400 });
    }

    const result = await ctx.runMutation(internal.printJobs.complete, {
      printJobId: printJobId as Id<"printJobs">,
      deviceId,
      claimToken,
      success,
      errorMessage,
      now: Date.now(),
    });

    return json(result, { status: result.ok ? 200 : 409 });
  }),
});

http.route({
  path: "/printer/heartbeat",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    if (!authorized(req)) {
      return json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await parseJson(req);
    return json({
      ok: true,
      deviceId: textArg(body, "deviceId", 120),
      now: Date.now(),
    });
  }),
});

export default http;
