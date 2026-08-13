package com.bellymonster.printtest;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

final class PrinterTrace {
    private static final String PREFS = "printer-trace";
    private static final String KEY_LINES = "lines";
    private static final int MAX_CHARS = 18000;

    private PrinterTrace() {
    }

    static synchronized void append(Context context, String level, String step, String expected, String actual, String detail) {
        String line = "[" + timeOnly() + "] "
                + level + " " + step
                + "\n  esperado: " + clean(expected)
                + "\n  actual: " + clean(actual);
        if (detail != null && !detail.trim().isEmpty()) {
            line += "\n  detalle: " + clean(detail);
        }

        SharedPreferences preferences = preferences(context);
        String existing = preferences.getString(KEY_LINES, "");
        String next = existing == null || existing.isEmpty() ? line : existing + "\n" + line;
        if (next.length() > MAX_CHARS) {
            next = next.substring(next.length() - MAX_CHARS);
            int firstBreak = next.indexOf("\n[");
            if (firstBreak >= 0) {
                next = next.substring(firstBreak + 1);
            }
        }
        preferences.edit().putString(KEY_LINES, next).apply();
    }

    static synchronized String read(Context context) {
        String lines = preferences(context).getString(KEY_LINES, "");
        return lines == null || lines.isEmpty() ? "Terminal sin eventos todavia." : lines;
    }

    static synchronized void clear(Context context) {
        preferences(context).edit().remove(KEY_LINES).apply();
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String clean(String value) {
        return value == null || value.trim().isEmpty() ? "-" : value.replace("\r", " ").trim();
    }

    private static String timeOnly() {
        return new SimpleDateFormat("HH:mm:ss", Locale.US).format(new Date());
    }
}
