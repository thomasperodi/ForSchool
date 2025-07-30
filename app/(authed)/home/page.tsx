
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState<{ 
    id: string; 
    email: string; 
    user_metadata?: { name?: string; avatar_url?: string } 
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

 
  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        toast.error("Devi essere autenticato per accedere alla home.");
        router.push("/login");
        setLoading(false);
        return;
      } else {
        // Adattiamo data.user per rispettare il tipo richiesto da setUser
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Caricamento...
      </div>
    );
  }


  return (
    <>
      <h1 className="text-3xl font-bold text-[#1e293b] mb-6 text-center">
        Ciao {user?.user_metadata?.name?.split(" ")[0] || user?.email || "Studente"}  <br /> Benvenuto nella tua area personale!
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <FeatureCard
          title="Ripetizioni"
          description="Trova tutor per ripetizioni o offri il tuo aiuto agli altri studenti."
          href="/ripetizioni"
          emoji="📚"
        />
        <FeatureCard
          title="Marketplace"
          description="Compra e vendi libri, appunti, materiale scolastico e altro."
          href="/marketplace"
          emoji="🛒"
        />
        <FeatureCard
          title="Merch"
          description="Acquista il merchandising ufficiale della scuola o della community."
          href="/merchandising"
          emoji="👕"
        />
        <FeatureCard
          title="Biglietti Eventi"
          description="Prenota o acquista biglietti per eventi scolastici e feste."
          href="/eventi"
          emoji="🎟️"
        />
        <FeatureCard
          title="Blog"
          description="Leggi e scrivi articoli, guide e consigli per la vita scolastica."
          href="/blog"
          emoji="📝"
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
  disabled?: boolean;
};

function FeatureCard({ title, description, href, emoji, disabled }: FeatureCardProps) {
  return (
    <div
      className={`rounded-xl shadow-lg bg-white p-6 flex flex-col items-start gap-3 border border-[#e0e7ef] ${
        disabled ? "opacity-60 pointer-events-none" : "hover:shadow-2xl transition"
      }`}
    >
      <div className="text-4xl">{emoji}</div>
      <h2 className="text-xl font-semibold text-[#1e293b]">{title}</h2>
      <p className="text-[#334155]">{description}</p>
      {!disabled && (
        <Link
          href={href}
          className="mt-2 inline-block bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition"
        >
          Vai
        </Link>
      )}
    </div>
  );
}