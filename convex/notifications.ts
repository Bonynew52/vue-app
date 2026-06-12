import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// WhatsApp "pedido listo" notification via Twilio (sandbox now, Meta Cloud API
// later — same shape: one HTTP POST from this action). The action no-ops
// cleanly when the Twilio env vars are unset so deployments without
// credentials (e.g. production before launch) are unaffected.
//
// Required env (set with `npx convex env set ...`):
//   TWILIO_ACCOUNT_SID    ACxxxxxxxx
//   TWILIO_AUTH_TOKEN     (secret)
//   TWILIO_WHATSAPP_FROM  whatsapp:+14155238886  (sandbox number)

export const orderForNotification = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }
    return {
      shortCode: order.shortCode ?? "",
      customerName: order.customerName ?? "",
      customerPhone: order.customerPhone ?? "",
      orderType: order.orderType ?? "table",
    };
  },
});

export const recordNotificationEvent = internalMutation({
  args: {
    orderId: v.id("orders"),
    eventType: v.string(),
    detail: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      eventType: args.eventType,
      actor: "system",
      detail: args.detail,
      createdAt: Date.now(),
    });
  },
});

export const sendOrderReady = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!accountSid || !authToken || !from) {
      console.log("notifications: Twilio env not configured, skipping send");
      return null;
    }

    const order = await ctx.runQuery(internal.notifications.orderForNotification, {
      orderId: args.orderId,
    });
    if (!order || order.orderType !== "pickup" || !order.customerPhone) {
      return null;
    }

    const body = `¡Tu pedido${order.shortCode ? ` #${order.shortCode}` : ""} está listo! \u{1F389} Puedes pasar a recogerlo en Belly Monster Bites. Muestra este mensaje al recoger.`;

    // Mexican WhatsApp identities keep the legacy mobile prefix: +52XXXXXXXXXX
    // must be sent as +521XXXXXXXXXX or Twilio treats it as a different user
    // (verified empirically: error 63015 on +52, delivered on +521).
    const whatsappPhone = /^\+52\d{10}$/.test(order.customerPhone)
      ? order.customerPhone.replace(/^\+52/, "+521")
      : order.customerPhone;

    const params = new URLSearchParams({
      From: from,
      To: `whatsapp:${whatsappPhone}`,
      Body: body,
    });

    let resultDetail: Record<string, unknown>;
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        },
      );
      const payload = (await response.json()) as { sid?: string; message?: string };
      resultDetail = response.ok
        ? { channel: "whatsapp", provider: "twilio", ok: true, messageSid: payload.sid ?? null }
        : {
            channel: "whatsapp",
            provider: "twilio",
            ok: false,
            status: response.status,
            error: payload.message ?? "unknown",
          };
    } catch (error) {
      resultDetail = {
        channel: "whatsapp",
        provider: "twilio",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    await ctx.runMutation(internal.notifications.recordNotificationEvent, {
      orderId: args.orderId,
      eventType: resultDetail.ok ? "notify_sent" : "notify_failed",
      detail: resultDetail,
    });
    return null;
  },
});
