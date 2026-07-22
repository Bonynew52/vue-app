import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { betterAuthConfig } from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

function requiredEnv(name: "CONVEX_SITE_URL" | "SITE_URL" | "BETTER_AUTH_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

export function trustedOrigins() {
  return [
    requiredEnv("SITE_URL"),
    "https://www.bellymonsterbites.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
}

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = requiredEnv("SITE_URL");

  return {
    appName: "Belly Monster Bites",
    baseURL: requiredEnv("CONVEX_SITE_URL"),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      disableSignUp: process.env.ALLOW_STAFF_SIGNUP !== "true",
      requireEmailVerification: false,
    },
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: trustedOrigins(),
    plugins: [crossDomain({ siteUrl }), convex({ authConfig: betterAuthConfig })],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
