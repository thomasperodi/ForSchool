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
  if (!user) return; // aspetta che user sia pronto
  if (Capacitor.getPlatform() === "web") return;

  console.log("Initializing Push Notifications");

  PushNotifications.requestPermissions().then((result) => {
    if (result.receive === "granted") {
      PushNotifications.register();
    } else {
      console.warn("Permessi notifiche non concessi");
    }
  });

  PushNotifications.addListener("registration", async (token: Token) => {
    console.log("Push registration success, token:", token.value);

    await fetch("/api/save-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token.value,
        user_id: user.id, // 👈 ora è sicuro
        platform: Capacitor.getPlatform(),
      }),
    });
  });

  PushNotifications.addListener("registrationError", (error: RegistrationError) => {
    console.error("Errore registrazione push:", error);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
    console.log("Push ricevuta:", notification);
    toast.success(`Notifica: ${notification.title ?? "Nuovo messaggio"}`);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (notification: ActionPerformed) => {
    console.log("Push action performed:", notification);
  });
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
