"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Device } from "@capacitor/device";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const setClientCookie = async () => {
      try {
        const info = await Device.getInfo();
        const isMobile = info.platform !== "web";
        const type = isMobile ? "mobile" : "web";
        await fetch(`/api/auth/set-client?type=${type}`, {
          method: "GET",
          credentials: "include",
        });
      } catch (err) {
        console.error("Errore nel settaggio del cookie:", err);
      }
    };
    setClientCookie();
  }, []);

  // Listener per tutti gli eventi di autenticazione.
  // Reindirizza l'utente alla home solo dopo un login riuscito.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth state changed:", event, session?.user?.email);
        
        if (event === "SIGNED_IN" && session?.user) {
          try {
            console.log("✅ Utente autenticato, iniziando setup...");
            
            // Verifica se l'utente esiste già nel database
            const { data, error: selectError } = await supabase
              .from("utenti")
              .select("id")
              .eq("id", session.user.id)
              .single();

            if (selectError && selectError.code !== 'PGRST116') {
              console.error("Errore nel controllo utente:", selectError);
              throw selectError;
            }

            if (!data) {
              console.log("👤 Creando nuovo utente...");
              // Crea l'utente se non esiste
              const { user } = session;
              const email = user.email!;
              const nome = user.user_metadata?.name || email.split("@")[0] || "";
              const domain = email.split("@")[1];

              // Trova o crea la scuola
              const res = await fetch("/api/findOrCreateScuola", {
                method: "POST",
                body: JSON.stringify({ domain }),
              });
              const scuola = await res.json();

              const { error: insertError } = await supabase.from("utenti").insert([
                {
                  id: user.id,
                  nome,
                  email,
                  ruolo: "studente",
                  scuola_id: scuola?.id || null,
                  classe: null,
                },
              ]);

              if (insertError) {
                console.error("Errore nell'inserimento utente:", insertError);
                throw insertError;
              }
              console.log("✅ Utente creato con successo");
            } else {
              console.log("✅ Utente già esistente");
            }

            // Piccolo delay per assicurarsi che tutto sia sincronizzato
            await new Promise(resolve => setTimeout(resolve, 500));

            // Reindirizza alla home
            console.log("🏠 Reindirizzamento alla home...");
            
            // Per dispositivi mobili, usa sempre window.location
            if (Capacitor.isNativePlatform()) {
              console.log("📱 Dispositivo mobile: uso window.location.href");
              window.location.href = "/home";
            } else {
              // Per web, usa router.replace
              router.replace("/home");
            }
            
            toast.success("Login effettuato con successo!");
          } catch (error) {
            console.error("❌ Errore nella gestione dell'autenticazione:", error);
            toast.error("Errore durante l'accesso");
          }
        } else if (event === "SIGNED_OUT") {
          console.log("👋 Utente disconnesso");
        } else if (event === "TOKEN_REFRESHED") {
          console.log("🔄 Token aggiornato");
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Imposta la sessione solo se il login è riuscito
      const sessionResponse = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
        }),
      });
      
      if (!sessionResponse.ok) {
        console.error("Errore nell'impostazione della sessione");
      } else {
        console.log("✅ Sessione impostata correttamente");
      }
      
      // Salva i token in SecureStorage per dispositivi mobili
      if (Capacitor.isNativePlatform() && data.session) {
        try {
          await SecureStoragePlugin.set({
            key: "access_token",
            value: data.session.access_token,
          });
          await SecureStoragePlugin.set({
            key: "refresh_token",
            value: data.session.refresh_token,
          });
        } catch (storageError) {
          console.error("Errore salvataggio SecureStorage:", storageError);
        }
      }

      // Per dispositivi mobili, aggiungi un fallback di reindirizzamento diretto
      if (Capacitor.isNativePlatform()) {
        console.log("📱 Dispositivo mobile rilevato, aggiungo fallback di reindirizzamento");
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            console.log("🚀 Fallback mobile: reindirizzamento diretto");
            window.location.href = "/home";
          }
        }, 2000);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Errore durante il login");
    } finally {
      setLoading(false);
    }
  }

  type GoogleLoginOfflineResult = {
    provider: "google";
    result: {
      responseType: "offline";
      serverAuthCode: string;
    };
  };

  async function handleWebLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }

  async function handleNativeLogin() {
    const iOSClientId = process.env.NEXT_PUBLIC_IOS_GOOGLE_CLIENT_ID;
    if (!iOSClientId) throw new Error("iOS Client ID mancante");

    await SocialLogin.initialize({
      google: {
        webClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        iOSClientId,
        iOSServerClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        mode: "offline",
      },
    });

    const res = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"] },
    });

    const googleResponse = res as GoogleLoginOfflineResult;
    const serverAuthCode = googleResponse.result.serverAuthCode;
    if (!serverAuthCode) throw new Error("serverAuthCode non disponibile");

    const resp = await fetch("/api/auth/exchange-google-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: serverAuthCode }),
    });

    const { id_token } = await resp.json();
    if (!id_token) throw new Error("id_token non ricevuto dal backend");

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: id_token,
    });
    if (error) throw error;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("Sessione non trovata");

    // Salva i token in SecureStorage
    await SecureStoragePlugin.set({
      key: "access_token",
      value: sessionData.session.access_token,
    });
    await SecureStoragePlugin.set({
      key: "refresh_token",
      value: sessionData.session.refresh_token,
    });

    // Imposta la sessione per i cookie
    const sessionResponse = await fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      }),
    });

    if (!sessionResponse.ok) {
      console.error("Errore nell'impostazione della sessione Google");
    } else {
      console.log("✅ Sessione Google impostata correttamente");
    }

    // Per dispositivi mobili, aggiungi un fallback di reindirizzamento diretto
    if (Capacitor.isNativePlatform()) {
      console.log("📱 Dispositivo mobile rilevato (Google), aggiungo fallback di reindirizzamento");
      setTimeout(() => {
        if (window.location.pathname === "/login") {
          console.log("🚀 Fallback mobile Google: reindirizzamento diretto");
          window.location.href = "/home";
        }
      }, 2000);
    }

    // Non fare redirect manuale - lascia che sia gestito dal listener onAuthStateChange
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        await handleNativeLogin();
      } else {
        await handleWebLogin();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Errore durante il login con Google");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      toast.error("Inserisci la tua email per reimpostare la password");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email di reset inviata!");
    }
  }

  // Ripristina la sessione da SecureStorage (solo per Capacitor).
  // Esegue il controllo all'avvio del componente.
  useEffect(() => {
    async function restoreSession() {
      if (Capacitor.isNativePlatform()) {
        try {
          const { value: access_token } = await SecureStoragePlugin.get({ key: "access_token" });
          const { value: refresh_token } = await SecureStoragePlugin.get({ key: "refresh_token" });
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) {
              console.error("Errore restore session:", error.message);
              await SecureStoragePlugin.remove({ key: "access_token" });
              await SecureStoragePlugin.remove({ key: "refresh_token" });
            } else if (data.session) {
                console.log("✅ Sessione ripristinata:", data.session.user.email);
                // Se la sessione è stata ripristinata, reindirizza alla home
                router.replace("/home");
            }
          }
        } catch (err) {
          console.log("Nessuna sessione salvata:", err);
        }
      }
    }
    restoreSession();
  }, [router]);

  // Fallback: controlla periodicamente se l'utente è autenticato
  useEffect(() => {
    let checkCount = 0;
    const maxChecks = 10; // Massimo 10 controlli (20 secondi totali)
    
    const checkAuthStatus = async () => {
      checkCount++;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log(`Fallback check ${checkCount}: utente autenticato rilevato, reindirizzamento alla home`);
        
        // Verifica anche che il cookie sia impostato
        const cookieResponse = await fetch('/api/auth/check-auth', {
          method: 'GET',
          credentials: 'include'
        });
        const cookieData = await cookieResponse.json();
        console.log('Cookie auth status:', cookieData);
        
        // Prova diversi metodi di reindirizzamento
        console.log("🔄 Tentativo di reindirizzamento dal fallback...");
        router.replace("/home");
        
        // Fallback più aggressivo per dispositivi mobili
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            console.log("🚀 Fallback aggressivo: window.location.href");
            window.location.href = "/home";
          }
        }, 500);
        
        return;
      }
      
      // Continua a controllare se non abbiamo raggiunto il limite
      if (checkCount < maxChecks) {
        setTimeout(checkAuthStatus, 2000); // Controlla ogni 2 secondi
      } else {
        console.log('Timeout raggiunto per il controllo dell\'autenticazione');
      }
    };

    // Inizia il controllo dopo 1 secondo
    const initialTimeoutId = setTimeout(checkAuthStatus, 1000);
    
    return () => clearTimeout(initialTimeoutId);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9] text-[#1e293b] font-sans">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-6"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-[#1e293b] text-center mb-2"
          >
            Accedi a Skoolly
          </motion.h1>
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <label className="text-[#1e293b] font-medium" htmlFor="email">
              Email scolastica
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b]"
              placeholder="nome.cognome@scuola.it"
            />
            <label className="text-[#1e293b] font-medium" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2 w-full rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] pr-10"
                placeholder="La tua password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-sm text-[#38bdf8] hover:underline self-end"
            >
              Password dimenticata?
            </button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 0 4px #fbbf24aa" }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2 rounded-md bg-[#38bdf8] text-[#1e293b] font-semibold shadow-lg hover:bg-[#fbbf24] hover:text-[#1e293b] transition-all disabled:opacity-60"
            >
              {loading ? "Caricamento..." : "Accedi"}
            </motion.button>
          </form>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-2 rounded-md bg-white border border-[#38bdf8] text-[#1e293b] font-semibold shadow hover:bg-[#38bdf8]/10 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            <Image
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
              width={20}
              height={20}
            />
            Accedi con Google
          </motion.button>
          <div className="text-center text-sm text-[#334155]">
            Non hai un account?{" "}
            <Link
              href="/register"
              className="text-[#38bdf8] hover:underline font-medium"
            >
              Registrati
            </Link>
          </div>
          
          {/* Debug button per testare il reindirizzamento */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-2 space-y-2">
              <button
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  console.log("Debug: Session data:", session);
                  if (session?.user) {
                    console.log("🚀 Debug: Tentativo router.replace");
                    router.replace("/home");
                  } else {
                    console.log("Debug: Nessuna sessione attiva");
                  }
                }}
                className="w-full py-2 rounded-md bg-gray-500 text-white text-sm"
              >
                Debug: Router Replace
              </button>
              <button
                onClick={() => {
                  console.log("🚀 Debug: window.location.href");
                  window.location.href = "/home";
                }}
                className="w-full py-2 rounded-md bg-blue-500 text-white text-sm"
              >
                Debug: Window Location
              </button>
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}