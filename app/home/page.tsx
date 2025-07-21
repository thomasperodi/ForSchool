
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";

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
    <div className="min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#f1f5f9] to-[#34d399] px-0">
      <nav className="flex items-center justify-between px-8 py-4 bg-white/80 shadow">
        <span className="text-2xl font-bold text-[#1e293b]">ForSchool</span>
        <div className="flex items-center gap-4">
          {/* Avatar utente con tooltip/link alle impostazioni */}
          <button
            onClick={() => router.push("/profilo")}
            title="Impostazioni profilo"
            className="relative group focus:outline-none"
            style={{ background: "none", border: "none", padding: 0 }}
          >
            {user?.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                width={36}
                height={36}
                className="rounded-full border shadow"
              />
            ) : (
              <span
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#38bdf8] text-white font-bold text-lg border shadow"
                style={{ display: "inline-flex" }}
              >
                {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            {/* Tooltip visibile su hover */}
            <span className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-[#1e293b] text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
              Impostazioni profilo
            </span>
          </button>
          <button
            className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
          >
            Esci
          </button>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-[#1e293b] mb-6 text-center">
          Benvenuto nella tua area personale!
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
            href="/merch"
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
      </main>
    </div>
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
