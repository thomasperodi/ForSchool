import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Preferences } from "@capacitor/preferences";

// 🔑 Chiave principale usata da Supabase per la sessione


const supabaseAuthKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!
  .split("//")[1]
  .split(".")[0]}-auth-token`;

const CapacitorStorage = {
  getItem: async (key: string) => {
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value ?? null; // SOLO ritorna null
    } catch (error) {
      console.warn("[CapacitorStorage] getItem errore, uso fallback localStorage:", error);
      return localStorage.getItem(key) ?? null; // SOLO ritorna null
    }
  },
  setItem: async (key: string, value: string) => {
    try { await SecureStoragePlugin.set({ key, value }); } 
    catch { localStorage.setItem(key, value); }
  },
  removeItem: async (key: string) => {
    try { await SecureStoragePlugin.remove({ key }); } 
    catch { localStorage.removeItem(key); }
  },
};

// Pulizia token al primo avvio dopo installazione/reinstallazione
async function cleanFirstLaunchTokens() {
  try {
    const { value } = await Preferences.get({ key: "first_launch" });
    if (!value) {
      console.log("[supabaseClient] Primo avvio: pulizia token residui");
      await CapacitorStorage.removeItem("access_token");
      await CapacitorStorage.removeItem("refresh_token");
      await CapacitorStorage.removeItem(supabaseAuthKey);

      await Preferences.set({ key: "first_launch", value: "true" });
    }
  } catch (error) {
    console.warn("[supabaseClient] Errore nella pulizia iniziale dei token:", error);
  }
}

// Logout → pulizia completa
export async function clearAllTokens() {
  console.log("[supabaseClient] Pulizia completa di tutti i token");

  if (Capacitor.isNativePlatform()) {
    await CapacitorStorage.removeItem("access_token");
    await CapacitorStorage.removeItem("refresh_token");
    await CapacitorStorage.removeItem(supabaseAuthKey);
    try {
      await Preferences.remove({ key: "first_launch" });
    } catch (error) {
      console.warn("[supabaseClient] Errore nella pulizia preferenze:", error);
    }
  } else {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem(supabaseAuthKey);
  }
}

// Esegui pulizia al primo avvio nativo
if (Capacitor.isNativePlatform()) {
  cleanFirstLaunchTokens();
}

// ✅ Client Supabase
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
