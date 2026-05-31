# Mobile Safari Menu Crash

## Summary

On May 31, 2026, `https://www.bellymonsterbites.com/menu` intermittently
crashed on a real iPhone 15 in Mobile Safari with Safari's generic message:
`A problem repeatedly occurred`.

This was not a normal JavaScript exception. Sentry did not show a useful
runtime error because the failure happened below the JS runtime, in Safari's
WebKit WebContent renderer/compositor process.

## Cause

The mobile menu was creating too much render/compositor pressure:

- 93 mounted menu cards.
- 21 horizontal scroll rails.
- 794 DOM elements.
- 71 compositor layers.
- About 38.8 megapixels of compositor layer area.
- 23 accelerated scrollable overflow layers.

The key issue was the combination of many horizontal `overflow-x: auto` rails,
image-backed cards, high-DPI iPhone rendering, and extra placeholder sections.
Compressed image transfer size was not the main problem. The browser has to
decode and paint images/layout into memory-backed surfaces, and iOS Safari can
kill or reset a tab's WebContent process when that renderer gets too expensive.

## Evidence

Real-device evidence:

- iPhone Safari showed a local `Webpage Crashed` history/suggestion entry for
  `bellymonsterbites.com/menu`.
- Live iPhone syslog while opening `/menu` showed WebKit WebContent memory
  pressure events:
  - `Received memory pressure event`
  - `Memory pressure relief`
  - `WebProcess::markAllLayersVolatile: Failed to mark layers as volatile`
- No fresh JavaScript exception appeared in Sentry for the crash.

Browser benchmark evidence:

- WebKit/Chromium emulation did not reliably reproduce the crash.
- Chromium's layer tree showed the production `/menu` route had 71 compositor
  layers and about 38.8MP of layer area.
- The JS heap was small, around 6 MB, so this was not a Vue heap leak.

## Fix

Commit `5a2b8a6` reduced mobile render pressure by:

- Not mounting fake placeholder menu sections on screens up to 640px wide.
- Keeping the real Rappi menu sections intact.
- Adding `content-visibility: auto` to menu sections.
- Adding `contain-intrinsic-size` so offscreen sections stay layout-stable.

After the fix, production mobile `/menu` measured:

- 33 mounted menu cards.
- 6 horizontal scroll rails.
- 309 DOM elements.
- 23 compositor layers.
- About 12.6MP of compositor layer area.

## Future Guidance

If a similar iPhone-only Safari crash appears:

1. Do not assume Sentry will catch it. Sentry sees JS events, not every WebKit
   renderer/compositor kill.
2. Test on a real iPhone when possible. Desktop WebKit emulation may not
   reproduce the crash.
3. Pull iPhone logs with `idevicecrashreport` and/or capture live syslog with
   `idevicesyslog`.
4. Look for WebKit/WebContent memory pressure, Jetsam, layer volatility, or
   process termination messages.
5. Benchmark the route's DOM, image, scroll-container, and compositor-layer
   shape. In Chromium, `LayerTree` via CDP is useful for approximating layer
   count, layer area, and compositing reasons.
6. Treat many horizontal rails, fixed/sticky/backdrop-filter elements, animated
   transforms, and high-DPI image cards as likely compositor pressure sources.

For this project, avoid reintroducing large placeholder sections or many nested
horizontal scroll rails on mobile menu pages unless they are virtualized or
lazy-mounted.
