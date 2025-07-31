"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const syncUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        toast.error("Errore durante l'accesso");
        return router.push("/login");
      }

      const user = data.user;
      const email = user.email!;
      const nome = user.user_metadata?.name || email.split("@")[0];
      const domain = email.split("@")[1];
      console.log("Utente autenticato:", user.id, nome, email, domain);

      // Chiamata API che crea o trova la scuola
      const res = await fetch("/api/findOrCreateScuola", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });

      const scuola = await res.json();


      // Inserisci l’utente solo se non esiste
      const { data: existing } = await supabase
        .from("utenti")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existing) {
        await supabase.from("utenti").insert([
          {
            id: user.id,
            nome,
            email,
            ruolo: "studente",
            scuola_id: scuola?.id || null,
            classe: null,
          },
        ]);
      }
      

      toast.success("Accesso effettuato");
      router.push("/home"); // Vai alla home
    };

    syncUser();
  }, [router]);

  return <div className="p-10 text-center text-lg">Accesso in corso...</div>;
}
