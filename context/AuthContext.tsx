"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { GoogleLoginResponse, GoogleLoginResponseOnline, SocialLogin } from "@capgo/capacitor-social-login"
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  handleLoginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  logoutSuccess:boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  loginWithPassword: async () => {},
  handleLoginGoogle: async () => {},
  logout: async () => {},
  isLoggingOut: false,
  logoutSuccess: false
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const [logoutSuccess, setLogoutSuccess] = useState(false);


useEffect(() => {
  console.log("[AuthContext] Inizializzazione listener onAuthStateChange");
  const { data: authListener } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log(`[AuthContext] Evento Supabase: ${event}`);
      console.log(`[AuthContext] Sessione attuale:`, session);

      setSession(session);
      setLoading(false);
      setLogoutSuccess(false);

      if (event === "SIGNED_IN" && session) {
        if (Capacitor.isNativePlatform()) {
          // ✅ Mostra toast e redirect solo su app nativa
          console.log("[AuthContext] Utente autenticato, reindirizzamento a /home");
          toast.success("Login effettuato con successo!");
          router.replace("/home");
        } else {
          // 🔹 Su web OAuth, lascia che /auth/callback gestisca toast e redirect
          console.log("[AuthContext] Web OAuth login, attendo callback...");
        }
      }
    }
  );

  return () => {
    console.log("[AuthContext] Pulizia listener onAuthStateChange");
    authListener.subscription.unsubscribe();
  };
}, [router]);


  // ---------------- Restore session ----------------
  useEffect(() => {
    async function restoreSession() {
      try {
        let refreshToken: string | null = null;

        if (Capacitor.isNativePlatform()) {
          const result = await SecureStoragePlugin.get({ key: "refresh_token" });
          refreshToken = result.value || null;
        }

        if (refreshToken) {
          const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
          if (!error && data.session) {
            setSession(data.session);

            // Aggiorna SecureStorage
            await SecureStoragePlugin.set({ key: "access_token", value: data.session.access_token });
            await SecureStoragePlugin.set({ key: "refresh_token", value: data.session.refresh_token });
          }
        } else {
          const { data } = await supabase.auth.getSession();
          if (data.session) setSession(data.session);
        }
      } catch (err) {
        console.error("Errore restoreSession:", err);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);
  // ---------------- Redirect dopo caricamento ----------------
  useEffect(() => {
    if (!loading) {
      if (Capacitor.isNativePlatform()) {
        if (session) {
          router.replace("/home");
        } else {
          router.replace("/login");
        }
      }
    }
  }, [loading, session, router]);

  // ---------------- Login email/password ----------------
  async function loginWithPassword(email: string, password: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error("Sessione non trovata");

      setSession(data.session);

      if (Capacitor.isNativePlatform()) {
        await SecureStoragePlugin.set({ key: "access_token", value: data.session.access_token });
        await SecureStoragePlugin.set({ key: "refresh_token", value: data.session.refresh_token });
      }

      // Aggiorna cookie lato server per middleware
      await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });
    } catch (err) {
      console.error("Errore loginWithPassword:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Login Google ----------------

// Tipo unione corretto

type GoogleProfile = {
  email: string | null;
  familyName: string | null;
  givenName: string | null;
  id: string | null;
  name: string | null;
  imageUrl: string | null;
};

type GoogleLoginResult = {
  provider: 'google';
  result: {
    idToken: string | null;
    profile: GoogleProfile;
  };
};

type GoogleLoginOfflineResult = {
  provider: 'google';
  result: {
    responseType: 'offline';
    serverAuthCode: string;
  };
};
async function loginWithGoogle() {
  setLoading(true);
  try {
    if (Capacitor.isNativePlatform()) {
      const iOSClientId = process.env.NEXT_PUBLIC_IOS_GOOGLE_CLIENT_ID;
      if (!iOSClientId) throw new Error("iOS Client ID mancante");

      await SocialLogin.initialize({
        google: {
          webClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          iOSClientId,
          iOSServerClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          mode: 'offline',
        },
      });

      const res = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile'] },
      });

      console.log(res)
      

const googleResponse = res as GoogleLoginOfflineResult;
const { serverAuthCode } = googleResponse.result;

if (!serverAuthCode) throw new Error('serverAuthCode non disponibile');

// Invia al backend per ottenere idToken
const resp = await fetch('/api/auth/exchange-google-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: serverAuthCode }),
});

console.log("risposta exchange", resp)
const { id_token } = await resp.json();
if (!id_token) throw new Error('id_token non ricevuto dal backend');

// Continua con il login su Supabase
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: id_token,
});
if (error) throw error;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Sessione non trovata");

      setSession(sessionData.session);
      await SecureStoragePlugin.set({ key: 'access_token', value: sessionData.session.access_token });
      await SecureStoragePlugin.set({ key: 'refresh_token', value: sessionData.session.refresh_token });

      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        }),
      });
    } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) toast.error(error.message);
      }
  } catch (err) {
    console.error("Errore loginWithGoogle:", err);
    throw err;
  } finally {
    setLoading(false);
  }
}

