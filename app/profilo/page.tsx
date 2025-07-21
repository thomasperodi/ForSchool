
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getUtenteCompleto } from "@/lib/api";

type Utente = {
  id: string;
  nome: string;
  email: string;
  classe: string;
  ruolo: string;
  notifiche: boolean;
  tema: string;
  scuola: { id: string; nome: string } | null;
  scuola_nome: string | null;
};


export default function ImpostazioniProfilo() {
  const [user, setUser] = useState<Utente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campi modificabili
  const [nome, setNome] = useState("");
  const [classe, setClasse] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl] = useState("");

  // Nuovi stati per password, notifiche e tema
  const [nuovaPassword, setNuovaPassword] = useState("");
  const [notifiche, setNotifiche] = useState(false);
  const [tema, setTema] = useState("auto");

  const router = useRouter();

  useEffect(() => {
    const fetchUtente = async () => {
      try {
        const utente = await getUtenteCompleto();
        console.log("utente:", utente);
        setUser(utente);
        setNome(utente.nome);
        setClasse(utente.classe);
        setNotifiche(utente.notifiche);
        setTema(utente.tema);
        setEmail(utente.email);
        setLoading(false); // <-- aggiungi qui
      } catch (err) {
        toast.error((err as Error).message);
        setLoading(false); // <-- aggiungi qui
        router.push("/login");
      }
    };
  
    fetchUtente();
  }, [router]);
  

  const handleSalva = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Aggiorna user_metadata (nome)
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        name: nome,
      },
    });

    // Aggiorna la tabella utenti (nome, classe, notifiche, tema)
    const { error: dbError } = await supabase
      .from("utenti")
      .update({
        nome,
        classe,
        notifiche,
        tema,
      })
      .eq("id", user?.id ?? "");

    // Cambia password se inserita
    let passError = null;
    if (nuovaPassword) {
      const { error } = await supabase.auth.updateUser({ password: nuovaPassword });
      passError = error;
    }

    setSaving(false);

    if (metaError || dbError || passError) {
      toast.error("Errore durante il salvataggio delle modifiche.");
    } else {
      toast.success("Profilo aggiornato con successo!");
      router.refresh?.();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Caricamento profilo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#f1f5f9] to-[#34d399] px-0">
      <nav className="flex items-center justify-between px-8 py-4 bg-white/80 shadow">
        <span className="text-2xl font-bold text-[#1e293b]">ForSchool</span>
        <button
          className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition"
          onClick={handleLogout}
        >
          Esci
        </button>
      </nav>
      <main className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-[#1e293b] mb-6 text-center">
          Impostazioni profilo
        </h1>
        <form
          className="bg-white rounded-xl shadow-2xl p-8 flex flex-col gap-6"
          onSubmit={handleSalva}
        >
          <div className="flex flex-col items-center gap-2">
            {avatarUrl ? (
              <Image
                width={80}
                height={80}
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full border shadow"
              />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center rounded-full bg-[#38bdf8] text-white text-3xl font-bold border shadow">
                {nome?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <label className="text-[#1e293b] font-medium">
            Nome
            <input
              type="text"
              className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
              value={nome || ""}
              onChange={e => setNome(e.target.value)}
              required
            />
          </label>
          <label className="text-[#1e293b] font-medium">
            Email (non modificabile)
            <input
              type="email"
              className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] text-[#1e293b] w-full opacity-60 cursor-not-allowed"
              value={email || ""}
              disabled
            />
          </label>
          <label className="text-[#1e293b] font-medium">
  Scuola (non modificabile)
  <input
    type="text"
    className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] text-[#1e293b] w-full opacity-60 cursor-not-allowed"
    value={user?.scuola_nome || ""}
    disabled
  />
</label>

          <label className="text-[#1e293b] font-medium">
            Classe
            <input
              type="text"
              className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
              value={classe || ""}
              onChange={e => setClasse(e.target.value)}
              placeholder="Es: 3A, 4B, 5C..."
            />
          </label>
          <label className="text-[#1e293b] font-medium flex items-center gap-2">
            <span>Ricevi notifiche email</span>
            <Switch checked={notifiche} onCheckedChange={setNotifiche} />
          </label>
          
          <label className="text-[#1e293b] font-medium">
            Nuova password
            <input
              type="password"
              className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
              value={nuovaPassword || ""}
              onChange={e => setNuovaPassword(e.target.value)}
              placeholder="Lascia vuoto per non cambiare"
            />
          </label>
          <Button
            type="submit"
            className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold"
            disabled={saving}
          >
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </Button>
          <Button
            type="button"
            className="bg-[#94ee3f] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold"
            disabled={false}
            onClick={() => router.push("/home")}
          >
            Torna alla home
          </Button>
        </form>
        
        
      </main>
    </div>
  );
}
