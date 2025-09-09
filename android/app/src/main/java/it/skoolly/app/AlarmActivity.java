package it.skoolly.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Button;

import androidx.annotation.Nullable;

public class AlarmActivity extends Activity {

    private static final String TAG = "AlarmActivity";
    private Ringtone ringtone;
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_alarm);

        Log.d(TAG, "AlarmActivity avviata.");

        // Acquisiamo un WakeLock per forzare l'accensione dello schermo
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP, "it.skoolly.app:alarm_wakelock");
            wakeLock.acquire(10 * 60 * 1000L /*10 minuti*/); // Durata del WakeLock
            Log.d(TAG, "WakeLock acquisito.");
        }

        // Flag per mostrare l'Activity anche a schermo bloccato e accendere lo schermo
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);

        TextView titleTextView = findViewById(R.id.alarm_title);
        TextView bodyTextView = findViewById(R.id.alarm_body);
        Button dismissButton = findViewById(R.id.dismiss_button);

        String title = getIntent().getStringExtra("notification_title");
        String body = getIntent().getStringExtra("notification_body");

        titleTextView.setText(title);
        bodyTextView.setText(body);

        // Suona un allarme (opzionale)
        try {
            Uri notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            ringtone = RingtoneManager.getRingtone(getApplicationContext(), notificationUri);
            if (ringtone != null) {
                ringtone.play();
                Log.d(TAG, "Allarme in riproduzione.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Errore nella riproduzione dell'allarme", e);
        }


        dismissButton.setOnClickListener(v -> {
            finish();
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock rilasciato.");
        }
    }
}
