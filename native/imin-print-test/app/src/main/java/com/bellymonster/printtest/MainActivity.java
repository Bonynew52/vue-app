package com.bellymonster.printtest;

import android.app.Activity;
import android.graphics.Typeface;
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
import java.util.Locale;

public class MainActivity extends Activity {
    private final PrinterHelper printer = PrinterHelper.getInstance();
    private TextView statusView;
    private Button printButton;
    private boolean serviceConnected;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(buildContentView());
        initPrinterService();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            printer.deInitPrinterService(this);
        } catch (Exception ignored) {
            // Some iMin builds throw while unbinding if the service was never connected.
        }
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
        log("Binding to iMin printer service...");

        boolean requested = printer.initPrinterService(getApplicationContext(), new InitPrinterCallback() {
            @Override
            public void onConnected() {
                runOnUiThread(() -> {
                    serviceConnected = true;
                    printButton.setEnabled(true);
                    log("Printer service connected.");
                    log("SDK version: " + safeSdkVersion());
                    log("Service version: " + safeServiceVersion());
                    log("Initial printer status: " + safePrinterStatus());
                    log("Tap the button to send one tiny receipt.");
                });
            }

            @Override
            public void onDisconnected() {
                runOnUiThread(() -> {
                    serviceConnected = false;
                    printButton.setEnabled(false);
                    log("Printer service disconnected.");
                });
            }
        });

        log("Service bind requested: " + requested);
        printButton.postDelayed(() -> {
            if (!serviceConnected) {
                printButton.setEnabled(true);
                log("Service did not report connected yet. Button enabled anyway to test direct SDK behavior.");
            }
        }, 2500);
    }

    private void printNativeTest() {
        printButton.setEnabled(false);
        log("Starting print test...");

        new Thread(() -> {
            try {
                String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());

                printer.initPrinterParams();
                printer.setPageFormat(0);
                printer.setFontBold(true);
                printer.printTextWithAli("BELLY MONSTER BITES\n", 1, callback("title"));
                printer.setFontBold(false);
                printer.printTextWithAli("Native iMin print test\n", 1, callback("subtitle"));
                printer.printText("--------------------------------\n", callback("divider"));
                printer.printText("If this printed, third-party native code can reach the kiosk printer.\n", callback("body"));
                printer.printText("Time: " + timestamp + "\n", callback("time"));
                printer.printText("App: com.bellymonster.printtest\n", callback("app"));
                printer.printText("--------------------------------\n\n", callback("end"));
                printer.printAndFeedPaper(80);

                runOnUiThread(() -> {
                    log("Print commands sent. If paper came out, the native bridge path is viable.");
                    printButton.setEnabled(true);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    log("Print failed: " + error.getClass().getSimpleName() + ": " + error.getMessage());
                    printButton.setEnabled(true);
                });
            }
        }, "imin-print-test").start();
    }

    private INeoPrinterCallback callback(String label) {
        return new INeoPrinterCallback() {
            @Override
            public void onRunResult(boolean success) throws RemoteException {
                logFromCallback(label + " runResult=" + success);
            }

            @Override
            public void onReturnString(String value) throws RemoteException {
                logFromCallback(label + " return=" + value);
            }

            @Override
            public void onRaiseException(int code, String message) throws RemoteException {
                logFromCallback(label + " exception=" + code + " " + message);
            }

            @Override
            public void onPrintResult(int code, String message) throws RemoteException {
                logFromCallback(label + " printResult=" + code + " " + message);
            }
        };
    }

    private void logFromCallback(String message) {
        runOnUiThread(() -> log(message));
    }

    private void log(String message) {
        String existing = statusView.getText().toString();
        String line = "[" + timeOnly() + "] " + message;
        statusView.setText(existing.isEmpty() ? line : existing + "\n" + line);
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
