"use client";
import { useEffect, useState } from "react";
import { PushNotifications } from "@capacitor/push-notifications";

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔔 usePushNotifications hook initialized");

    // 👉 1. Aggiungi subito i listener
    PushNotifications.addListener("registration", (token) => {
      console.log("✅ Registrazione riuscita:", token.value);
      setToken(token.value);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("❌ Errore registrazione:", JSON.stringify(err));
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("📩 Notifica ricevuta:", JSON.stringify(notification));
    });

    // 👉 2. Poi chiedi i permessi
    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === "granted") {
        console.log("✅ Permessi notifiche concessi");
        PushNotifications.register();
      } else {
        console.warn("⚠️ Permessi notifiche negati");
      }
    });
  }, []);

  return { token };
}
