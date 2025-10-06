"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { Apple, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Device } from "@capacitor/device";
// 👇 aggiungi questo import
import { App } from "@capacitor/app";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 👇 evita doppi redirect su eventi multipli
  const hasNavigatedRef = useRef(false);
  const safeRedirectHome = useCallback(async () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (Capacitor.isNativePlatform()) {
      // su mobile, meglio un hard navigation
      window.location.href = "/home";
      // failsafe: se per qualche motivo resti su /login, ritenta
      setTimeout(() => {
        if (window.location.pathname === "/login") {
          window.location.href = "/home";
        }
      }, 1500);
    } else {
      router.replace("/home");
    }
  }, [router]);

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

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    async function checkPlatform() {
      if (Capacitor.isNativePlatform()) {
        const info = await Device.getInfo();
        setIsIOS(info.operatingSystem === "ios");
      }
    }
    checkPlatform();
  }, []);
  // 🔑 1) Listener globale Supabase: unico punto che decide il redirect
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // console.log("Auth event:", event, !!session?.user);
        if (event === "SIGNED_IN" && session?.user) {
          // imposta cookie sessione anche sul webview backend, se serve
          try {
            await fetch("/api/auth/set-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }),
            });
          } catch (e) {
            console.warn("set-session fallita (non bloccante):", e);
          }
          await safeRedirectHome();
        }
      }
    );
    return () => {
      subscription.subscription?.unsubscribe?.();
    };
  }, [safeRedirectHome]);

  // 🔄 2) Gestisci ritorno in foreground: se l’utente è già loggato, vai a /home
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const removeResume = App.addListener("resume", async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await safeRedirectHome();
        }
      } catch (e) {
        console.log("Errore su resume:", e);
      }
    });

    const removeState = App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) return;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await safeRedirectHome();
        }
      } catch (e) {
        console.log("Errore su appStateChange:", e);
      }
    });

    return () => {
      removeResume.then((l) => l.remove());
      removeState.then((l) => l.remove());
    };
  }, [safeRedirectHome]);

  

async function handleAppleLogin() {
  setLoading(true);
  try {
    // ✅ Inizializza SocialLogin con Apple
    await SocialLogin.initialize({
      apple: {
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID!,

      },
    });

    // ✅ Ora effettua il login
    const response = await SocialLogin.login({
      provider: 'apple',
      options: {
        scopes: ['email', 'name'],
      },
    });

    type AppleLoginResponse = {
      idToken: string;
      email?: string;
      fullName?: string;
    };
    const { idToken, email, fullName } = response as unknown as AppleLoginResponse;

    if (!idToken) throw new Error("idToken non disponibile");

    // Login su Supabase con idToken Apple
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
    });

    if (error) throw error;
    toast.success("Login effettuato con Apple!");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    toast.error(message || "Errore durante il login con Apple");
  } finally {
    setLoading(false);
  }
}


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    hasNavigatedRef.current = false; // reset tra tentativi

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // NB: niente redirect manuale qui — lo farà onAuthStateChange

      // opzionale: salva token su mobile
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
    } catch (err: unknown) {
      let status: number | undefined;
      let message: string | undefined;

      if (err && typeof err === "object") {
        if ("status" in err && typeof (err as { status?: unknown }).status === "number") {
          status = (err as { status: number }).status;
        }
        if ("message" in err && typeof (err as { message?: unknown }).message === "string") {
          message = (err as { message: string }).message;
        }
      }
      if (!message) {
        if (err instanceof Error) message = err.message;
        else message = String(err);
      }

      try {
        if (status === 429) {
          toast.error("Troppe richieste. Riprova tra poco.");
        } else if (message && /email\s*not\s*confirmed/i.test(message)) {
          toast.error("Email non verificata. Controlla la tua casella di posta.");
        } else if (message && /invalid.*credential/i.test(message)) {
          const { data: existing } = await supabase
            .from("utenti")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (!existing) toast.error("Email non registrata");
          else toast.error("Password errata");
        } else if (message && /network|fetch|connection/i.test(message)) {
          toast.error("Problema di connessione. Controlla la rete e riprova.");
        } else {
          toast.error(message || "Errore durante il login");
        }
      } catch {
        toast.error(message || "Errore durante il login");
      }
    } finally {
      setLoading(false);
    }
  }

  type GoogleLoginOfflineResult = {
    provider: "google";
    result: { responseType: "offline"; serverAuthCode: string };
  };

  async function handleWebLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    // NB: su web il redirect sarà gestito da Supabase + onAuthStateChange al ritorno
  }

  async function handleNativeLogin() {
    hasNavigatedRef.current = false; // reset tra tentativi
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

    // NB: niente redirect manuale: aspetta onAuthStateChange
    toast.success("Login effettuato con successo!");
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
    if (error) toast.error(error.message);
    else toast.success("Email di reset inviata!");
  }

  // ♻️ Ripristina sessione da SecureStorage (Capacitor) e vai a /home se valida
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
            } else if (data.session?.user) {
              await safeRedirectHome();
            }
          }
        } catch (err) {
          console.log("Nessuna sessione salvata:", err);
        }
      }
    }
    restoreSession();
  }, [safeRedirectHome]);

  // ✅ Se l’utente è già autenticato all’avvio (specialmente su mobile), vai a /home
  useEffect(() => {
    const checkInitialAuth = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await safeRedirectHome();
          }
        } catch (error) {
          console.log("Errore nel controllo iniziale dell'autenticazione:", error);
        }
      }
    };
    checkInitialAuth();
  }, [safeRedirectHome]);

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
              Email 
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b]"
              placeholder="nome.cognome@mail.it"
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


          {isIOS && (
  <Button
    onClick={handleAppleLogin}
    className="flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-900 transition-colors py-2 px-4 rounded-md shadow-md"
  >
    <Apple size={20} /> {/* icona Apple */}
    Accedi con Apple
  </Button>
)}
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

        </motion.div>
      </div>
      <Footer />
    </div>
  );
}