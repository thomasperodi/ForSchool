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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [toastShown, setToastShown] = useState(false); // traccia se il toast è già apparso
  const [token, setToken] = useState<string | null>(null);
  
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

      try {
        // Salvataggio token nel DB tramite API
        const res = await fetch('/api/save-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
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
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.push("/login");

        // Mostra il toast solo se non è stato mostrato prima
        if (!toastShown) {
          toast.error("Devi essere autenticato per accedere.");
          setToastShown(true);
        }

        setLoading(false);
        return;
      }

      setLoading(false);
    };

    checkUser();
  }, [router, toastShown]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Caricamento...
      </div>
    );
  }

  return (
    <SidebarProvider>
    <div className="min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#f1f5f9] to-[#34d399] px-0">
      <div className="hidden md:block">
        <NavbarAuth />
      </div>
      <div className="block md:hidden">
        <AppSidebar />
        <MobileHeader title={getTitleFromPath(pathname)} />
      </div>
      <main className="max-w-7xl mx-auto py-12 px-4">{children}</main>
    </div>
    </SidebarProvider>
  );
}
