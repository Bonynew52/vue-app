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
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.imin.printerlib.IminPrintUtils;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
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
    private EditText backendInput;
    private EditText tokenInput;
    private Button printButton;
    private Button configButton;
    private Button saveConfigButton;
    private Button startAgentButton;
    private Button stopAgentButton;
    private Button refreshTraceButton;
    private Button clearTraceButton;
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

        backendInput = new EditText(this);
        backendInput.setHint("Backend URL");
        backendInput.setSingleLine(true);
        backendInput.setText(AppConfig.backendUrl(this));
        backendInput.setVisibility(View.GONE);
        content.addView(backendInput, fullWidth());

        tokenInput = new EditText(this);
        tokenInput.setHint("Printer agent token");
        tokenInput.setSingleLine(true);
        tokenInput.setText(AppConfig.agentToken(this));
        tokenInput.setVisibility(View.GONE);
        content.addView(tokenInput, fullWidth());

        saveConfigButton = new Button(this);
        saveConfigButton.setText("Guardar config");
        saveConfigButton.setAllCaps(false);
        saveConfigButton.setVisibility(View.GONE);
        saveConfigButton.setOnClickListener(view -> saveConfig());
        content.addView(saveConfigButton, fullWidth());

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

        refreshTraceButton = new Button(this);
        refreshTraceButton.setText("Actualizar terminal");
        refreshTraceButton.setAllCaps(false);
        refreshTraceButton.setOnClickListener(view -> refreshTerminal());
        content.addView(refreshTraceButton, fullWidth());

        clearTraceButton = new Button(this);
        clearTraceButton.setText("Limpiar terminal");
        clearTraceButton.setAllCaps(false);
        clearTraceButton.setOnClickListener(view -> clearTerminal());
        content.addView(clearTraceButton, fullWidth());

        statusView = new TextView(this);
        statusView.setTextSize(15);
        statusView.setTextColor(0xFFE7F6ED);
        statusView.setTypeface(Typeface.MONOSPACE);
        statusView.setPadding(dp(12), dp(12), dp(12), dp(12));
        statusView.setBackgroundColor(0xFF050705);
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

    @Override
    protected void onResume() {
        super.onResume();
        refreshTerminal();
    }

    private void toggleConfig() {
        if (configView == null) {
            return;
        }
        configView.setText(configSummary());
        boolean show = configView.getVisibility() != View.VISIBLE;
        configView.setVisibility(show ? View.VISIBLE : View.GONE);
        backendInput.setText(AppConfig.backendUrl(this));
        tokenInput.setText(AppConfig.agentToken(this));
        backendInput.setVisibility(show ? View.VISIBLE : View.GONE);
        tokenInput.setVisibility(show ? View.VISIBLE : View.GONE);
        saveConfigButton.setVisibility(show ? View.VISIBLE : View.GONE);
    }

    private void saveConfig() {
        AppConfig.save(this, backendInput.getText().toString(), tokenInput.getText().toString());
        configView.setText(configSummary());
        appendTrace("OK", "config", "guardar backend/token", "config guardada", "");
        refreshTerminal();
    }

    private String configSummary() {
        return "Backend: " + AppConfig.backendUrl(this)
                + "\nToken: " + AppConfig.maskedToken(this)
                + "\nRutas activas:"
                + "\n  POST /printer/claim-next"
                + "\n  POST /printer/complete"
                + "\n  POST /printer/heartbeat"
                + "\nCola: printJobs (Pedidos DM y comandas)"
                + "\nApp: " + appVersionName()
                + "\nPrinter status: " + safePrinterStatusCode()
                + "\nDevice: " + Build.MANUFACTURER + " " + Build.MODEL;
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
                printer.setAlignment(0);
                printer.setTextStyle(Typeface.NORMAL);
                printer.setTextSize(26);
                String sample = "BELLY MONSTER BITES\n"
                        + "COMANDA AVISOS LOCAL\n"
                        + "--------------------------------\n"
                        + "NOMBRE: PEDRO\n"
                        + "#TEST01\n"
                        + "--------------------------------\n"
                        + "Time: " + timestamp + "\n"
                        + "--------------------------------\n"
                        + "LAVANDA LATTE\n"
                        + "LECHE DESLACTOSADA\n"
                        + "ROL DE CANELA\n"
                        + "--------------------------------\n"
                        + "FIN COMANDA\n"
                        + "--------------------------------\n\n";
                printEscPosTicket(sample);

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
        appendTrace("OK", "agent_start", "servicio encendido", "startService enviado", "revisando textos y comandas");
        refreshTerminal();
    }

    private void stopPrinterAgent() {
        Intent intent = new Intent(this, PrinterAgentService.class);
        intent.setAction(PrinterAgentService.ACTION_STOP);
        startService(intent);
        appendTrace("OK", "agent_stop", "servicio apagado", "stopService enviado", "loop detenido");
        refreshTerminal();
    }

    private void record(int level, String event, String message, Map<String, Object> attributes) {
        String levelText = level >= Log.ERROR ? "ERROR" : level >= Log.WARN ? "WARN" : "OK";
        runOnUiThread(() -> {
            appendTrace(levelText, event, "accion esperada sin excepcion", message, String.valueOf(attributes));
            refreshTerminal();
        });

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

    private void appendTrace(String level, String step, String expected, String actual, String detail) {
        PrinterTrace.append(this, level, step, expected, actual, detail);
    }

    private void refreshTerminal() {
        if (statusView != null) {
            statusView.setText(PrinterTrace.read(this));
        }
    }

    private void clearTerminal() {
        PrinterTrace.clear(this);
        refreshTerminal();
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

    private void printEscPosTicket(String ticket) {
        String normalized = ticket.replace("\r\n", "\n").replace('\r', '\n');
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        raw.write(0x1B);
        raw.write(0x40);
        raw.write(0x1B);
        raw.write(0x74);
        raw.write(0x00);
        appendEscPosText(raw, normalized);
        raw.write(0x0A);
        raw.write(0x0A);
        raw.write(0x0A);
        raw.write(0x1D);
        raw.write(0x56);
        raw.write(0x42);
        raw.write(0x00);
        byte[] bytes = raw.toByteArray();
        appendTrace(
                "STEP",
                "escpos_build",
                "ticket completo -> paquete ESC/POS raw",
                "bytes=" + bytes.length + ", lines=" + normalized.split("\n", -1).length,
                "hash=" + checksum(bytes)
        );
        int beforeStatus = safePrinterStatusCode();
        printer.sendRAWData(bytes);
        int afterStatus = safePrinterStatusCode();
        appendTrace("OK", "escpos_send", "sendRAWData(byte[]) sin excepcion", "raw enviado al SDK", "statusBefore=" + beforeStatus + ", statusAfter=" + afterStatus);
        sleep(900);
    }

    private void appendEscPosText(ByteArrayOutputStream raw, String text) {
        byte[] bytes = text.getBytes(StandardCharsets.US_ASCII);
        raw.write(bytes, 0, bytes.length);
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private String checksum(byte[] bytes) {
        int hash = 1;
        for (byte value : bytes) {
            hash = 31 * hash + (value & 0xFF);
        }
        return Integer.toHexString(hash).toUpperCase(Locale.US);
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
