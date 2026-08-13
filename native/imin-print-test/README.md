# Belly iMin Print Test

Tiny Android APK for proving and running third-party native printing through the kiosk's iMin/internal printer.

The v0.5.1 app has two paths:

- **Print sample comanda**: manual iMin receipt test sent as ESC/POS raw bytes.
- **Printer agent foreground service**: polls Convex for pending `printJobs`, prints one comanda at a time, then marks it `printed` or `failed`.

## Download

Use one APK link for installs and updates:

- https://github.com/Bonynew52/vue-app/raw/main/public/downloads/belly-imin-print-test.apk

From GitHub on the tablet/POS:

1. Open the direct APK link above.
2. Open the downloaded APK.
3. Allow unknown app installs if Android asks.
4. Install and open **Belly Printer**.
5. Tap **Encender receptor** to start the background polling loop.

When the APK changes, replace `public/downloads/belly-imin-print-test.apk`.
The terminal Parrot can download that same file again and install it over the
previous version.

Release standard: every APK change increments `versionName` and `versionCode`,
rebuilds `native/imin-print-test`, replaces
`public/downloads/belly-imin-print-test.apk`, updates the READMEs, and is pushed
to `main`.

Build:

```bash
cd native/imin-print-test
cd ../..
vercel env run --environment=production -- bash -lc \
  'cd native/imin-print-test && JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools PATH=/opt/homebrew/opt/openjdk@17/bin:$PATH ./gradlew assembleDebug'
```

The APK build requires:

- `CONVEX_HTTP_BASE_URL` or `VITE_CONVEX_SITE_URL`
- `PRINTER_AGENT_TOKEN`

The debug APK expects `PRINTER_AGENT_TOKEN` from Gradle properties, environment
variables, `.env.local`, or the token saved in the in-app Config screen. The
same token must also be set in the target Convex deployment:

```bash
npx convex env set PRINTER_AGENT_TOKEN '...'
```

Install locally through ADB when a device is connected:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Expected manual result: launch **Belly Printer**, tap **Print sample comanda**, and verify whether the kiosk prints, feeds, and cuts/rips cleanly.

Expected agent result: tap **Encender receptor**. The notification should stay visible while the foreground service polls Convex and prints pending commandas.

The v0.5.1 APK uses iMin SDK V1.3.1 with the documented USB path for D4 / Android 11 devices. Runtime diagnostics remain available through Android Logcat and the on-screen terminal. Config shows the active backend routes used by the agent. Tickets use a simplified plain-text format sent through `sendRAWData(byte[])` as ESC/POS bytes to reduce repeated-line printer issues.
