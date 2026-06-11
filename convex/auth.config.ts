// No fallback issuer on purpose: a deployment that forgets to set
// CLERK_JWT_ISSUER_DOMAIN must fail the push instead of silently trusting
// JWTs minted by some other (e.g. dev) Clerk instance.
const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!issuerDomain) {
  throw new Error(
    "Missing CLERK_JWT_ISSUER_DOMAIN. Set it with `npx convex env set CLERK_JWT_ISSUER_DOMAIN <issuer-url>`.",
  );
}

export default {
  providers: [
    {
      domain: issuerDomain,
      applicationID: "convex",
    },
  ],
};
