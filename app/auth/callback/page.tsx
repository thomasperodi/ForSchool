"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const syncUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        toast.error("Errore durante l'accesso");
        return router.push("/login");
      }

      // Ottieni la sessione corrente per impostare i cookie
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        try {
          await fetch("/api/auth/set-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
            }),
          });
        } catch (err) {
          console.error("Errore nell'impostazione dei cookie:", err);
        }
        await SecureStoragePlugin.set({
      key: "access_token",
      value: sessionData.session.access_token,
    });
    await SecureStoragePlugin.set({
      key: "refresh_token",
      value: sessionData.session.refresh_token,
    });
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


      // Inserisci l'utente solo se non esiste
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
