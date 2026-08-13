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
import android.util.Log;

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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

public class PrinterAgentService extends Service {
    public static final String ACTION_START = "com.bellymonster.printtest.START_AGENT";
    public static final String ACTION_STOP = "com.bellymonster.printtest.STOP_AGENT";

    private static final int NOTIFICATION_ID = 4201;
    private static final String CHANNEL_ID = "belly_printer_agent";
    private static final long POLL_INTERVAL_MS = 3000L;
    private static final long AFTER_PRINT_COOLDOWN_MS = 1500L;
    private static final int MAX_HANDLED_JOB_IDS = 80;
    private static final int RECEIPT_TEXT_SIZE = 26;
    private static final int RECEIPT_LINE_WIDTH = 32;
    private static final long PRINT_LINE_PAUSE_MS = 220L;
    private static final long PRINT_FINAL_SETTLE_MS = 700L;
    private static final String PREFS_NAME = "printer-agent";
    private static final String HANDLED_JOB_IDS_KEY = "handledPrintJobIds";

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
        log(Log.INFO, "service_create", "Printer agent service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopAgent();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, notification("Belly printer active", "Waiting for texts and commandas"));
        startAgent();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopAgent();
        log(Log.INFO, "service_destroy", "Printer agent service destroyed");
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
        log(Log.INFO, "agent_started", "Printer agent started");
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
            log(Log.WARN, "printer_disconnect_failed", "Printer disconnect failed: " + error.getMessage());
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
                    TextPrintJobClaim textClaim = claimNextTextPrintJob();
                    if (textClaim.job == null) {
                        sleep(POLL_INTERVAL_MS);
                        continue;
                    }

                    log(Log.INFO, "text_print_job_claimed", "Claimed text " + textClaim.job.id + " for " + textClaim.job.label);
                    updateNotification("Printing DM text", textClaim.job.label + " Â· #" + textClaim.job.code);

                    if (wasHandledLocally(textClaim.job.id)) {
                        completeTextPrintJob(textClaim, true, "Already handled locally; skipped duplicate paper print.");
                        log(Log.WARN, "text_print_job_duplicate_skipped", "Skipped duplicate paper print for " + textClaim.job.id);
                        updateNotification("Duplicate skipped", "#" + textClaim.job.code + " already handled");
                        sleep(AFTER_PRINT_COOLDOWN_MS);
                        continue;
                    }

                    boolean paperWasPrinted = false;
                    try {
                        printTextJob(textClaim.job);
                        paperWasPrinted = true;
                        rememberHandledLocally(textClaim.job.id);
                        completeTextPrintJob(textClaim, true, "");
                        log(Log.INFO, "text_print_job_completed", "Printed text " + textClaim.job.id);
                        updateNotification("Belly printer active", "Last printed text #" + textClaim.job.code);
                        sleep(AFTER_PRINT_COOLDOWN_MS);
                    } catch (Exception printError) {
                        if (paperWasPrinted) {
                            log(Log.ERROR, "text_print_complete_failed_after_paper", "Paper printed but completion failed for text " + textClaim.job.id + ": " + printError.getMessage());
                            updateNotification("Printed, sync failed", "#" + textClaim.job.code + " needs review");
                        } else {
                            completeTextPrintJob(textClaim, false, printError.getClass().getSimpleName() + ": " + printError.getMessage());
                            log(Log.ERROR, "text_print_job_failed", "Text print failed for " + textClaim.job.id + ": " + printError.getMessage());
                            updateNotification("Text print failed", "#" + textClaim.job.code + " needs attention");
                        }
                    }
                    continue;
                }

                log(Log.INFO, "print_job_claimed", "Claimed comanda " + claim.job.id + " for " + claim.job.destinationLabel);
                // tableId arrives as a full label ("Mesa 4" / "Pick&Go"); no prefix here.
                updateNotification("Printing comanda", claim.job.tableId + " · #" + claim.job.shortCode);

