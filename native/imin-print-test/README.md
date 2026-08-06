# Belly iMin Print Test

Tiny Android APK for proving and running third-party native printing through the kiosk's iMin/internal printer.

The v0.4 app has two paths:

- **Print sample comanda**: manual iMin receipt test with feed + `partialCut()`.
- **Printer agent foreground service**: polls Convex for pending `printJobs`, prints one comanda at a time, then marks it `printed` or `failed`.

## Download and install on POS

The committed APK is available at:

- [Download POS printer APK](https://raw.githubusercontent.com/Bonynew52/vue-app/main/public/downloads/belly-imin-print-test.apk)

From GitHub on the tablet/POS:

1. Open the direct APK link above.
2. Open the downloaded APK.
3. Allow unknown app installs if Android asks.
4. Install and open **Belly Printer**.
5. Tap **Encender receptor** to start the background polling loop.

Rebuild and replace this APK whenever the native code changes.

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

Gradle fails if any are missing. The same `PRINTER_AGENT_TOKEN` must also be set in the target Convex deployment:

```bash
npx convex env set PRINTER_AGENT_TOKEN '...'
```

Install locally through ADB when a device is connected:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Expected manual result: launch **Belly Print Test**, tap **Print sample comanda**, and verify whether the kiosk prints, feeds, and cuts/rips cleanly.

Expected agent result: tap **Start printer agent**. The notification should stay visible while the foreground service polls Convex and prints pending commandas.

The v0.4 APK uses iMin SDK V1.3.1 with the documented USB path for D4 / Android 11 devices. Runtime diagnostics remain available through Android Logcat and the on-screen test log.
