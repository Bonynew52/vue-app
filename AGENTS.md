<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Mobile Safari Menu Stability

Before changing `/menu`, read `docs/mobile-safari-menu-crash.md`. A prior
iPhone-only crash was caused by WebKit renderer/compositor memory pressure from
too many mobile menu cards and horizontal scroll rails. Desktop/WebKit emulation
did not reliably reproduce it; real-device logs and compositor metrics were
needed.
