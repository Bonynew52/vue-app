package com.bellymonster.printtest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Build;
import android.os.IBinder;

import com.imin.printerlib.IminPrintUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import io.sentry.Sentry;
import io.sentry.SentryAttributes;
import io.sentry.SentryLogLevel;
import io.sentry.logger.SentryLogParameters;

public class PrinterAgentService extends Service {
    public static final String ACTION_START = "com.bellymonster.printtest.START_AGENT";
    public static final String ACTION_STOP = "com.bellymonster.printtest.STOP_AGENT";

    private static final int NOTIFICATION_ID = 4201;
    private static final String CHANNEL_ID = "belly_printer_agent";
    private static final long POLL_INTERVAL_MS = 3000L;
    private static final int RECEIPT_TEXT_SIZE = 22;
    private static final int RECEIPT_LINE_WIDTH = 32;

    private final AtomicInteger sequence = new AtomicInteger(0);
    private volatile boolean running;
    private Thread worker;
    private IminPrintUtils printer;
    private boolean printerInitialized;
    private String deviceId;

    @Override
    public void onCreate() {
        super.onCreate();
        deviceId = stableDeviceId();
        printer = IminPrintUtils.getInstance(this);
        IminPrintUtils.setIsOpenLog(1);
        Sentry.setTag("component", "native-imin-printer-agent");
        Sentry.setTag("app", "belly-monster-bites");
        log(SentryLogLevel.INFO, "service_create", "Printer agent service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopAgent();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, notification("Belly printer active", "Waiting for commandas"));
        startAgent();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopAgent();
        log(SentryLogLevel.INFO, "service_destroy", "Printer agent service destroyed");
        Sentry.flush(2000);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private synchronized void startAgent() {
        if (running) {
            return;
        }
        running = true;
        worker = new Thread(this::runLoop, "belly-printer-agent");
        worker.start();
        log(SentryLogLevel.INFO, "agent_started", "Printer agent started");
    }

    private synchronized void stopAgent() {
        running = false;
        if (worker != null) {
            worker.interrupt();
            worker = null;
        }
        try {
            if (printer != null) {
                printer.disConnectDevices();
            }
        } catch (Exception error) {
            log(SentryLogLevel.WARN, "printer_disconnect_failed", "Printer disconnect failed: " + error.getMessage());
        }
        stopForeground(true);
        stopSelf();
    }

    private void runLoop() {
        while (running) {
            try {
                ensurePrinter();
                PrintJobClaim claim = claimNextPrintJob();
                if (claim.job == null) {
                    sleep(POLL_INTERVAL_MS);
                    continue;
                }

                log(SentryLogLevel.INFO, "print_job_claimed", "Claimed comanda " + claim.job.id + " for " + claim.job.destinationLabel);
                // tableId arrives as a full label ("Mesa 4" / "Pick&Go"); no prefix here.
                updateNotification("Printing comanda", claim.job.tableId + " · #" + claim.job.shortCode);

                boolean paperWasPrinted = false;
                try {
                    printComanda(claim.job);
                    paperWasPrinted = true;
                    completePrintJob(claim, true, "");
                    log(SentryLogLevel.INFO, "print_job_completed", "Printed comanda " + claim.job.id);
                    updateNotification("Belly printer active", "Last printed #" + claim.job.shortCode);
                } catch (Exception printError) {
                    if (paperWasPrinted) {
                        log(SentryLogLevel.ERROR, "print_complete_failed_after_paper", "Paper printed but completion failed for " + claim.job.id + ": " + printError.getMessage());
                        updateNotification("Printed, sync failed", "#" + claim.job.shortCode + " needs review");
                    } else {
                        completePrintJob(claim, false, printError.getClass().getSimpleName() + ": " + printError.getMessage());
                        log(SentryLogLevel.ERROR, "print_job_failed", "Print failed for " + claim.job.id + ": " + printError.getMessage());
                        updateNotification("Print failed", "#" + claim.job.shortCode + " needs attention");
                    }
                }
            } catch (Exception error) {
                log(SentryLogLevel.ERROR, "agent_loop_error", "Printer agent loop error: " + error.getClass().getSimpleName() + ": " + error.getMessage());
                sleep(POLL_INTERVAL_MS);
            }
        }
    }

    private void ensurePrinter() {
        if (printerInitialized) {
            return;
        }
        printer.initPrinter(IminPrintUtils.PrintConnectType.USB);
        printerInitialized = true;
        log(SentryLogLevel.INFO, "printer_initialized", "USB printer initialized. Status: " + safePrinterStatusCode());
    }

    private PrintJobClaim claimNextPrintJob() throws Exception {
        JSONObject request = new JSONObject();
        request.put("deviceId", deviceId);
        JSONObject response = postJson("/printer/claim-next", request);
        JSONObject job = response.optJSONObject("job");
        String claimToken = response.optString("claimToken", "");
        return new PrintJobClaim(job == null ? null : PrintJob.fromJson(job), claimToken);
    }

    private void completePrintJob(PrintJobClaim claim, boolean success, String errorMessage) throws Exception {
        JSONObject request = new JSONObject();
        request.put("deviceId", deviceId);
        request.put("printJobId", claim.job.id);
        request.put("claimToken", claim.claimToken);
        request.put("success", success);
        request.put("errorMessage", errorMessage == null ? "" : errorMessage);
        postJson("/printer/complete", request);
    }

    private JSONObject postJson(String path, JSONObject payload) throws Exception {
        String baseUrl = BuildConfig.CONVEX_HTTP_BASE_URL;
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        URL url = new URL(baseUrl + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(15000);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Authorization", "Bearer " + BuildConfig.PRINTER_AGENT_TOKEN);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setDoOutput(true);

        byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(body);
        }

        int status = connection.getResponseCode();
        String responseText = readStream(status >= 400 ? connection.getErrorStream() : connection.getInputStream());
        connection.disconnect();
        if (status >= 400) {
            throw new IllegalStateException("HTTP " + status + " " + responseText);
        }
        return responseText.isEmpty() ? new JSONObject() : new JSONObject(responseText);
    }

    private String readStream(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private void printComanda(PrintJob job) {
        printer.initParams();
        printer.setPageFormat(0);
        printer.setTextSize(RECEIPT_TEXT_SIZE);
        printer.setAlignment(1);
        printer.setTextStyle(Typeface.BOLD);
        printer.printText("BELLY MONSTER BITES\n");
        printer.setTextSize(26);
        printer.printText("COMANDA\n");

        printer.setTextSize(RECEIPT_TEXT_SIZE);
        printer.setTextStyle(Typeface.NORMAL);
        printer.setAlignment(0);
        printLine();
        // tableId is the full header label from the server ("Mesa 4" / "Pick&Go").
        printer.printText(safePrinterText(job.tableId).toUpperCase(Locale.US) + "\n");
        if (!job.customerName.trim().isEmpty()) {
            printer.printText("CLIENTE: " + safePrinterText(job.customerName).toUpperCase(Locale.US) + "\n");
        }
        printer.setTextStyle(Typeface.BOLD);
        printer.setTextSize(30);
        printer.printText("#" + safePrinterText(job.shortCode).toUpperCase(Locale.US) + "\n");
        printer.setTextSize(RECEIPT_TEXT_SIZE);
        printer.setTextStyle(Typeface.NORMAL);
        printLine();
        printer.printText(nowLabel() + "\n");
        printer.printText("DESTINO: " + safePrinterText(job.destinationLabel) + "\n");
        printLine();
        printer.printText("ITEMS\n");

        for (PrintJobItem item : job.items) {
            printer.printText("\n");
            printer.setTextStyle(Typeface.BOLD);
            printer.printText(item.quantity + "x ");
            printer.setTextStyle(Typeface.NORMAL);
            printWrapped(safePrinterText(item.name).toUpperCase(Locale.US), 3);
            for (PrintJobModifier modifier : item.modifiers) {
                printer.setTextStyle(Typeface.NORMAL);
                printWrapped("- " + printableModifierLabel(modifier), 5);
            }
            if (!item.note.trim().isEmpty()) {
                printer.setTextStyle(Typeface.BOLD);
                printWrapped("* " + safePrinterText(item.note), 3);
                printer.setTextStyle(Typeface.NORMAL);
            }
        }

        printLine();
        printer.setAlignment(1);
        printer.printText("FIN COMANDA\n");
        printer.setAlignment(0);
        printLine();
        printer.printAndFeedPaper(120);
        try {
            printer.partialCut();
            log(SentryLogLevel.INFO, "printer_partial_cut_invoked", "Partial cut invoked for " + job.id);
        } catch (Exception cutError) {
            log(SentryLogLevel.WARN, "printer_cut_failed", "Comanda printed but cut failed: " + cutError.getMessage());
        }
    }

    private void printWrapped(String text, int indentSpaces) {
        String indent = spaces(indentSpaces);
        int width = Math.max(12, RECEIPT_LINE_WIDTH - indentSpaces);
        String[] words = text.trim().split("\\s+");
        StringBuilder line = new StringBuilder();

        for (String word : words) {
            if (word.isEmpty()) {
                continue;
            }
            if (line.length() > 0 && line.length() + 1 + word.length() > width) {
                printer.printText(indent + line + "\n");
                line.setLength(0);
            }
            if (line.length() > 0) {
                line.append(' ');
            }
            line.append(word);
        }
        if (line.length() > 0) {
            printer.printText(indent + line + "\n");
        }
    }

    private void printLine() {
        printer.printText("--------------------------------\n");
    }

    private String printableModifierLabel(PrintJobModifier modifier) {
        String group = safePrinterText(modifier.groupName);
        String option = safePrinterText(modifier.optionName);
        String normalizedGroup = group.toLowerCase(Locale.US);
        if (group.isEmpty() || normalizedGroup.contains("tamano") || normalizedGroup.contains("tamaño")) {
            return option;
        }
        return group + ": " + option;
    }

    private String safePrinterText(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^\\x20-\\x7E]", "").trim();
    }

    private String spaces(int count) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < count; i += 1) {
            builder.append(' ');
        }
        return builder.toString();
    }

