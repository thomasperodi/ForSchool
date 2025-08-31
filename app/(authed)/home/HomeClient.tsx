"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import toast from "react-hot-toast";

export default function HomePage() {
  const [user, setUser] = useState<{ 
    id: string; 
    email: string; 
    user_metadata?: { full_name?: string; avatar_url?: string; hasSubscription?: boolean } 
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/login");
        setLoading(false);
        return;
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          user_metadata: data.user.user_metadata,
        });
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

   useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from("abbonamenti")
        .select("stato")
        .eq("utente_id", user.id)
        .eq("stato", "active")
        .single();

      if (error || !data || data.stato !== "active") {
        setIsSubscribed(false);
      } else {
        setIsSubscribed(true);
      }
    };

    fetchSubscription();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Caricamento...
      </div>
    );
  }
  console.log(user?.user_metadata)

  return (
    <>
      <h1 className="text-3xl font-bold text-[#1e293b] mb-6 text-center">
        Ciao {user?.user_metadata?.full_name?.split(" ")[0] || user?.email || "Studente"}! <br /> Benvenuto nella tua area personale!
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
    </>
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

function FeatureCard({ title, description, href, emoji, badgeText, disabled, onClickDisabled }: FeatureCardProps) {
  return (
    <div
      className={`relative rounded-xl shadow-lg bg-white p-6 flex flex-col items-start gap-3 border border-[#e0e7ef] ${
        disabled ? "opacity-60 pointer-events-none" : "hover:shadow-2xl transition"
      }`}
    >
      {badgeText && (
        <span className="absolute top-3 right-3 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
          {badgeText}
        </span>
      )}

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
