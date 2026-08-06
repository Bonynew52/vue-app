package com.bellymonster.printtest;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.imin.printerlib.IminPrintUtils;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

public class MainActivity extends Activity {
    private final AtomicInteger sequence = new AtomicInteger(0);
    private final String sessionId = UUID.randomUUID().toString();

    private TextView statusView;
    private TextView configView;
    private Button printButton;
    private Button configButton;
    private Button startAgentButton;
    private Button stopAgentButton;
    private IminPrintUtils printer;
    private boolean printerInitialized;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(buildContentView());
        printer = IminPrintUtils.getInstance(this);
        IminPrintUtils.setIsOpenLog(1);
        record(Log.INFO, "app_start", "App started", attrs(
                "sdk.family", "imin-v1",
                "sdk.version", safeSdkVersion(),
                "printer.connect_type", "USB"
        ));
        initPrinterConnection();
    }

    @Override
    protected void onDestroy() {
        record(Log.INFO, "app_destroy", "App closing", attrs());
        super.onDestroy();
    }

    private FrameLayout buildContentView() {
        int pad = dp(20);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        content.setPadding(pad, pad, pad, pad);
        content.setBackgroundColor(0xFFF7F3ED);

        TextView title = new TextView(this);
        title.setText("Belly Printer");
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextColor(0xFF14211B);
        title.setPadding(0, dp(42), 0, 0);
        content.addView(title, fullWidth());

        configView = new TextView(this);
        configView.setText(configSummary());
        configView.setTextSize(13);
        configView.setTextColor(0xFF25312B);
        configView.setPadding(dp(12), dp(12), dp(12), dp(12));
        configView.setBackgroundColor(0xFFE8F3EE);
        configView.setVisibility(View.GONE);
        content.addView(configView, fullWidth());

        TextView subtitle = new TextView(this);
        subtitle.setText("Receptor en segundo plano para textos y comandas");
        subtitle.setTextSize(16);
        subtitle.setTextColor(0xFF4E5D54);
        subtitle.setPadding(0, dp(8), 0, dp(20));
        content.addView(subtitle, fullWidth());

        printButton = new Button(this);
        printButton.setText("Imprimir prueba");
        printButton.setAllCaps(false);
        printButton.setEnabled(false);
        printButton.setOnClickListener(view -> printNativeTest());
        content.addView(printButton, fullWidth());

        startAgentButton = new Button(this);
        startAgentButton.setText("Encender receptor");
        startAgentButton.setAllCaps(false);
        startAgentButton.setTextColor(0xFFFFFFFF);
        startAgentButton.setBackgroundColor(0xFF116149);
        startAgentButton.setOnClickListener(view -> startPrinterAgent());
        content.addView(startAgentButton, fullWidth());

        stopAgentButton = new Button(this);
        stopAgentButton.setText("Apagar receptor");
        stopAgentButton.setAllCaps(false);
        stopAgentButton.setTextColor(0xFFFFFFFF);
        stopAgentButton.setBackgroundColor(0xFFC0392B);
        stopAgentButton.setOnClickListener(view -> stopPrinterAgent());
        content.addView(stopAgentButton, fullWidth());

        statusView = new TextView(this);
        statusView.setTextSize(15);
        statusView.setTextColor(0xFF25312B);
        statusView.setPadding(0, dp(20), 0, 0);
        content.addView(statusView, fullWidth());

        ScrollView scroll = new ScrollView(this);
        scroll.addView(content);

        FrameLayout frame = new FrameLayout(this);
        frame.addView(scroll);

        configButton = new Button(this);
        configButton.setText("Config");
        configButton.setAllCaps(false);
        configButton.setTextSize(12);
        configButton.setOnClickListener(view -> toggleConfig());
        FrameLayout.LayoutParams configParams = new FrameLayout.LayoutParams(dp(92), dp(42));
        configParams.gravity = Gravity.TOP | Gravity.END;
        configParams.setMargins(0, dp(12), dp(12), 0);
        frame.addView(configButton, configParams);

        return frame;
    }

    private void toggleConfig() {
        if (configView == null) {
            return;
        }
        configView.setText(configSummary());
        configView.setVisibility(configView.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
    }

    private String configSummary() {
        return "Backend: " + BuildConfig.CONVEX_HTTP_BASE_URL
                + "\nToken: " + maskedTokenState()
                + "\nApp: " + appVersionName()
                + "\nPrinter status: " + safePrinterStatusCode()
                + "\nDevice: " + Build.MANUFACTURER + " " + Build.MODEL;
    }

    private String maskedTokenState() {
        String token = BuildConfig.PRINTER_AGENT_TOKEN == null ? "" : BuildConfig.PRINTER_AGENT_TOKEN;
        if (token.isEmpty()) {
            return "missing";
        }
        if (token.length() <= 8) {
            return "set (" + token.length() + " chars)";
        }
        return "set (" + token.substring(0, 4) + "..." + token.substring(token.length() - 4) + ")";
    }

    private void initPrinterConnection() {
        record(Log.INFO, "printer_v1_usb_init_start", "Initializing iMin V1 USB printer path...", attrs(
                "printer.connect_type", "USB"
        ));

        new Thread(() -> {
            try {
                printer.initPrinter(IminPrintUtils.PrintConnectType.USB);
                printerInitialized = true;

                int status = safePrinterStatusCode();
                record(status == 0 ? Log.INFO : Log.WARN, "printer_v1_usb_init_complete", "USB printer init complete. Status: " + status, attrs(
                        "printer.connect_type", "USB",
                        "printer.status", status
                ));
            } catch (Exception error) {
                printerInitialized = false;
                record(Log.ERROR, "printer_v1_usb_init_exception", "USB printer init failed: " + error.getClass().getSimpleName() + ": " + error.getMessage(), attrs(
                        "error.type", error.getClass().getSimpleName(),
                        "error.message", String.valueOf(error.getMessage()),
                        "printer.connect_type", "USB"
                ));
            }

            runOnUiThread(() -> printButton.setEnabled(true));
            record(Log.INFO, "printer_ready_prompt", "Tap the button to invoke one tiny USB receipt.", attrs(
                    "printer.connect_type", "USB",
                    "printer.initialized", printerInitialized,
                    "printer.status", safePrinterStatusCode()
            ));
        }, "imin-v1-usb-init").start();
    }

    private void printNativeTest() {
        printButton.setEnabled(false);
        record(printerInitialized ? Log.INFO : Log.WARN, "print_button_tapped", "Starting iMin V1 USB print test...", attrs(
                "printer.connect_type", "USB",
                "printer.initialized", printerInitialized,
                "printer.status", safePrinterStatusCode()
        ));

        new Thread(() -> {
            try {
                String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());

                if (!printerInitialized) {
                    printer.initPrinter(IminPrintUtils.PrintConnectType.USB);
                    printerInitialized = true;
                    record(Log.INFO, "printer_v1_usb_lazy_init_complete", "USB printer lazy init complete.", attrs(
                            "printer.connect_type", "USB",
                            "printer.status", safePrinterStatusCode()
                    ));
                }

                int beforeStatus = safePrinterStatusCode();
                record(beforeStatus == 0 ? Log.INFO : Log.WARN, "printer_status_before_print", "Printer status before print: " + beforeStatus, attrs(
                        "printer.connect_type", "USB",
                        "printer.status", beforeStatus
                ));

                printer.initParams();
                record(Log.DEBUG, "printer_params_initialized", "Printer params initialized", attrs(
                        "printer.connect_type", "USB",
                        "printer.status", safePrinterStatusCode()
                ));

                printer.setPageFormat(0);
                printer.setAlignment(1);
                printer.setTextStyle(Typeface.BOLD);
                printer.setTextSize(24);
                printer.printText("BELLY MONSTER BITES\n");
                printer.setTextSize(28);
                printer.printText("COMANDA\n");
                printer.setTextStyle(Typeface.NORMAL);
                printer.setTextSize(22);
                printer.setAlignment(0);
                printer.printText("--------------------------------\n");
                printer.printText("MESA 8\n");
                printer.printText("CLIENTE: PEDRO\n");
                printer.setTextStyle(Typeface.BOLD);
                printer.setTextSize(30);
                printer.printText("#TEST01\n");
                printer.setTextSize(22);
                printer.setTextStyle(Typeface.NORMAL);
                printer.printText("--------------------------------\n");
                printer.printText("Time: " + timestamp + "\n");
                printer.printText("DESTINO: BARRA / PICKUP\n");
                printer.printText("--------------------------------\n");
                printer.printText("ITEMS\n\n");
                printer.setTextStyle(Typeface.BOLD);
                printer.printText("1x ");
                printer.setTextStyle(Typeface.NORMAL);
                printer.printText("LAVANDA LATTE\n");
                printer.setTextStyle(Typeface.BOLD);
                printer.printText("   * LECHE DESLACTOSADA\n\n");
                printer.printText("2x ");
                printer.setTextStyle(Typeface.NORMAL);
                printer.printText("ROL DE CANELA\n");
                printer.printText("--------------------------------\n");
                printer.setAlignment(1);
                printer.printText("FIN COMANDA\n");
                printer.setAlignment(0);
                printer.printText("--------------------------------\n\n");
                printer.printAndFeedPaper(120);
                try {
                    printer.partialCut();
                    record(Log.INFO, "printer_partial_cut_invoked", "Partial cut invoked in sample print.", attrs(
                            "printer.connect_type", "USB",
                            "printer.status", safePrinterStatusCode()
                    ));
                } catch (Exception cutError) {
                    record(Log.WARN, "printer_cut_failed", "Sample printed but cut failed: " + cutError.getMessage(), attrs(
                            "error.type", cutError.getClass().getSimpleName(),
                            "error.message", String.valueOf(cutError.getMessage()),
                            "printer.connect_type", "USB",
                            "printer.status", safePrinterStatusCode()
                    ));
                }

                int afterStatus = safePrinterStatusCode();
                runOnUiThread(() -> printButton.setEnabled(true));
                record(Log.INFO, "print_commands_invoked", "V1 USB print commands invoked. Paper output is the final proof.", attrs(
                        "printer.connect_type", "USB",
                        "printer.status", afterStatus
                ));
            } catch (Exception error) {
                runOnUiThread(() -> printButton.setEnabled(true));
                record(Log.ERROR, "print_exception", "Print failed: " + error.getClass().getSimpleName() + ": " + error.getMessage(), attrs(
                        "error.type", error.getClass().getSimpleName(),
                        "error.message", String.valueOf(error.getMessage()),
                        "printer.connect_type", "USB",
                        "printer.initialized", printerInitialized,
                        "printer.status", safePrinterStatusCode()
                ));
            }
        }, "imin-v1-usb-print-test").start();
    }

    private void startPrinterAgent() {
        Intent intent = new Intent(this, PrinterAgentService.class);
        intent.setAction(PrinterAgentService.ACTION_START);
        if (Build.VERSION.SDK_INT >= 26) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
        appendLog("Receptor encendido: revisando textos y comandas");
    }

    private void stopPrinterAgent() {
        Intent intent = new Intent(this, PrinterAgentService.class);
        intent.setAction(PrinterAgentService.ACTION_STOP);
        startService(intent);
        appendLog("Receptor apagado: loop detenido");
    }

    private void record(int level, String event, String message, Map<String, Object> attributes) {
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
        enriched.put("sdk.family", "imin-v1");
        enriched.put("printer.connect_type", "USB");
        enriched.put("printer.initialized", printerInitialized);

        Log.println(level, "BellyPrintTest", event + " · " + message + " · " + enriched);
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
            return IminPrintUtils.getSDKVersionName();
        } catch (Exception error) {
            return "unavailable (" + error.getClass().getSimpleName() + ")";
        }
    }

    private int safePrinterStatusCode() {
        try {
            if (printer == null) {
                return -998;
            }
            return printer.getPrinterStatus(IminPrintUtils.PrintConnectType.USB);
        } catch (Exception error) {
            return -999;
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
