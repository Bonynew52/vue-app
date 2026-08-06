package com.bellymonster.printtest;

import android.content.Context;
import android.content.SharedPreferences;

final class AppConfig {
    private static final String PREFS = "printer-agent";
    private static final String KEY_BACKEND_URL = "backendUrl";
    private static final String KEY_AGENT_TOKEN = "agentToken";

    private AppConfig() {
    }

    static String backendUrl(Context context) {
        String saved = preferences(context).getString(KEY_BACKEND_URL, "");
        if (saved != null && !saved.trim().isEmpty()) {
            return saved.trim();
        }
        return BuildConfig.CONVEX_HTTP_BASE_URL == null ? "" : BuildConfig.CONVEX_HTTP_BASE_URL.trim();
    }

    static String agentToken(Context context) {
        String saved = preferences(context).getString(KEY_AGENT_TOKEN, "");
        if (saved != null && !saved.trim().isEmpty()) {
            return saved.trim();
        }
        return BuildConfig.PRINTER_AGENT_TOKEN == null ? "" : BuildConfig.PRINTER_AGENT_TOKEN.trim();
    }

    static void save(Context context, String backendUrl, String agentToken) {
        preferences(context)
                .edit()
                .putString(KEY_BACKEND_URL, backendUrl == null ? "" : backendUrl.trim())
                .putString(KEY_AGENT_TOKEN, agentToken == null ? "" : agentToken.trim())
                .apply();
    }

    static String maskedToken(Context context) {
        String token = agentToken(context);
        if (token.isEmpty()) {
            return "missing";
        }
        if (token.length() <= 8) {
            return "set (" + token.length() + " chars)";
        }
        return "set (" + token.substring(0, 4) + "..." + token.substring(token.length() - 4) + ")";
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
