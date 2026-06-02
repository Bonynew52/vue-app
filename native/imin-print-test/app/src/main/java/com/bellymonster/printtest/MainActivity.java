package com.bellymonster.printtest;

import android.app.Activity;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.RemoteException;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.imin.printer.INeoPrinterCallback;
import com.imin.printer.InitPrinterCallback;
import com.imin.printer.PrinterHelper;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import io.sentry.Sentry;
import io.sentry.SentryAttributes;
import io.sentry.SentryLogLevel;
import io.sentry.logger.SentryLogParameters;

public class MainActivity extends Activity {
    private final PrinterHelper printer = PrinterHelper.getInstance();
    private final AtomicInteger sequence = new AtomicInteger(0);
    private final String sessionId = UUID.randomUUID().toString();

    private TextView statusView;
    private Button printButton;
    private boolean serviceConnected;
    private boolean serviceBindRequested;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(buildContentView());
        Sentry.setTag("component", "native-imin-print-test");
        Sentry.setTag("app", "belly-monster-bites");
        record(SentryLogLevel.INFO, "app_start", "App started", attrs(
                "sdk.version", safeSdkVersion()
        ));
        initPrinterService();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        record(SentryLogLevel.INFO, "app_destroy", "App closing", attrs());
        try {
            printer.deInitPrinterService(this);
        } catch (Exception error) {
            record(SentryLogLevel.WARN, "service_unbind_failed", "Printer service unbind failed", attrs(
                    "error.type", error.getClass().getSimpleName(),
                    "error.message", String.valueOf(error.getMessage())
            ));
        }
        Sentry.flush(2000);
    }

    private ScrollView buildContentView() {
        int pad = dp(20);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        content.setPadding(pad, pad, pad, pad);
        content.setBackgroundColor(0xFFF7F3ED);

        TextView title = new TextView(this);
        title.setText("Belly Print Test");
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextColor(0xFF14211B);
        content.addView(title, fullWidth());

        TextView subtitle = new TextView(this);
        subtitle.setText("Native iMin/internal printer smoke test");
        subtitle.setTextSize(16);
        subtitle.setTextColor(0xFF4E5D54);
        subtitle.setPadding(0, dp(8), 0, dp(20));
        content.addView(subtitle, fullWidth());

        printButton = new Button(this);
        printButton.setText("Print native test");
        printButton.setAllCaps(false);
        printButton.setEnabled(false);
        printButton.setOnClickListener(view -> printNativeTest());
        content.addView(printButton, fullWidth());

        statusView = new TextView(this);
        statusView.setTextSize(15);
        statusView.setTextColor(0xFF25312B);
        statusView.setPadding(0, dp(20), 0, 0);
        content.addView(statusView, fullWidth());

        ScrollView scroll = new ScrollView(this);
        scroll.addView(content);
        return scroll;
    }

    private void initPrinterService() {
        record(SentryLogLevel.INFO, "service_bind_start", "Binding to iMin printer service...", attrs());

        try {
            serviceBindRequested = printer.initPrinterService(getApplicationContext(), new InitPrinterCallback() {
                @Override
                public void onConnected() {
                    serviceConnected = true;
                    runOnUiThread(() -> printButton.setEnabled(true));
                    record(SentryLogLevel.INFO, "service_connected", "Printer service connected.", attrs(
                            "service.version", safeServiceVersion(),
                            "printer.status", safePrinterStatus()
                    ));
                    record(SentryLogLevel.INFO, "printer_ready_prompt", "Tap the button to invoke one tiny receipt.", attrs());
                }

                @Override
                public void onDisconnected() {
                    serviceConnected = false;
                    runOnUiThread(() -> printButton.setEnabled(false));
                    record(SentryLogLevel.WARN, "service_disconnected", "Printer service disconnected.", attrs(
                            "printer.status", safePrinterStatus()
                    ));
                }
            });

            record(serviceBindRequested ? SentryLogLevel.INFO : SentryLogLevel.ERROR, "service_bind_requested", "Service bind requested: " + serviceBindRequested, attrs(
                    "service.bind_requested", serviceBindRequested,
                    "service.version", safeServiceVersion(),
                    "printer.status", safePrinterStatus()
            ));
        } catch (Exception error) {
            serviceBindRequested = false;
            record(SentryLogLevel.ERROR, "service_bind_exception", "Printer service bind threw an exception", attrs(
                    "error.type", error.getClass().getSimpleName(),
                    "error.message", String.valueOf(error.getMessage()),
                    "service.bind_requested", false
            ));
        }

        printButton.postDelayed(() -> {
            if (!serviceConnected) {
                printButton.setEnabled(true);
                record(SentryLogLevel.WARN, "service_not_connected_timeout", "Service did not report connected yet. Button enabled to test direct SDK behavior.", attrs(
                        "service.bind_requested", serviceBindRequested,
                        "printer.status", safePrinterStatus()
                ));
            }
        }, 2500);
    }

    private void printNativeTest() {
        printButton.setEnabled(false);
        record(serviceConnected ? SentryLogLevel.INFO : SentryLogLevel.WARN, "print_button_tapped", "Starting print test...", attrs(
                "service.bind_requested", serviceBindRequested,
                "printer.status", safePrinterStatus()
        ));

        new Thread(() -> {
            try {
                String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());

                printer.initPrinterParams();
                record(SentryLogLevel.DEBUG, "printer_params_initialized", "Printer params initialized", attrs(
                        "printer.status", safePrinterStatus()
                ));

                printer.setPageFormat(0);
                printer.setFontBold(true);
                printer.printTextWithAli("BELLY MONSTER BITES\n", 1, callback("title"));
                printer.setFontBold(false);
                printer.printTextWithAli("Native iMin print test\n", 1, callback("subtitle"));
                printer.printText("--------------------------------\n", callback("divider"));
                printer.printText("If this printed, third-party native code can reach the kiosk printer.\n", callback("body"));
                printer.printText("Time: " + timestamp + "\n", callback("time"));
                printer.printText("App: com.bellymonster.printtest\n", callback("app"));
                printer.printText("Version: " + appVersionName() + "\n", callback("version"));
                printer.printText("--------------------------------\n\n", callback("end"));
                printer.printAndFeedPaper(80);

                runOnUiThread(() -> printButton.setEnabled(true));
                record(SentryLogLevel.INFO, "print_commands_invoked", "Print commands invoked. Paper output is the final proof.", attrs(
                        "service.bind_requested", serviceBindRequested,
                        "printer.status", safePrinterStatus()
                ));
                Sentry.flush(2000);
            } catch (Exception error) {
                runOnUiThread(() -> printButton.setEnabled(true));
                record(SentryLogLevel.ERROR, "print_exception", "Print failed: " + error.getClass().getSimpleName() + ": " + error.getMessage(), attrs(
                        "error.type", error.getClass().getSimpleName(),
                        "error.message", String.valueOf(error.getMessage()),
                        "service.bind_requested", serviceBindRequested,
                        "printer.status", safePrinterStatus()
                ));
                Sentry.flush(2000);
            }
        }, "imin-print-test").start();
    }

    private INeoPrinterCallback callback(String label) {
        return new INeoPrinterCallback() {
            @Override
            public void onRunResult(boolean success) throws RemoteException {
                record(success ? SentryLogLevel.DEBUG : SentryLogLevel.WARN, "printer_callback_run_result", label + " runResult=" + success, attrs(
                        "callback.label", label,
                        "callback.success", success,
                        "printer.status", safePrinterStatus()
                ));
            }

            @Override
            public void onReturnString(String value) throws RemoteException {
                record(SentryLogLevel.DEBUG, "printer_callback_return_string", label + " return=" + value, attrs(
                        "callback.label", label,
                        "callback.value", value,
                        "printer.status", safePrinterStatus()
                ));
            }

            @Override
            public void onRaiseException(int code, String message) throws RemoteException {
                record(SentryLogLevel.ERROR, "printer_callback_exception", label + " exception=" + code + " " + message, attrs(
                        "callback.label", label,
                        "callback.code", code,
                        "callback.message", message,
                        "printer.status", safePrinterStatus()
                ));
            }

            @Override
            public void onPrintResult(int code, String message) throws RemoteException {
                record(SentryLogLevel.INFO, "printer_callback_print_result", label + " printResult=" + code + " " + message, attrs(
                        "callback.label", label,
                        "callback.code", code,
                        "callback.message", message,
                        "printer.status", safePrinterStatus()
                ));
            }
        };
    }

    private void record(SentryLogLevel level, String event, String message, Map<String, Object> attributes) {
        runOnUiThread(() -> appendLog(message));

        Map<String, Object> enriched = new HashMap<>(attributes);
        enriched.put("app", "belly-monster-bites");
        enriched.put("component", "native-imin-print-test");
        enriched.put("event", event);
        enriched.put("app.version", appVersionName());
        enriched.put("android.sdk_int", Build.VERSION.SDK_INT);
        enriched.put("android.release", Build.VERSION.RELEASE);
        enriched.put("device.manufacturer", Build.MANUFACTURER);
        enriched.put("device.model", Build.MODEL);
        enriched.put("session.id", sessionId);
        enriched.put("sequence", sequence.incrementAndGet());
        enriched.put("service.connected", serviceConnected);

        try {
            Sentry.logger().log(
                    level,
                    SentryLogParameters.create(SentryAttributes.fromMap(enriched)),
                    "[printer-test] " + message
            );
        } catch (Exception error) {
            runOnUiThread(() -> appendLog("Sentry log failed: " + error.getClass().getSimpleName()));
        }
    }

    private void appendLog(String message) {
        String existing = statusView.getText().toString();
        String line = "[" + timeOnly() + "] " + message;
        statusView.setText(existing.isEmpty() ? line : existing + "\n" + line);
    }

    private Map<String, Object> attrs(Object... pairs) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            map.put(String.valueOf(pairs[i]), pairs[i + 1]);
        }
        return map;
    }

    private String safeSdkVersion() {
        try {
            return PrinterHelper.getSDKVersionName();
        } catch (Exception error) {
            return "unavailable (" + error.getClass().getSimpleName() + ")";
        }
    }

    private String safeServiceVersion() {
        try {
            return printer.getServiceVersion();
        } catch (Exception error) {
            return "unavailable (" + error.getClass().getSimpleName() + ")";
        }
    }

    private String safePrinterStatus() {
        try {
            return String.valueOf(printer.getPrinterStatus());
        } catch (Exception error) {
            return "unavailable (" + error.getClass().getSimpleName() + ")";
        }
    }

    private String appVersionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception error) {
            return "unknown";
        }
    }

    private String timeOnly() {
        return new SimpleDateFormat("HH:mm:ss", Locale.US).format(new Date());
    }

    private LinearLayout.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
