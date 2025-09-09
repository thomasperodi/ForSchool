package it.skoolly.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import it.skoolly.app.AlarmActivity;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "FCMService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Log.d(TAG, "Messaggio ricevuto: " + remoteMessage.getData());

        String title = "Nuova notifica";
        String body = "";
        String type = "";

        // Se la notifica contiene titolo e body
        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null) {
                title = remoteMessage.getNotification().getTitle();
            }
            if (remoteMessage.getNotification().getBody() != null) {
                body = remoteMessage.getNotification().getBody();
            }
        }

        // Se arrivano dati extra
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Dati extra: " + remoteMessage.getData());
            if (remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
            if (remoteMessage.getData().containsKey("type")) {
                type = remoteMessage.getData().get("type");
            }
        }

        // Se il tipo di notifica è "alarm", lancia una Full-Screen Intent
        // Altrimenti, mostra una notifica standard.
        if ("alarm".equals(type)) {
            sendAlarmNotification(title, body);
        } else {
            sendStandardNotification(title, body);
        }
    }

    private void sendStandardNotification(String title, String body) {
        String STANDARD_CHANNEL_ID = "default_channel";
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    STANDARD_CHANNEL_ID,
                    "Notifiche Skoolly",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Canale notifiche generali di Skoolly");
            notificationManager.createNotificationChannel(channel);
        }

        // Intent per aprire l'app quando si clicca la notifica standard
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                        ? PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
                        : PendingIntent.FLAG_ONE_SHOT
        );

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, STANDARD_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        notificationManager.notify((int) System.currentTimeMillis(), notificationBuilder.build());
    }

    private void sendAlarmNotification(String title, String body) {
        String ALARM_CHANNEL_ID = "alarm_channel";
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    ALARM_CHANNEL_ID,
                    "Notifiche di allarme",
                    NotificationManager.IMPORTANCE_MAX // Usiamo IMPORTANCE_MAX per la massima priorità
            );
            channel.setDescription("Canale per le notifiche ad alta priorità (allarme)");
            notificationManager.createNotificationChannel(channel);
        }

        // Intent per l'AlarmActivity (per il full-screen intent)
        Intent fullScreenIntent = new Intent(this, AlarmActivity.class);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        fullScreenIntent.putExtra("notification_title", title);
        fullScreenIntent.putExtra("notification_body", body);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this,
                0,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Costruzione della notifica con l'intent a schermo intero
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, ALARM_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true);

        // Mostra la notifica
        notificationManager.notify((int) System.currentTimeMillis(), notificationBuilder.build());
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Nuovo FCM token: " + token);
        // TODO: Invia questo token al tuo backend per salvare l’associazione utente-dispositivo
    }
}
