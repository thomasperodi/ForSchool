"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import NavbarAuth from "@/components/NavbarAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/context/AuthContext"

export default function AuthLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter();
  const pathname = usePathname();
  const [toastShown, setToastShown] = useState(false); // traccia se il toast è già apparso
  const [token, setToken] = useState<string | null>(null);
  const { session, loading, isLoggingOut, logoutSuccess } = useAuth();
  
  const getTitleFromPath = (path: string | null) => {
  if (!path) return "";
  
  const firstSegment = path.split("/")[1]; // prende la prima parola dopo "/"
  if (!firstSegment) return "";

  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
};

useEffect(() => {
  if (Capacitor.isNativePlatform()) {
    // Richiesta permessi push
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    // Listener per la registrazione del token
    PushNotifications.addListener('registration', async token => {
      console.log('Push registration success, token: ', token.value);
      setToken(token.value);
      console.log("[AuthLayout] session user id" , session?.user.id)
      try {
        // Salvataggio token nel DB tramite API
        const res = await fetch('/api/save-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
            user_id: session?.user.id
            // puoi aggiungere user_id se disponibile
          }),
        });

        const data = await res.json();
        if (res.ok) {
          console.log('Token salvato correttamente:', data);
        } else {
          console.error('Errore salvataggio token:', data);
        }
      } catch (err) {
        console.error('Errore fetch API push-tokens:', err);
      }
    });

    PushNotifications.addListener('pushNotificationReceived', notification => {
  const title = notification.data?.title;
  const body = notification.data?.body;
  console.log('Notifica ricevuta in foreground:', title, body);

  // Qui puoi mostrare una notifica locale se vuoi:
  // CapacitorLocalNotifications.schedule({ ... })
});

    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      console.log('Push action performed: ', notification);
    });
  } else {
    console.log('PushNotifications are only available on native mobile platforms.');
  }
}, []);
useEffect(() => {
    console.log("--- useEffect di layout.tsx ---");
    console.log("Stato attuale:");
    console.log(`- loading: ${loading}`);
    console.log(`- session: ${session ? 'presente' : 'assente'}`);
    console.log(`- isLoggingOut: ${isLoggingOut}`);
    console.log(`- logoutSuccess: ${logoutSuccess}`);
    console.log(`- toastShown: ${toastShown}`);
    console.log("----------------------------------");

    if (!loading) {
      // Se non c'è sessione e non stiamo facendo logout E il logout non è stato un successo
      if (!session && !isLoggingOut && !logoutSuccess) {
        console.log("Condizione di reindirizzamento soddisfatta: !session && !isLoggingOut && !logoutSuccess");
        router.push("/login");
        if (!toastShown) {
          toast.error("Devi essere autenticato per accedere.");
          setToastShown(true);
          console.log("Toast di errore visualizzato.");
        }
      } else if (session && logoutSuccess) {
        // Reset del flag di logout success quando c'è una nuova sessione
        setToastShown(false);
      } else {
        console.log("Condizione di reindirizzamento non soddisfatta.");
      }
    } else {
      console.log("Attesa del caricamento (loading è true).");
    }
  }, [session, isLoggingOut, logoutSuccess, loading, router, toastShown]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Caricamento...
      </div>
    );
  }

  return (
    <SidebarProvider>
    <div className="min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#f1f5f9] to-[#34d399] px-0 ">
      <div className="hidden md:block">
        <NavbarAuth />
      </div>
      <div className="block md:hidden ">
        <AppSidebar />
        <MobileHeader title={getTitleFromPath(pathname)} />
      </div>
      <main className="max-w-7xl mx-auto py-12 px-4 main-content-safe">{children}</main>
    </div>
    </SidebarProvider>
  );
}
