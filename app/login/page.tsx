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


const CapacitorStorageSafe = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value ?? null;
    } catch (err: unknown) {
      if (isSecureStorageError(err, "Item with given key does not exist")) return null;
      console.warn(`[SecureStorage] getItem errore per "${key}":`, err);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStoragePlugin.set({ key, value });
    } catch (err: unknown) {
      console.warn(`[SecureStorage] setItem errore per "${key}":`, err);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStoragePlugin.remove({ key });
    } catch (err: unknown) {
      if (!isSecureStorageError(err, "Item with given key does not exist")) {
        console.warn(`[SecureStorage] removeItem errore per "${key}":`, err);
      }
    }
  },
};

// Type guard helper
function isSecureStorageError(err: unknown, messagePart: string): boolean {
  return err instanceof Error && err.message.includes(messagePart);
}


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
 const supabaseAuthKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!
    .split("//")[1]
    .split(".")[0]}-auth-token`;
interface SessionTokens {
  access_token: string;
  refresh_token: string;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

  // Funzione per salvare token sessione su Capacitor
  async function saveSessionTokens(session: SessionTokens) {
    if (!session) return;
    if (Capacitor.isNativePlatform()) {
      try {
      await CapacitorStorageSafe.setItem("access_token", session.access_token);
      await CapacitorStorageSafe.setItem("refresh_token", session.refresh_token);
      } catch (err) {
        console.error("Errore salvataggio SecureStorage:", err);
      }
    }
    // Aggiorna anche la sessione lato server
    await fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
  }

  // Inserisce o aggiorna l'utente nel DB
  async function upsertUser(user: AuthUser, scuolaId: string | null = null) {
    const emailUser = user.email!;
    const nome = user.user_metadata?.name || emailUser.split("@")[0];
    const { data: existing } = await supabase.from("utenti").select("id").eq("id", user.id).single();
    if (!existing) {
      await supabase.from("utenti").insert([
        {
          id: user.id,
          nome,
          email: emailUser,
          ruolo: "studente",
          scuola_id: scuolaId,
          classe: null,
        },
      ]);
    }
  }

  // Imposta cookie client
  useEffect(() => {
    (async () => {
      try {
        const info = await Device.getInfo();
        const type = info.platform !== "web" ? "mobile" : "web";
        await fetch(`/api/auth/set-client?type=${type}`, { method: "GET", credentials: "include" });
      } catch (err) {
        console.error("Errore nel settaggio del cookie:", err);
      }
    })();
  }, []);

  // // Ripristina sessione da SecureStorage all'avvio
  // useEffect(() => {
  //   async function restoreSession() {
  //     if (!Capacitor.isNativePlatform()) return;
  //     try {
  //     const access_token = await CapacitorStorageSafe.getItem("access_token");
  //     const refresh_token = await CapacitorStorageSafe.getItem("refresh_token");
  //       if (access_token && refresh_token) {
  //         const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  //         if (error) {
  //           console.error("Errore restore session:", error.message);
  //         await CapacitorStorageSafe.removeItem("access_token");
  //         await CapacitorStorageSafe.removeItem("refresh_token");
  //         } else if (data.session) {
  //           console.log("✅ Sessione ripristinata:", data.session.user.email);
  //           router.replace("/home");
  //         }
  //       }
  //     } catch (err) {
  //       console.log("Nessuna sessione salvata:", err);
  //     }
  //   }
  //   restoreSession();
  // }, [router]);

  // Login con email/password
  async function handleLogin(e: React.FormEvent) {
  }
  // Login Google web
  async function handleWebLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }
interface SocialLoginResult {
  result: {
    serverAuthCode?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

  // Login Google native
  async function handleNativeLogin() {
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
    if (!email) return toast.error("Inserisci la tua email per reimpostare la password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message);
    else toast.success("Email di reset inviata!");
  }


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
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}