    private String nowLabel() {
        return new SimpleDateFormat("dd MMM yyyy  HH:mm", Locale.US).format(new Date());
    }

    private String stableDeviceId() {
        SharedPreferences preferences = getSharedPreferences("printer-agent", MODE_PRIVATE);
        String existing = preferences.getString("deviceId", "");
        if (existing != null && !existing.isEmpty()) {
            return existing;
        }
        String generated = "imin-" + UUID.randomUUID();
        preferences.edit().putString("deviceId", generated).apply();
        return generated;
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

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private Notification notification(String title, String text) {
        ensureNotificationChannel();
        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return builder
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }

    private void updateNotification(String title, String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, notification(title, text));
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < 26) {
            return;
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Belly printer agent",
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps Belly commandas printing on the kiosk.");
        manager.createNotificationChannel(channel);
    }

    private void log(SentryLogLevel level, String event, String message) {
        JSONObject attributes = new JSONObject();
        try {
            attributes.put("app", "belly-monster-bites");
            attributes.put("component", "native-imin-printer-agent");
            attributes.put("event", event);
            attributes.put("device.id", deviceId == null ? "" : deviceId);
            attributes.put("sequence", sequence.incrementAndGet());
            attributes.put("android.sdk_int", Build.VERSION.SDK_INT);
            attributes.put("android.release", Build.VERSION.RELEASE);
            attributes.put("device.manufacturer", Build.MANUFACTURER);
            attributes.put("device.model", Build.MODEL);
            attributes.put("printer.connect_type", "USB");
            attributes.put("printer.initialized", printerInitialized);
            attributes.put("printer.status", safePrinterStatusCode());
        } catch (Exception ignored) {
        }

        try {
            Sentry.logger().log(
                    level,
                    SentryLogParameters.create(SentryAttributes.fromMap(JsonMaps.toMap(attributes))),
                    "[printer-agent] " + message
            );
        } catch (Exception ignored) {
        }
    }

