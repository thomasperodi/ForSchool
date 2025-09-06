import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Preferences } from "@capacitor/preferences";

const CapacitorStorage = {
  getItem: async (key: string) => {
    try {
      // Verifica che il plugin sia disponibile
      if (!SecureStoragePlugin || typeof SecureStoragePlugin.get !== 'function') {
        console.warn('[CapacitorStorage] SecureStoragePlugin non disponibile, uso localStorage');
        return localStorage.getItem(key);
      }
      
      const result = await SecureStoragePlugin.get({ key });
      return result?.value || null;
    } catch (error) {
      console.warn('[CapacitorStorage] Errore SecureStoragePlugin.get, fallback a localStorage:', error);
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // Verifica che il plugin sia disponibile
      if (!SecureStoragePlugin || typeof SecureStoragePlugin.set !== 'function') {
        console.warn('[CapacitorStorage] SecureStoragePlugin non disponibile, uso localStorage');
        localStorage.setItem(key, value);
        return;
      }
      
      await SecureStoragePlugin.set({ key, value });
    } catch (error) {
      console.warn('[CapacitorStorage] Errore SecureStoragePlugin.set, fallback a localStorage:', error);
      try {
        localStorage.setItem(key, value);
      } catch (fallbackError) {
        console.error('[CapacitorStorage] Errore anche con localStorage:', fallbackError);
      }
    }
  },
  removeItem: async (key: string) => {
    try {
      // Verifica che il plugin sia disponibile
      if (!SecureStoragePlugin || typeof SecureStoragePlugin.remove !== 'function') {
        console.warn('[CapacitorStorage] SecureStoragePlugin non disponibile, uso localStorage');
        localStorage.removeItem(key);
        return;
      }
      
      await SecureStoragePlugin.remove({ key });
    } catch (error) {
      console.warn('[CapacitorStorage] Errore SecureStoragePlugin.remove, fallback a localStorage:', error);
      try {
        localStorage.removeItem(key);
      } catch (fallbackError) {
        console.error('[CapacitorStorage] Errore anche con localStorage:', fallbackError);
      }
    }
  },
};

// Pulizia token alla prima installazione/reinstall
async function cleanFirstLaunchTokens() {
  try {
    const { value } = await Preferences.get({ key: "first_launch" });
    if (!value) {
      console.log("[supabaseClient] Primo avvio: pulisco i token residui");
      await CapacitorStorage.removeItem("access_token");
      await CapacitorStorage.removeItem("refresh_token");
      await CapacitorStorage.removeItem(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`);
      await Preferences.set({ key: "first_launch", value: "true" });
    }
  } catch (error) {
    console.warn("[supabaseClient] Errore nella pulizia iniziale dei token:", error);
  }
}

// Funzione per pulire tutti i token (utile per logout completo)
export async function clearAllTokens() {
  if (Capacitor.isNativePlatform()) {
    console.log("[supabaseClient] Pulizia completa di tutti i token");
    
    // Pulisce i token usando CapacitorStorage (che ha fallback)
    await CapacitorStorage.removeItem("access_token");
    await CapacitorStorage.removeItem("refresh_token");
    await CapacitorStorage.removeItem(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`);
    
    // Pulisce anche le preferenze
    try {
      await Preferences.remove({ key: "first_launch" });
    } catch (error) {
      console.warn("[supabaseClient] Errore nella pulizia delle preferenze:", error);
    }
  } else {
    // Su web, pulisce localStorage
    const key = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`;
    localStorage.removeItem(key);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
}

if (Capacitor.isNativePlatform()) {
  cleanFirstLaunchTokens();
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: Capacitor.isNativePlatform() ? CapacitorStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: !Capacitor.isNativePlatform(),
    },
  }
);
