"use client"; 

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, clearAllTokens } from "@/lib/supabaseClient";
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
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const router = useRouter();

  // -------------------- Listener primo login --------------------
  useEffect(() => {
    let hadSession = false;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setLoading(false);

        // Primo login → redirect
        if (event === "SIGNED_IN" && session && !hadSession) {
          hadSession = true;
          console.log("Login rilevato, reindirizzamento in corso...");
          
          // Piccolo delay per assicurarsi che la sessione sia completamente impostata
          setTimeout(() => {
            if (Capacitor.isNativePlatform()) {
              toast.success("Login effettuato!");
              router.replace("/home");
            } else {
              router.replace("/home");
            }
          }, 100);
        }

        if (event === "SIGNED_OUT") {
          hadSession = false;
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  // -------------------- Restore session --------------------
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session ?? null);
      } catch (err) {
        console.error("Errore restoreSession:", err);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // -------------------- Redirect post restore --------------------
  useEffect(() => {
    if (!loading && Capacitor.isNativePlatform()) {
      if (session) router.replace("/home");
      else router.replace("/login");
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

  // -------------------- Logout --------------------
  async function logout() {
    setIsLoggingOut(true);
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
      if (signOutError) throw signOutError;

      setSession(null);

      // Pulizia completa di tutti i token
      await clearAllTokens();

      if (!Capacitor.isNativePlatform()) {
        const key = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`;
        localStorage.removeItem(key);
      }

      await fetch("/api/auth/logout", { method: "POST" });

      setLogoutSuccess(true);
    } catch (err) {
      setLogoutSuccess(false);
      throw err;
    } finally {
      setIsLoggingOut(false);
      setLoading(false);
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
