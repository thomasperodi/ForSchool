// "use client";
// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
// import toast from "react-hot-toast";

// export default function AuthCallbackPage() {
//   const router = useRouter();

//   useEffect(() => {
//     const handleAuth = async () => {
//       // Recupera sessione dall'URL (dopo redirect)
//       const { data, error } = await supabase.auth.getSession();

//       if (error || !data.session) {
//         toast.error("Errore durante l'accesso");
//         return router.push("/login");
//       }

//       const session = data.session;
//       const user = session.user;
//       if (!user) {
//         toast.error("Utente non trovato");
//         return router.push("/login");
//       }

//       // Imposta cookie sul backend
//       await fetch("/api/auth/set-session", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           access_token: session.access_token,
//           refresh_token: session.refresh_token,
//         }),
//       });

//       // Dati utente
//       const email = user.email!;
//       const nome = user.user_metadata?.name || email.split("@")[0];
//       const domain = email.split("@")[1];

//       // Trova/crea scuola
//       const res = await fetch("/api/findOrCreateScuola", {
//         method: "POST",
//         body: JSON.stringify({ domain }),
//       });
//       const scuola = await res.json();

//       // Inserisci l’utente solo se non esiste
//       const { data: existing } = await supabase
//         .from("utenti")
//         .select("id")
//         .eq("id", user.id)
//         .maybeSingle();

//       if (!existing) {
//         await supabase.from("utenti").insert([
//           {
//             id: user.id,
//             nome,
//             email,
//             ruolo: "studente",
//             scuola_id: scuola?.id || null,
//             classe: null,
//           },
//         ]);
//       }

//       toast.success("Accesso effettuato");
//       router.push("/home");
//     };

//     handleAuth();
//   }, [router]);

//   return <div className="p-10 text-center text-lg">Accesso in corso...</div>;
// }


"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 1. Ottieni la sessione e l'utente corrente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session || !session.user) {
          toast.error("Errore durante l'accesso");
          console.error("Errore di sessione:", error);
          router.replace("/login");
          return;
        }

        const user = session.user;
        const email = user.email!;
        const nome = user.user_metadata?.name || email.split("@")[0] || "";
        const domain = email.split("@")[1];
        
        console.log("Utente autenticato:", user.id, nome, email, domain);

        // 2. Imposta i cookie sul backend
        await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });

        // 3. Trova o crea la scuola
        const res = await fetch("/api/findOrCreateScuola", {
          method: "POST",
          body: JSON.stringify({ domain }),
        });
        const scuola = await res.json();
        
        // 4. Inserisci l'utente solo se non esiste già
        const { data: existing, error: selectError } = await supabase
          .from("utenti")
          .select("id")
          .eq("id", user.id)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          console.error("Errore nel controllo utente:", selectError);
          throw selectError;
        }

        if (!existing) {
          console.log("Creando nuovo utente...");
          const { error: insertError } = await supabase.from("utenti").insert([
            {
              id: user.id,
              nome,
              email,
              ruolo: "studente",
              scuola_id: scuola?.id || null,
              classe_id: null,
            },
          ]);
          if (insertError) throw insertError;
          console.log("Utente creato con successo!");
        } else {
          console.log("Utente già esistente.");
        }
        
        toast.success("Accesso effettuato");
        
        // 5. Reindirizzamento unificato a /home
        if (Capacitor.isNativePlatform()) {
          console.log("📱 Dispositivo mobile: reindirizzamento con window.location.href");
          window.location.href = "/home";
        } else {
          console.log("💻 Dispositivo web: reindirizzamento con router.replace");
          router.replace("/home");
        }
      } catch (err) {
        console.error("Errore nel callback di autenticazione:", err);
        toast.error("Errore durante l'accesso");
        router.replace("/login");
      }
    };

    handleAuth();
  }, [router]);

  return <div className="p-10 text-center text-lg">Accesso in corso...</div>;
}