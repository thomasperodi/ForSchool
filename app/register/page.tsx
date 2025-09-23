"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import bcrypt from "bcryptjs"; // npm install bcryptjs
import { Eye, EyeOff } from "lucide-react"; // npm install lucide-react

export default function RegisterPage() {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordMinLength = 8;
  const isPasswordLongEnough = password.length >= passwordMinLength;

  // Dopo login Google: popola tabella utenti se necessario
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data, error } = await supabase
          .from("utenti")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!data && !error) {
          const { user } = session;
          const nomeCompleto = user.user_metadata?.name || user.email?.split("@")[0] || "";
          await supabase.from("utenti").insert([
            {
              id: user.id,
              nome: nomeCompleto,
              email: user.email,
              ruolo: "studente",
              scuola_id: null,
              classe_id: null
            }
          ]);
        }
        toast.success("Registrazione effettuata con successo! ");
        router.push("/");
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

async function handleRegister(e: React.FormEvent) {
  e.preventDefault();
  if (!isPasswordLongEnough) {
    toast.error(`La password deve avere almeno ${passwordMinLength} caratteri`);
    return;
  }

  setLoading(true);

  // 1. Crea utente su Supabase Auth
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${nome} ${cognome}`
      }
    }
  });

  if (signUpError) {
    toast.error(signUpError.message);
    setLoading(false);
    return;
  }

  const user = data.user;
  if (user) {
    // 2. Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Recupero dominio email → chiamo API scuola
    const emailUser = user.email!;
    const nomeUtente = `${nome} ${cognome}`;
    const domain = emailUser.split("@")[1];

    try {
      const res = await fetch("/api/findOrCreateScuola", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!res.ok) {
        throw new Error("Errore nel recupero della scuola");
      }

      const scuola = await res.json();

      // 4. Inserisci nella tabella utenti con scuola_id
      const { error: dbError } = await supabase.from("utenti").insert([
        {
          id: user.id,
          nome: nomeUtente,
          email: emailUser,
          password: hashedPassword,
          ruolo: "studente",
          scuola_id: scuola?.id || null, // assegna la scuola trovata/creata
          classe_id: null,
        },
      ]);

      if (dbError) {
        toast.error(dbError.message);
        setLoading(false);
        return;
      }
    } catch (err: unknown) {
  if (err instanceof Error) {
    console.error(err);
    toast.error(err.message);
  } else {
    console.error(err);
    toast.error("Errore nell'assegnazione della scuola");
  }
  setLoading(false);
  return;
}

  }

  setLoading(false);
  toast.success("Registrazione effettuata con successo! Attiva il tuo account tramite il link inviato alla tua email.");
  router.push("/login");
}


  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google"
    });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  return (
    <>
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
            Registrati a Skoolly
          </motion.h1>
          <form className="flex flex-col gap-4" onSubmit={handleRegister}>
            <label className="text-[#1e293b] font-medium" htmlFor="nome">Nome</label>
            <input
              id="nome"
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b]"
              placeholder="Il tuo nome"
            />
            <label className="text-[#1e293b] font-medium" htmlFor="cognome">Cognome</label>
            <input
              id="cognome"
              type="text"
              required
              value={cognome}
              onChange={e => setCognome(e.target.value)}
              className="px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b]"
              placeholder="Il tuo cognome"
            />
            <label className="text-[#1e293b] font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b]"
              placeholder="Inserisci la tua email"
            />
            <label className="text-[#1e293b] font-medium" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="px-3 py-2 w-full rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] pr-10"
                placeholder="Crea una password sicura"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {password.length < passwordMinLength && 
            <div className="text-sm mt-1">
              <span className={isPasswordLongEnough ? "text-green-600" : "text-red-600"}>
                • Almeno {passwordMinLength} caratteri
              </span>
            </div>
            }
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 0 4px #fbbf24aa" }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="mt-4 w-full py-2 rounded-md bg-[#38bdf8] text-[#1e293b] font-semibold shadow-lg hover:bg-[#fbbf24] hover:text-[#1e293b] transition-all disabled:opacity-60"
            >
              {loading ? "Caricamento..." : "Registrati"}
            </motion.button>
          </form>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-2 rounded-md bg-white border border-[#38bdf8] text-[#1e293b] font-semibold shadow hover:bg-[#38bdf8]/10 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
            Registrati con Google
          </motion.button>
          <div className="text-center text-sm text-[#334155]">
            Hai già un account?{" "}
            <Link href="/login" className="text-[#38bdf8] hover:underline font-medium">
              Accedi
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
      </>
  );
}
