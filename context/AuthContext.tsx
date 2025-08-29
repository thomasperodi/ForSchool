"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { GoogleLoginResponse, GoogleLoginResponseOnline, SocialLogin } from "@capgo/capacitor-social-login"
import { useRouter } from "next/navigation";
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  logoutSuccess:boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  loginWithPassword: async () => {},
  loginWithGoogle: async () => {},
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
          mode: 'online', // o 'offline' se vuoi serverAuthCode
        },
      });

      // Login senza wrapper {provider, result}
      const res = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile'] },
      }) ;

      // Ottieni il token corretto
      let token: string;
if ('idToken' in res && typeof res.idToken === 'string') {
  token = res.idToken;
} else if ('serverAuthCode' in res && typeof res.serverAuthCode === 'string') {
  token = res.serverAuthCode;
} else {
  throw new Error('Token Google non disponibile');
}

      // Login con Supabase
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token,
      });
      if (error) throw error;

      // Ottieni sessione
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Sessione non trovata");

      setSession(sessionData.session);

      // Salva token in SecureStorage
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
      // Login Web
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    }
  } catch (err) {
    console.error("Errore loginWithGoogle:", err);
    throw err;
  } finally {
    setLoading(false);
  }
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
      value={{ session, loading, loginWithPassword, loginWithGoogle, logout, isLoggingOut, logoutSuccess }}
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