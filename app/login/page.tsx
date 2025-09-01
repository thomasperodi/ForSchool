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
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Eye, EyeOff } from "lucide-react"; // 👁️ icone occhio
import Image from "next/image";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useAuth } from "@/context/AuthContext"; // percorso corretto del contesto
import {Device} from '@capacitor/device'

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
   const { loginWithPassword, handleLoginGoogle, loading } = useAuth();

  // Aggiorna tabella utenti dopo login (sia web sia mobile)

useEffect(() => {
    const setClientCookie = async () => {
      try {
        const info = await Device.getInfo();
        const isMobile = info.platform !== "web"; // "ios" o "android" = mobile, "web" = browser

        const type = isMobile ? "mobile" : "web";

        await fetch(`/api/auth/set-client?type=${type}`, {
          method: "GET",
          credentials: "include", // così il cookie viene salvato
        });
      } catch (err) {
        console.error("Errore nel settaggio del cookie:", err);
      }
    };

    setClientCookie();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data, error } = await supabase
          .from("utenti")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!data) {
          const { user } = session;
          await supabase.from("utenti").insert([
            {
              id: user.id,
              nome: user.user_metadata?.name || user.email?.split("@")[0] || "",
              email: user.email,
              ruolo: "studente",
              scuola_id: null,
              classe: null,
            },
          ]);
        }
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  try {
    // Effettua login con email/password
    await loginWithPassword(email, password);

    // Recupera l'utente autenticato
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      toast.error("Errore durante l'accesso");
      return;
    }

    const user = data.user;
    const emailUser = user.email!;
    const nome = user.user_metadata?.name || emailUser.split("@")[0];
    const domain = emailUser.split("@")[1];

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
          email: emailUser,
          ruolo: "studente",
          scuola_id: scuola?.id || null,
          classe: null,
        },
      ]);
    }

    toast.success("Login effettuato con successo!");
    router.push("/home");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    toast.error(message || "Errore durante il login");
  }
}

async function handleWebLogin() {
  // Avvia il processo di reindirizzamento
  console.log(window.location.origin)
  const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    
  },
});

  if (error) throw error;
}
  async function handleGoogle() {
    try {
      if(Capacitor.isNativePlatform())
      {

        await handleLoginGoogle();
        // toast.success("Login effettuato con successo!");
        router.push("/home");
      }else{
          await handleWebLogin();
      }
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  toast.error(message || "Errore durante il login");
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
              name="email"
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
                name="password"
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
            <Link href="/register" className="text-[#38bdf8] hover:underline font-medium">
              Registrati
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
