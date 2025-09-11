"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  RegistrationError,
  Token,
} from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";




export default function HomePage() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    user_metadata?: { full_name?: string; avatar_url?: string; hasSubscription?: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);



  useEffect(() => {

    const init = async () => {

      const tokenKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`;

      // ✅ Legge il token su Capacitor / fallback null
      let token: string | null = null;

try {
  token = await SecureStoragePlugin.get({ key: tokenKey }).then(res => res.value);
} catch (err: unknown) {
  // stampo l'errore in modo sicuro
  if (err instanceof Error) {
    console.warn("[CapacitorStorage] getItem errore, uso fallback localStorage:", err.message);
  } else {
    console.warn("[CapacitorStorage] getItem errore sconosciuto, uso fallback localStorage:", err);
  }
  token = localStorage.getItem(tokenKey) || null;
}

console.log(token )
// Se non c'è token → redirect a login
if (!token) {
  console.log("Token non trovato → redirect /login");
await fetch("/api/auth/logout", { method: "POST" });
router.push("/login");
  return; // ✅ uscita immediata, niente render del contenuto
}

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.log("Nessun utente autenticato, reindirizzamento a /login");
        router.push("/login");
        setLoading(false);
        return;
      }

      // Verifica che l'utente abbia i dati necessari
      if (!userData.user.email) {
        console.log("Utente senza email, reindirizzamento a /login");
        router.push("/login");
        setLoading(false);
        return;
      }

      setUser({
        id: userData.user.id,
        email: userData.user.email,
        user_metadata: userData.user.user_metadata,
      });

      // Check subscription
      const { data: subData, error: subError } = await supabase
        .from("abbonamenti")
        .select("stato")
        .eq("utente_id", userData.user.id)
        .eq("stato", "active")
        .single();

      if (subError || !subData || subData.stato !== "active") {
        setIsSubscribed(false);
      } else {
        setIsSubscribed(true);
      }

      setLoading(false);
    };

    init();

  }, [router]);


useEffect(() => {
  if (!user || Capacitor.getPlatform() === "web") return;

  const registerPush = async () => {
    console.log("🔔 Avvio registrazione push per", Capacitor.getPlatform());

    try {
      // 1. Richiesta permessi
      const perm = await PushNotifications.requestPermissions();
      console.log("📌 Stato permessi notifiche:", perm);

      if (perm.receive !== "granted") {
        toast.error("Permessi notifiche non concessi");
        return;
      }

      // 2. Registrazione a push
      await PushNotifications.register();
      console.log("✅ Richiesta registrazione push inviata");

      // 3. Listener: registrazione avvenuta
      PushNotifications.addListener("registration", async ({ value: apnsToken }) => {
        console.log("📲 APNs token ricevuto:", apnsToken);

        try {
          // Ottieni anche il token FCM da Firebase
          const { token: fcmToken } = await FirebaseMessaging.getToken();
          console.log("🔥 FCM token ricevuto:", fcmToken);

          // Salva su backend
          const res = await fetch("/api/save-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apns_token: apnsToken,
              fcm_token: fcmToken,
              user_id: user.id,
              platform: Capacitor.getPlatform(),
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("❌ Errore salvataggio token:", data);
          } else {
            console.log("✅ Token salvato su Supabase:", data);
          }
        } catch (err) {
          console.error("❌ Errore ottenimento/salvataggio FCM token:", err);
        }
      });

      // 4. Listener: errore registrazione
      PushNotifications.addListener("registrationError", (err) => {
        console.error("❌ Errore registrazione push:", JSON.stringify(err));
      });

      // 5. Listener: ricezione push in foreground
      PushNotifications.addListener("pushNotificationReceived", (notif) => {
        console.log("📩 Push ricevuta:", notif);
        toast.success(notif.title ?? "Nuova notifica");
      });

      // 6. Listener: azione su notifica
      PushNotifications.addListener("pushNotificationActionPerformed", (action) =>
        console.log("👉 Azione notifica:", action)
      );

    } catch (err) {
      console.error("❌ Errore generale in registerPush:", err);
    }
  };

  registerPush();
}, [user]);




  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-64 bg-gray-200 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full px-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />
            ))}
        </div>
      </div>
    );
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email || "Studente";

  return (
    <div className="px-4 md:px-8">
      <h1 className="text-3xl font-bold text-[#1e293b] mb-6 text-center min-h-[80px]">
        Ciao {firstName}! <br /> Benvenuto nella tua area personale!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <FeatureCard
          title="Promozioni"
          description="Scopri le promozioni e gli sconti disponibili per te."
          href="/promozioni"
          emoji="🎁"
        />
        <FeatureCard
          title="Eventi"
          description="Prenota e partecipa agli eventi della scuola e della community."
          href="/eventi"
          emoji="🎟️"
        />
        <FeatureCard
          title="Merchandising"
          description="Acquista il merchandising ufficiale della scuola e della community."
          href="/merchandising"
          emoji="👕"
        />
        <FeatureCard
          title="Ripetizioni"
          description="Trova tutor o offri il tuo aiuto agli altri studenti."
          href="/ripetizioni"
          emoji="📚"
        />
        <FeatureCard
          title="Marketplace"
          description="Compra e vendi libri, appunti e materiale scolastico."
          href={isSubscribed ? "/marketplace" : "#"}
          emoji="🛒"
          badgeText="Solo abbonamento"
          onClickDisabled={() => {
            if (!isSubscribed) toast.error("Devi avere un abbonamento per accedere al Marketplace");
          }}
        />
        <FeatureCard
          title="Altro in arrivo"
          description="Nuove funzionalità saranno disponibili presto!"
          href="#"
          emoji="🚀"
          disabled
        />
      </div>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
  href: string;
  emoji: string;
  badgeText?: string;
  disabled?: boolean;
  onClickDisabled?: () => void;
};

function FeatureCard({
  title,
  description,
  href,
  emoji,
  badgeText,
  disabled,
  onClickDisabled,
}: FeatureCardProps) {
  return (
    <div
      className={`relative rounded-xl shadow-lg bg-white p-6 flex flex-col items-start gap-3 border border-[#e0e7ef] ${
        disabled ? "opacity-60 pointer-events-none" : "hover:shadow-2xl transition"
      }`}
    >
     <div className="absolute top-3 right-3 flex items-center justify-center h-[24px]">
  {badgeText && (
    <span className="bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow whitespace-nowrap">
      {badgeText}
    </span>
  )}
</div>


      <div className="text-4xl">{emoji}</div>
      <h2 className="text-xl font-semibold text-[#1e293b]">{title}</h2>
      <p className="text-[#334155]">{description}</p>

      {!disabled && (
        <Link
          href={href}
          onClick={(e) => {
            if (href === "#" && onClickDisabled) {
              e.preventDefault();
              onClickDisabled();
            }
          }}
          className="mt-2 inline-block bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition"
        >
          Vai
        </Link>
      )}
    </div>
  );
}
