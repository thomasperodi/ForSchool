"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import NavbarAuth from "@/components/NavbarAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { useSession } from "@supabase/auth-helpers-react";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

export default function AuthLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter();
  const pathname = usePathname();
  const [toastShown, setToastShown] = useState(false); // traccia se il toast è già apparso
  const [token, setToken] = useState<string | null>(null);
  const session = useSession();
    const [user, setUser] = useState<{
    id: string;
    email: string;
    user_metadata?: { full_name?: string; avatar_url?: string; hasSubscription?: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  
  const getTitleFromPath = (path: string | null) => {
  if (!path) return "";
  
  const firstSegment = path.split("/")[1]; // prende la prima parola dopo "/"
  if (!firstSegment) return "";

  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
};

//   useEffect(() => {

//     const init = async () => {

//       const tokenKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`;

//       // ✅ Legge il token su Capacitor / fallback null
//       let token: string | null = null;

// try {
//   token = await SecureStoragePlugin.get({ key: tokenKey }).then(res => res.value);
// } catch (err: unknown) {
//   // stampo l'errore in modo sicuro
//   if (err instanceof Error) {
//     console.warn("[CapacitorStorage] getItem errore, uso fallback localStorage:", err.message);
//   } else {
//     console.warn("[CapacitorStorage] getItem errore sconosciuto, uso fallback localStorage:", err);
//   }
//   token = localStorage.getItem(tokenKey) || null;
// }

// console.log(token )
// // Se non c'è token → redirect a login
// if (!token) {
//   console.log("Token non trovato → redirect /login");
// await fetch("/api/auth/logout", { method: "POST" });
// router.push("/login");
//   return; // ✅ uscita immediata, niente render del contenuto
// }

//       const { data: userData, error: userError } = await supabase.auth.getUser();
//       if (userError || !userData.user) {
//         console.log("Nessun utente autenticato, reindirizzamento a /login");
//         router.push("/login");
//         setLoading(false);
//         return;
//       }

//       // Verifica che l'utente abbia i dati necessari
//       if (!userData.user.email) {
//         console.log("Utente senza email, reindirizzamento a /login");
//         router.push("/login");
//         setLoading(false);
//         return;
//       }

//       setUser({
//         id: userData.user.id,
//         email: userData.user.email,
//         user_metadata: userData.user.user_metadata,
//       });

//       // Check subscription
//       const { data: subData, error: subError } = await supabase
//         .from("abbonamenti")
//         .select("stato")
//         .eq("utente_id", userData.user.id)
//         .eq("stato", "active")
//         .single();

//       if (subError || !subData || subData.stato !== "active") {
//         setIsSubscribed(false);
//       } else {
//         setIsSubscribed(true);
//       }

//       setLoading(false);
//     };

//     init();

//   }, [router]);


// useEffect(() => {
//   let cancelled = false;

//   const init = async () => {
//     try {
//       // 1) Chiedi la sessione a Supabase (usa lo storage adapter già configurato)
//       const { data: sessionData } = await supabase.auth.getSession();
//       const session = sessionData.session;

//       if (!session?.user) {
//         if (!cancelled) router.replace("/login");
//         return;
//       }

//       // 2) Carica profilo
//       const { data: profile, error: profErr } = await supabase
//         .from("utenti")
//         .select("*, scuole(nome, citta), classi(anno, sezione)")
//         .eq("id", session.user.id)
//         .single();

//       if (profErr || !profile) {
//         if (!cancelled) router.replace("/login");
//         return;
//       }

//       if (cancelled) return;
//       // opzionale: salva user minimale per header/mobile
//       setUser({
//         id: session.user.id,
//         email: session.user.email ?? "",
//         user_metadata: session.user.user_metadata,
//       });

//       // 3) Controlla abbonamento
//       const { data: subData } = await supabase
//         .from("abbonamenti")
//         .select("stato")
//         .eq("utente_id", session.user.id)
//         .eq("stato", "active")
//         .single();

//       if (!cancelled) setIsSubscribed(subData?.stato === "active");
//     } catch (e) {
//       console.warn("[AuthLayout:init] errore:", e);
//       if (!cancelled) router.replace("/login");
//     } finally {
//       if (!cancelled) setLoading(false);
//     }
//   };

//   init();
//   return () => {
//     cancelled = true;
//   };
// }, [router]);


  return (
    <SidebarProvider>
    <div className="min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#f1f5f9] to-[#34d399] px-0 ">
      <div className="hidden xl:block">
        <NavbarAuth />
      </div>
      <div className="block xl:hidden">
        <AppSidebar />
        <MobileHeader title={getTitleFromPath(pathname)} />
      </div>
      <main className="max-w-7xl mx-auto py-12 px-4 main-content-safe">{children}</main>
    </div>
    </SidebarProvider>
  );
}
