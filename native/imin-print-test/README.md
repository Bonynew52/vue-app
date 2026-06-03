# Belly iMin Print Test

Tiny Android APK for proving and running third-party native printing through the kiosk's iMin/internal printer.

The v0.4 app has two paths:

- **Print sample comanda**: manual iMin receipt test with feed + `partialCut()`.
- **Printer agent foreground service**: polls Convex for pending `printJobs`, prints one comanda at a time, then marks it `printed` or `failed`.

Build:

```bash
cd native/imin-print-test
cd ../..
vercel env run --environment=production -- bash -lc \
  'cd native/imin-print-test && JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools PATH=/opt/homebrew/opt/openjdk@17/bin:$PATH ./gradlew assembleDebug'
```

The APK build requires:

- `SENTRY_DSN` or `VITE_SENTRY_DSN`
- `CONVEX_HTTP_BASE_URL` or `VITE_CONVEX_SITE_URL`
- `PRINTER_AGENT_TOKEN`

Gradle fails if any are missing. The same `PRINTER_AGENT_TOKEN` must also be set in the target Convex deployment:

```bash
npx convex env set PRINTER_AGENT_TOKEN '...'
```

The app emits Sentry Logs through the Android SDK with `io.sentry.logs.enabled=true`.

Install locally through ADB when a device is connected:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Expected manual result: launch **Belly Print Test**, tap **Print sample comanda**, and verify whether the kiosk prints, feeds, and cuts/rips cleanly.

Expected agent result: tap **Start printer agent**. The notification should stay visible while the foreground service polls Convex and prints pending commandas.

The v0.4 APK uses iMin SDK V1.3.1 with the documented USB path for D4 / Android 11 devices. Sentry Logs include `sdk.family=imin-v1`, `printer.connect_type=USB`, `printer.status`, and printer-agent events.
