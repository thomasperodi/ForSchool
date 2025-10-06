// app/login/page.tsx
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
import { App } from "@capacitor/app";
import { Button } from "@/components/ui/button";
import type { AppleProviderResponse } from "@capgo/capacitor-social-login"; // opzionale

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isIOS, setIsIOS] = useState(false);
  const hasNavigatedRef = useRef(false);

  // ————————————————————————————————————————————————
  // Helper: ambiente & chiave marker compatibile con AuthLayout
  // ————————————————————————————————————————————————
  const isNative = () => Capacitor.isNativePlatform();

  const getTokenKey = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // es: https://abcdedfghijk.supabase.co -> abcdedfghijk
    const projectRef = url.includes("//") ? url.split("//")[1].split(".")[0] : "supabase";
    return `sb-${projectRef}-auth-token`;
  };
  const TOKEN_KEY = getTokenKey();

  // ————————————————————————————————————————————————
  // Persistenza locale (tutte funzioni locali al file)
  // ————————————————————————————————————————————————
  async function setAuthMarker(session?: any) {
    const marker = session
      ? JSON.stringify({ sessionExists: true, user: session.user?.id, ts: Date.now() })
      : "1";
    if (isNative()) {
      await SecureStoragePlugin.set({ key: TOKEN_KEY, value: marker }).catch(() => {});
    } else {
      localStorage.setItem(TOKEN_KEY, marker);
    }
  }

  async function saveSession(session: {
    access_token: string;
    refresh_token: string;
    raw?: any;
  }) {
    const { access_token, refresh_token, raw } = session;
    if (isNative()) {
      await SecureStoragePlugin.set({ key: "access_token", value: access_token }).catch(() => {});
      await SecureStoragePlugin.set({ key: "refresh_token", value: refresh_token }).catch(() => {});
      if (raw) {
        await SecureStoragePlugin.set({
          key: "sb-session-json",
          value: JSON.stringify(raw),
        }).catch(() => {});
      }
    } else {
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      if (raw) localStorage.setItem("sb-session-json", JSON.stringify(raw));
    }
    await setAuthMarker(raw);
  }

  async function clearSession() {
    if (isNative()) {
      await SecureStoragePlugin.remove({ key: "access_token" }).catch(() => {});
      await SecureStoragePlugin.remove({ key: "refresh_token" }).catch(() => {});
      await SecureStoragePlugin.remove({ key: "sb-session-json" }).catch(() => {});
      await SecureStoragePlugin.remove({ key: TOKEN_KEY }).catch(() => {});
    } else {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("sb-session-json");
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  async function loadSavedTokens(): Promise<{ access_token?: string; refresh_token?: string }> {
    if (isNative()) {
      const at = await SecureStoragePlugin.get({ key: "access_token" }).catch(() => null);
      const rt = await SecureStoragePlugin.get({ key: "refresh_token" }).catch(() => null);
      return { access_token: at?.value || undefined, refresh_token: rt?.value || undefined };
    }
    return {
      access_token: localStorage.getItem("access_token") || undefined,
      refresh_token: localStorage.getItem("refresh_token") || undefined,
    };
  }

  // ————————————————————————————————————————————————
  // Redirect sicuro
  // ————————————————————————————————————————————————
  const safeRedirectHome = useCallback(async () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (isNative()) {
      window.location.href = "/home";
      setTimeout(() => {
        if (window.location.pathname === "/login") {
          window.location.href = "/home";
        }
      }, 1500);
    } else {
      router.replace("/home");
    }
  }, [router]);

  // ————————————————————————————————————————————————
  // Cookie client type (web/native) – lasciato come nel tuo codice
  // ————————————————————————————————————————————————
  useEffect(() => {
    const setClientCookie = async () => {
      try {
        const info = await Device.getInfo();
        const isMobile = info.platform !== "web";
        const type = isMobile ? "mobile" : "web";
        await fetch(`/api/auth/set-client?type=${type}`, { method: "GET", credentials: "include" });
      } catch (err) {
        console.error("Errore nel settaggio del cookie:", err);
      }
    };
    setClientCookie();
  }, []);

  // ————————————————————————————————————————————————
  // Rileva iOS per mostrare il pulsante Apple
  // ————————————————————————————————————————————————
  useEffect(() => {
    async function checkPlatform() {
      if (isNative()) {
        const info = await Device.getInfo();
        setIsIOS(info.operatingSystem === "ios");
      }
    }
    checkPlatform();
  }, []);

  // ————————————————————————————————————————————————
  // Resume/foreground: se già autenticato → /home
  // ————————————————————————————————————————————————
  useEffect(() => {
    if (!isNative()) return;

    const removeResume = App.addListener("resume", async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) await safeRedirectHome();
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
        if (session?.user) await safeRedirectHome();
      } catch (e) {
        console.log("Errore su appStateChange:", e);
      }
    });

    return () => {
      removeResume.then((l) => l.remove());
      removeState.then((l) => l.remove());
    };
  }, [safeRedirectHome]);

  // ————————————————————————————————————————————————
  // Inizializza provider Apple (Capacitor SocialLogin)
  // ————————————————————————————————————————————————
  useEffect(() => {
    SocialLogin.initialize({
      apple: {
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID!,
      },
    });
  }, []);

  // ————————————————————————————————————————————————
  // Nonce + sha256 + decode JWT helpers
  // ————————————————————————————————————————————————
  function makeNonce(bytesLen = 32): string {
    const toBase64Url = (bytes: Uint8Array) => {
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
      return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    };
    const arr = new Uint8Array(bytesLen);
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(arr);
      return toBase64Url(arr);
    }
    for (let i = 0; i < bytesLen; i++) arr[i] = Math.floor(Math.random() * 256);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(input: string): Promise<string> {
    if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
      const data = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    const mod = await import("js-sha256");
    const sha256Fn = (mod && (mod.sha256 || mod.default)) as (s: string) => string;
    return sha256Fn(input);
  }

  function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // ————————————————————————————————————————————————
  // Listener globale auth: salva token (nativo) + cookie (web) + redirect
  // ————————————————————————————————————————————————
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log("Auth event:", event, !!session?.user);
      if (event === "SIGNED_IN" && session?.user) {
        // Salva token e marker per AuthLayout (nativo o web)
        await saveSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          raw: session,
        });

        // Cookie solo su web
        if (!isNative()) {
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
        }

        await safeRedirectHome();
      }

      if (event === "SIGNED_OUT") {
        await clearSession();
      }

      if (event === "TOKEN_REFRESHED" && session) {
        await saveSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          raw: session,
        });
      }
    });

    return () => {
      try {
        data.subscription?.unsubscribe?.();
      } catch {}
    };
  }, [safeRedirectHome]);

  // ————————————————————————————————————————————————
  // Email/Password login
  // ————————————————————————————————————————————————
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    hasNavigatedRef.current = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange gestirà salvataggio e redirect
      if (isNative() && data.session) {
        await saveSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          raw: data.session,
        });
      }
    } catch (err: any) {
      const status = err?.status as number | undefined;
      const message: string =
        err?.message || (err instanceof Error ? err.message : String(err) || "Errore login");

      try {
        if (status === 429) toast.error("Troppe richieste. Riprova tra poco.");
        else if (/email\s*not\s*confirmed/i.test(message)) {
          toast.error("Email non verificata. Controlla la tua casella di posta.");
        } else if (/invalid.*credential/i.test(message)) {
          const { data: existing } = await supabase
            .from("utenti")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (!existing) toast.error("Email non registrata");
          else toast.error("Password errata");
        } else if (/network|fetch|connection/i.test(message)) {
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

  // ————————————————————————————————————————————————
  // Google login (web + nativo)
  // ————————————————————————————————————————————————
  type GoogleLoginOfflineResult = {
    provider: "google";
    result: { responseType: "offline"; serverAuthCode: string };
  };

  async function handleWebLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }

  async function handleNativeLogin() {
    hasNavigatedRef.current = false;
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
    const serverAuthCode = googleResponse?.result?.serverAuthCode;
    if (!serverAuthCode) throw new Error("serverAuthCode non disponibile");

    const resp = await fetch("/api/auth/exchange-google-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: serverAuthCode }),
    });

    const { id_token } = await resp.json();
    if (!id_token) throw new Error("id_token non ricevuto dal backend");

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: id_token,
    });
    if (error) throw error;

    // salvataggio immediato (comunque il listener farà il resto)
    if (data.session) {
      await saveSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        raw: data.session,
      });
    }

    toast.success("Login effettuato con Google");
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      if (isNative()) {
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

  // ————————————————————————————————————————————————
  // Apple login (nativo) → Supabase → salva token + marker
  // ————————————————————————————————————————————————
async function handleAppleLogin() {
  setLoading(true);
  try {
    console.log("Inizializzo login Apple");

    // 1) Nonce
    const rawNonce = makeNonce(32);
    const hashedNonce = await sha256Hex(rawNonce);

    // 2) Apple sign-in via plugin
    const res = await SocialLogin.login({
      provider: "apple",
      options: {
        scopes: ["email", "name"],
        nonce: hashedNonce, // Apple richiede l'hash del nonce
      },
    });

    console.log("Apple login result:", res);

    // Il plugin tipicamente ritorna { provider, result: { idToken, accessToken, ... } }
    const apple = (res as {
      provider: string;
      result?: { idToken?: string; accessToken?: { token?: string } };
    }).result;

    const idToken = apple?.idToken;
    const accessToken = apple?.accessToken?.token;

    // 3) scegli un JWT valido (idToken preferito)
    const tokenToUse =
      idToken && idToken.split(".").length === 3
        ? idToken
        : accessToken && accessToken.split(".").length === 3
        ? accessToken
        : undefined;

    if (!tokenToUse) {
      throw new Error("Nessun token JWT valido da Apple");
    }

    // 4) check opzionale del nonce nel token
    const decoded = decodeJwtPayload(tokenToUse) as
      | { nonce?: string; nonce_supported?: number; aud?: string }
      | null;

    if (decoded?.nonce && decoded.nonce !== rawNonce) {
      console.warn("⚠️ Nonce mismatch:", {
        generated: rawNonce,
        token: decoded?.nonce,
      });
      // Non blocco: alcuni provider rimappano il nonce; Supabase verifica internamente.
    }

    console.log("Tentativo login Supabase con nonce raw");

    // 5) Login su Supabase passando JWT + nonce RAW
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: tokenToUse,
      nonce: rawNonce, // RAW (Supabase lo confronterà con quello hashato in id_token)
    });
    console.log("Supabase signInWithIdToken result:",  data.session );
    
    if (error) throw error;

    toast.success("Login effettuato con Apple!");
  } catch (err) {
    console.error("Errore Apple login:", err);
    toast.error("Errore durante il login con Apple");
  } finally {
    setLoading(false);
  }
}

  // ————————————————————————————————————————————————
  // Ripristino sessione nativo all’avvio
  // ————————————————————————————————————————————————
  useEffect(() => {
    async function restoreSession() {
      if (!isNative()) return;
      try {
        const { access_token, refresh_token } = await loadSavedTokens();
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error("Errore restore session:", error.message);
            await clearSession();
          } else if (data.session?.user) {
            // riallinea marker in caso fosse mancante
            await saveSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              raw: data.session,
            });
            await safeRedirectHome();
          }
        }
      } catch (err) {
        console.log("Nessuna sessione salvata:", err);
      }
    }
    restoreSession();
  }, [safeRedirectHome]);

  // ————————————————————————————————————————————————
  // Se già autenticato su mobile all’avvio → /home
  // ————————————————————————————————————————————————
  useEffect(() => {
    const checkInitialAuth = async () => {
      if (isNative()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await saveSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              raw: session,
            });
            await safeRedirectHome();
          }
        } catch (error) {
          console.log("Errore nel controllo iniziale dell'autenticazione:", error);
        }
      }
    };
    checkInitialAuth();
  }, [safeRedirectHome]);

  // ————————————————————————————————————————————————
  // UI
  // ————————————————————————————————————————————————
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
              onClick={async () => {
                if (!email) return toast.error("Inserisci la tua email");
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(error.message);
                else toast.success("Email di reset inviata!");
              }}
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
              <Apple size={20} />
              Accedi con Apple
            </Button>
          )}

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