                if (wasHandledLocally(claim.job.id)) {
                    completePrintJob(claim, true, "Already handled locally; skipped duplicate paper print.");
                    log(Log.WARN, "print_job_duplicate_skipped", "Skipped duplicate paper print for " + claim.job.id);
                    updateNotification("Duplicate skipped", "#" + claim.job.shortCode + " already handled");
                    sleep(AFTER_PRINT_COOLDOWN_MS);
                    continue;
                }

                boolean paperWasPrinted = false;
                try {
                    printComanda(claim.job);
                    paperWasPrinted = true;
                    rememberHandledLocally(claim.job.id);
                    completePrintJob(claim, true, "");
                    log(Log.INFO, "print_job_completed", "Printed comanda " + claim.job.id);
                    updateNotification("Belly printer active", "Last printed #" + claim.job.shortCode);
                    sleep(AFTER_PRINT_COOLDOWN_MS);
                } catch (Exception printError) {
                    if (paperWasPrinted) {
                        log(Log.ERROR, "print_complete_failed_after_paper", "Paper printed but completion failed for " + claim.job.id + ": " + printError.getMessage());
                        updateNotification("Printed, sync failed", "#" + claim.job.shortCode + " needs review");
                    } else {
                        completePrintJob(claim, false, printError.getClass().getSimpleName() + ": " + printError.getMessage());
                        log(Log.ERROR, "print_job_failed", "Print failed for " + claim.job.id + ": " + printError.getMessage());
                        updateNotification("Print failed", "#" + claim.job.shortCode + " needs attention");
                    }
                }
            } catch (Exception error) {
                log(Log.ERROR, "agent_loop_error", "Printer agent loop error: " + error.getClass().getSimpleName() + ": " + error.getMessage());
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
        log(Log.INFO, "printer_initialized", "USB printer initialized. Status: " + safePrinterStatusCode());
    }

    private PrintJobClaim claimNextPrintJob() throws Exception {
        JSONObject request = new JSONObject();
        request.put("deviceId", deviceId);
        JSONObject response = postJson("/printer/claim-next", request);
        JSONObject job = response.optJSONObject("job");
        String claimToken = response.optString("claimToken", "");
        return new PrintJobClaim(job == null ? null : PrintJob.fromJson(job), claimToken);
    }

    private TextPrintJobClaim claimNextTextPrintJob() throws Exception {
        JSONObject request = new JSONObject();
        request.put("deviceId", deviceId);
        JSONObject response = postJson("/text-printer/claim-next", request);
        JSONObject job = response.optJSONObject("job");
        String claimToken = response.optString("claimToken", "");
        return new TextPrintJobClaim(job == null ? null : TextPrintJob.fromJson(job), claimToken);
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

    private void completeTextPrintJob(TextPrintJobClaim claim, boolean success, String errorMessage) throws Exception {
        JSONObject request = new JSONObject();
        request.put("deviceId", deviceId);
        request.put("textPrintJobId", claim.job.id);
        request.put("claimToken", claim.claimToken);
        request.put("success", success);
        request.put("errorMessage", errorMessage == null ? "" : errorMessage);
        postJson("/text-printer/complete", request);
    }

    private JSONObject postJson(String path, JSONObject payload) throws Exception {
        String baseUrl = AppConfig.backendUrl(this);
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        if (baseUrl.isEmpty()) {
            throw new IllegalStateException("Missing backend URL. Open Config and set Backend.");
        }
        String token = AppConfig.agentToken(this);
        if (token.isEmpty()) {
            throw new IllegalStateException("Missing printer token. Open Config and set token.");
        }

        URL url = new URL(baseUrl + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(15000);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Authorization", "Bearer " + token);
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
        printer.setAlignment(0);
        printer.setTextStyle(Typeface.NORMAL);

        StringBuilder ticket = new StringBuilder();
        ticket.append("BELLY MONSTER BITES\n");
        ticket.append("COMANDA AVISOS LOCAL\n");
        appendLine(ticket);
        ticket.append("NOMBRE: ").append(customerLabel(job)).append("\n");
        ticket.append("#").append(safePrinterText(job.shortCode).toUpperCase(Locale.US)).append("\n");
        appendLine(ticket);
        ticket.append(nowLabel()).append("\n");
        appendLine(ticket);

        for (PrintJobItem item : job.items) {
            if (isTextOnlyItem(item)) {
                appendMultilineWrapped(ticket, item.note, 0);
            } else {
                ticket.append("\n");
                appendWrapped(ticket, item.quantity + "x " + safePrinterText(item.name).toUpperCase(Locale.US), 0);
                for (PrintJobModifier modifier : item.modifiers) {
                    appendWrapped(ticket, "- " + printableModifierLabel(modifier), 3);
                }
                if (!item.note.trim().isEmpty()) {
                    appendNote(ticket, item.note, 3);
                }
            }
        }

        appendLine(ticket);
        ticket.append("FIN COMANDA\n");
        appendLine(ticket);

        printTicketSafely(ticket.toString());
        printer.printAndFeedPaper(120);
        try {
            printer.partialCut();
            log(Log.INFO, "printer_partial_cut_invoked", "Partial cut invoked for " + job.id);
        } catch (Exception cutError) {
            log(Log.WARN, "printer_cut_failed", "Comanda printed but cut failed: " + cutError.getMessage());
        }
    }

    private void printTextJob(TextPrintJob job) {
        printer.initParams();
        printer.setPageFormat(0);
        printer.setTextSize(RECEIPT_TEXT_SIZE);
        printer.setAlignment(0);
        printer.setTextStyle(Typeface.NORMAL);

        StringBuilder ticket = new StringBuilder();
        ticket.append("BELLY MONSTER BITES\n");
        ticket.append("COMANDA AVISOS LOCAL\n");
        appendLine(ticket);
        ticket.append("NOMBRE: ").append(safePrinterText(job.label).toUpperCase(Locale.US)).append("\n");
        ticket.append("#").append(safePrinterText(job.code).toUpperCase(Locale.US)).append("\n");
        appendLine(ticket);
        ticket.append(nowLabel()).append("\n");
        appendLine(ticket);
        appendMultilineWrapped(ticket, job.text, 0);
        appendLine(ticket);
        ticket.append("FIN TEXTO\n");
        appendLine(ticket);

        printTicketSafely(ticket.toString());
        printer.printAndFeedPaper(120);
        try {
            printer.partialCut();
            log(Log.INFO, "text_printer_partial_cut_invoked", "Partial cut invoked for text " + job.id);
        } catch (Exception cutError) {
            log(Log.WARN, "text_printer_cut_failed", "Text printed but cut failed: " + cutError.getMessage());
        }
    }

    private String customerLabel(PrintJob job) {
        String customerName = safePrinterText(job.customerName);
        if (!customerName.isEmpty()) {
            return customerName.toUpperCase(Locale.US);
        }
        String tableId = safePrinterText(job.tableId).replaceFirst("(?i)^mesa\\s+", "");
        return tableId.toUpperCase(Locale.US);
    }

    private void printTicketSafely(String ticket) {
        String normalized = ticket.replace("\r\n", "\n").replace('\r', '\n');
        String[] lines = normalized.split("\n", -1);
        for (String line : lines) {
            printer.printText(line + "\n");
            sleep(PRINT_LINE_PAUSE_MS);
        }
        sleep(PRINT_FINAL_SETTLE_MS);
    }

    private boolean isTextOnlyItem(PrintJobItem item) {
        return item.modifiers.isEmpty()
                && !item.note.trim().isEmpty()
                && safePrinterText(item.name).equalsIgnoreCase("Texto libre");
    }

    private void appendMultilineWrapped(StringBuilder builder, String text, int indentSpaces) {
        String cleaned = safePrinterBlockText(text);
        String[] lines = cleaned.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1);
        for (String line : lines) {
            appendWrapped(builder, line, indentSpaces);
        }
    }

    private void appendNote(StringBuilder builder, String text, int indentSpaces) {
        String cleaned = safePrinterBlockText(text);
        String[] lines = cleaned.split("\n", -1);
        for (String line : lines) {
            appendWrapped(builder, line.trim().isEmpty() ? "" : "* " + line, indentSpaces);
        }
    }

    private void appendWrapped(StringBuilder builder, String text, int indentSpaces) {
        String indent = spaces(indentSpaces);
        int width = Math.max(12, RECEIPT_LINE_WIDTH - indentSpaces);
        String[] words = text.trim().split("\\s+");
        StringBuilder line = new StringBuilder();

        for (String word : words) {
            if (word.isEmpty()) {
                continue;
            }
            if (line.length() > 0 && line.length() + 1 + word.length() > width) {
                builder.append(indent).append(line).append("\n");
                line.setLength(0);
            }
            if (line.length() > 0) {
                line.append(' ');
            }
            line.append(word);
        }
        if (line.length() > 0) {
            builder.append(indent).append(line).append("\n");
        } else if (text.isEmpty()) {
            builder.append("\n");
        }
    }

    private void appendLine(StringBuilder builder) {
        builder.append("--------------------------------\n");
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

    private String safePrinterBlockText(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[^\\x20-\\x7E\\n]", "")
                .trim();
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
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String existing = preferences.getString("deviceId", "");
        if (existing != null && !existing.isEmpty()) {
            return existing;
        }
        String generated = "imin-" + UUID.randomUUID();
        preferences.edit().putString("deviceId", generated).apply();
        return generated;
    }

    private boolean wasHandledLocally(String printJobId) {
        if (printJobId == null || printJobId.trim().isEmpty()) {
            return false;
        }
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        Set<String> handled = preferences.getStringSet(HANDLED_JOB_IDS_KEY, new LinkedHashSet<>());
        return handled != null && handled.contains(printJobId);
    }

    private void rememberHandledLocally(String printJobId) {
        if (printJobId == null || printJobId.trim().isEmpty()) {
            return;
        }
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        Set<String> existing = preferences.getStringSet(HANDLED_JOB_IDS_KEY, new LinkedHashSet<>());
        LinkedHashSet<String> handled = new LinkedHashSet<>(existing == null ? new LinkedHashSet<>() : existing);
        handled.remove(printJobId);
        handled.add(printJobId);

        while (handled.size() > MAX_HANDLED_JOB_IDS) {
            String first = handled.iterator().next();
            handled.remove(first);
        }

        preferences.edit().putStringSet(HANDLED_JOB_IDS_KEY, handled).apply();
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

    private void log(int level, String event, String message) {
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

        Log.println(level, "BellyPrinterAgent", event + " · " + message + " · " + attributes);
    }

    private static class PrintJobClaim {
        final PrintJob job;
        final String claimToken;

        PrintJobClaim(PrintJob job, String claimToken) {
            this.job = job;
            this.claimToken = claimToken;
        }
    }

    private static class TextPrintJobClaim {
        final TextPrintJob job;
        final String claimToken;

        TextPrintJobClaim(TextPrintJob job, String claimToken) {
            this.job = job;
            this.claimToken = claimToken;
        }
    }

    private static class TextPrintJob {
        final String id;
        final String code;
        final String label;
        final String text;

        TextPrintJob(String id, String code, String label, String text) {
            this.id = id;
            this.code = code;
            this.label = label;
            this.text = text;
        }

        static TextPrintJob fromJson(JSONObject json) {
            return new TextPrintJob(
                    json.optString("id", ""),
                    json.optString("code", ""),
                    json.optString("label", ""),
                    json.optString("text", "")
            );
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

}