    private static class PrintJobClaim {
        final PrintJob job;
        final String claimToken;

        PrintJobClaim(PrintJob job, String claimToken) {
            this.job = job;
            this.claimToken = claimToken;
        }
    }

    private static class PrintJob {
        final String id;
        final String shortCode;
        final String tableId;
        final String customerName;
        final String destinationLabel;
        final List<PrintJobItem> items;

        PrintJob(String id, String shortCode, String tableId, String customerName, String destinationLabel, List<PrintJobItem> items) {
            this.id = id;
            this.shortCode = shortCode;
            this.tableId = tableId;
            this.customerName = customerName;
            this.destinationLabel = destinationLabel;
            this.items = items;
        }

        static PrintJob fromJson(JSONObject json) {
            List<PrintJobItem> items = new ArrayList<>();
            JSONArray array = json.optJSONArray("items");
            if (array != null) {
                for (int i = 0; i < array.length(); i += 1) {
                    JSONObject item = array.optJSONObject(i);
                    if (item != null) {
                        items.add(PrintJobItem.fromJson(item));
                    }
                }
            }
            return new PrintJob(
                    json.optString("id", ""),
                    json.optString("shortCode", ""),
                    json.optString("tableId", ""),
                    json.optString("customerName", ""),
                    json.optString("destinationLabel", ""),
                    items
            );
        }
    }

    private static class PrintJobItem {
        final String name;
        final int quantity;
        final List<PrintJobModifier> modifiers;
        final String note;

        PrintJobItem(String name, int quantity, List<PrintJobModifier> modifiers, String note) {
            this.name = name;
            this.quantity = quantity;
            this.modifiers = modifiers;
            this.note = note;
        }

        static PrintJobItem fromJson(JSONObject json) {
            List<PrintJobModifier> modifiers = new ArrayList<>();
            JSONArray array = json.optJSONArray("modifiers");
            if (array != null) {
                for (int i = 0; i < array.length(); i += 1) {
                    JSONObject modifier = array.optJSONObject(i);
                    if (modifier != null) {
                        modifiers.add(PrintJobModifier.fromJson(modifier));
                    }
                }
            }
            return new PrintJobItem(
                    json.optString("name", ""),
                    Math.max(1, json.optInt("quantity", 1)),
                    modifiers,
                    json.optString("note", "")
            );
        }
    }

    private static class PrintJobModifier {
        final String groupName;
        final String optionName;

        PrintJobModifier(String groupName, String optionName) {
            this.groupName = groupName;
            this.optionName = optionName;
        }

        static PrintJobModifier fromJson(JSONObject json) {
            return new PrintJobModifier(
                    json.optString("groupName", ""),
                    json.optString("optionName", "")
            );
        }
    }

    private static class JsonMaps {
        static Map<String, Object> toMap(JSONObject json) {
            Map<String, Object> map = new HashMap<>();
            Iterator<String> keys = json.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                map.put(key, json.opt(key));
            }
            return map;
        }
    }
}
