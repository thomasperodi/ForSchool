"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getUtenteCompleto } from "@/lib/api";
import NavbarAuth from "@/components/NavbarAuth";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

type Classe = {
  id: string;
  anno: number;
  sezione: string;
};

type Utente = {
  id: string;
  nome: string;
  email: string;
  ruolo: string;
  notifiche: boolean;
  tema: string;
  scuola: { id: string; nome: string } | null;
  scuola_nome: string | null;
  classe: Classe | null;
};

export default function ImpostazioniProfilo() {
  const [user, setUser] = useState<Utente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campi modificabili
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl] = useState("");
  const [nuovaPassword, setNuovaPassword] = useState("");
  const [notifiche, setNotifiche] = useState(false);
  const [tema, setTema] = useState("auto");

  // Nuovi stati per anno e sezione
  const [anno, setAnno] = useState<number | string>("");
  const [sezione, setSezione] = useState("");

  const router = useRouter();

  useEffect(() => {
    const fetchUtente = async () => {
      try {
        const utente = await getUtenteCompleto();
        setUser(utente);
        setNome(utente.nome);
        setNotifiche(utente.notifiche);
        setTema(utente.tema);
        setEmail(utente.email);
        
        // Imposta anno e sezione se la classe esiste
        if (utente.classe) {
          setAnno(utente.classe.anno);
          setSezione(utente.classe.sezione);
        }
        
        setLoading(false);
      } catch (err) {
        toast.error((err as Error).message);
        setLoading(false);
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

    // Gestione della classe
    let newClasseId = user?.classe?.id || null;
    let dbError = null;

    if (anno && sezione) {
      // 1. Cerca la classe esistente
      const { data: existingClasse, error: searchError } = await supabase
        .from("classi")
        .select("id")
        .eq("scuola_id", user?.scuola?.id)
        .eq("anno", anno)
        .eq("sezione", sezione)
        .single();

      if (searchError && searchError.code !== "PGRST116") { // PGRST116 is "No rows found"
        dbError = searchError;
      }

      if (existingClasse) {
        newClasseId = existingClasse.id;
      } else if (user?.scuola?.id) {
        // 2. Se non esiste, crea una nuova classe
        const { data: newClasse, error: createError } = await supabase
          .from("classi")
          .insert([{ scuola_id: user.scuola.id, anno: Number(anno), sezione }])
          .select("id")
          .single();
        
        if (createError) {
          dbError = createError;
        } else if (newClasse) {
          newClasseId = newClasse.id;
        }
      }
    } else {
      // Se anno o sezione sono vuoti, rimuovi la classe
      newClasseId = null;
    }

    if (!dbError) {
      // 3. Aggiorna la tabella utenti con il nuovo classe_id
      const { error: updateError } = await supabase
        .from("utenti")
        .update({
          nome,
          notifiche,
          tema,
          classe_id: newClasseId,
        })
        .eq("id", user?.id ?? "");
      dbError = updateError;
    }

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
    <div className="min-h-screen bg-gradient-to-b px-0">
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
                loading="lazy"
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

          <div className="flex gap-4">
            <label className="text-[#1e293b] font-medium flex-1">
              Anno
              <input
                type="number"
                className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
                value={anno}
                max={5}
                onChange={e => setAnno(e.target.value)}
                placeholder="Es: 3"
              />
            </label>
            <label className="text-[#1e293b] font-medium flex-1">
              Sezione
              <input
                type="text"
                className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
                value={sezione}
                onChange={e => setSezione(e.target.value)}
                placeholder="Es: A, B, C..."
              />
            </label>
          </div>
          

          
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
          <AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      type="button"
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition font-semibold mt-4 w-full"
    >
      Elimina account
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Conferma eliminazione account</AlertDialogTitle>
      <AlertDialogDescription>
        Questa azione eliminerà definitivamente il tuo account e tutti i dati associati. Questa operazione non può essere annullata.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="flex justify-end gap-2 mt-4">
      <AlertDialogCancel>Annulla</AlertDialogCancel>
<AlertDialogAction
  onClick={async () => {
    try {
      // 1) Recupera la sessione corrente
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Nessuna sessione valida");

      // 2) Richiama l’API di eliminazione
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include", // utile in locale
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Errore durante l'eliminazione");

      // 3) Eliminazione riuscita → logout e redirect
      await supabase.auth.signOut();
      toast.success("Account eliminato con successo!");
      router.push("/login");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Errore durante l'eliminazione dell'account.";
      toast.error(errorMessage);
    }
  }}
>
  Elimina
</AlertDialogAction>


    </div>
  </AlertDialogContent>
</AlertDialog>
        </form>
      </main>
      
      



    </div>
  );
}