async function handleWebLogin() {
  // Avvia il processo di reindirizzamento
  console.log(window.location.origin)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
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
          mode: 'offline',
        },
      });

      const res = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile'] },
      });

      console.log(res)
      

const googleResponse = res as GoogleLoginOfflineResult;
const { serverAuthCode } = googleResponse.result;

if (!serverAuthCode) throw new Error('serverAuthCode non disponibile');

// Invia al backend per ottenere idToken
const resp = await fetch('/api/auth/exchange-google-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: serverAuthCode }),
});

console.log("risposta exchange", resp)
const { id_token } = await resp.json();
if (!id_token) throw new Error('id_token non ricevuto dal backend');

// Continua con il login su Supabase
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: id_token,
});
if (error) throw error;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Sessione non trovata");

      setSession(sessionData.session);
      await SecureStoragePlugin.set({ key: 'access_token', value: sessionData.session.access_token });
      await SecureStoragePlugin.set({ key: 'refresh_token', value: sessionData.session.refresh_token });

      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        }),
      });
}

async function handleLoginGoogle() {
  
    await handleNativeLogin();
  
}

  // ---------------- Logout ----------------
async function logout() {
  setIsLoggingOut(true); // 🔹 Set isLoggingOut to true immediately
  setLoading(true);
  try {
    console.log("[logout] Inizio logout su Supabase");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("[logout] Errore Supabase signOut:", signOutError);
      throw signOutError; // Re-throw the error to be caught in the catch block
    } else {
      console.log("[logout] Logout Supabase completato");
    }

    setSession(null);

    if (Capacitor.isNativePlatform()) {
      console.log("[logout] Rimozione token SecureStorage");
      await SecureStoragePlugin.remove({ key: "access_token" }).catch((e) =>
        console.error("[logout] Errore rimozione access_token:", e)
      );
      await SecureStoragePlugin.remove({ key: "refresh_token" }).catch((e) =>
        console.error("[logout] Errore rimozione refresh_token:", e)
      );
    }

    console.log("[logout] Chiamata API /api/auth/logout");
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      console.error("[logout] API logout error:", data);
      throw new Error("API logout failed");
    } else {
      console.log("[logout] API logout completata con successo:", data);
    }
    
    // Set success flag here, AFTER all async operations are complete and successful.
    setLogoutSuccess(true); 

  } catch (err) {
    console.error("[logout] Errore catch:", err);
    // If an error occurs, do not set logoutSuccess to true
    setLogoutSuccess(false);
    throw err; // Re-throw the error so the caller can handle it
  } finally {
    setLoading(false);
    setIsLoggingOut(false); // 🔹 logout finished
    console.log("[logout] Logout completato, loading impostato a false");
  }
}




  return (
    <AuthContext.Provider
      value={{ session, loading, loginWithPassword, handleLoginGoogle, logout, isLoggingOut, logoutSuccess }}
    >
      {/* Mostra loading screen fino a quando restoreSession ha finito */}
      {loading ? (
        <div className="w-full h-screen flex items-center justify-center bg-white">
          <span className="text-gray-700 text-lg">Caricamento...</span>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
