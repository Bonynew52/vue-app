# Belly iMin Print Test

Tiny Android APK for proving whether third-party native code can print through the kiosk's iMin/internal printer.

Build:

```bash
cd native/imin-print-test
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools \
./gradlew assembleDebug
```

Install locally through ADB when a device is connected:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Expected result: launch **Belly Print Test**, tap **Print native test**, and verify whether the kiosk prints a small receipt.
