// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Preferences } from "@capacitor/preferences";

// ---- Tipi compatibili con supabase-js (storage asincrono/sincrono) ----------
type StorageAdapter = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

// ---- ENV --------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    "[supabaseClient] Env mancanti: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

const supabaseAuthKey = `sb-${SUPABASE_URL.split("//")[1].split(".")[0]}-auth-token`;

// ---- Helpers localStorage (SSR safe) ----------------------------------------
const safeLocalGet = (key: string): string | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeLocalSet = (key: string, value: string): void => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {}
};
const safeLocalRemove = (key: string): void => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {}
};

// ---- Adapter nativo (Capacitor SecureStorage con fallback a localStorage) ----
const NativeStorageAdapter: StorageAdapter = {
  async getItem(key) {
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value ?? null;
    } catch (error) {
      console.warn("[CapacitorStorage] getItem errore, fallback localStorage:", error);
      return safeLocalGet(key);
    }
  },
  async setItem(key, value) {
    try {
      await SecureStoragePlugin.set({ key, value });
    } catch {
      safeLocalSet(key, value);
    }
  },
  async removeItem(key) {
    try {
      await SecureStoragePlugin.remove({ key });
    } catch {
      safeLocalRemove(key);
    }
  },
};

// ---- Pulizia primo avvio (solo nativo) --------------------------------------
async function cleanFirstLaunchTokens(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: "first_launch" });
    if (!value) {
      console.log("[supabaseClient] Primo avvio: pulizia token residui");
      await NativeStorageAdapter.removeItem("access_token");
      await NativeStorageAdapter.removeItem("refresh_token");
      await NativeStorageAdapter.removeItem(supabaseAuthKey);
      await Preferences.set({ key: "first_launch", value: "true" });
    }
  } catch (error) {
    console.warn("[supabaseClient] Errore pulizia iniziale token:", error);
  }
}

if (Capacitor.isNativePlatform()) {
  void cleanFirstLaunchTokens();
}

// ---- API pubblica per logout/pulizia ----------------------------------------
export async function clearAllTokens(): Promise<void> {
  console.log("[supabaseClient] Pulizia completa di tutti i token");
  if (Capacitor.isNativePlatform()) {
    await NativeStorageAdapter.removeItem("access_token");
    await NativeStorageAdapter.removeItem("refresh_token");
    await NativeStorageAdapter.removeItem(supabaseAuthKey);
    try {
      await Preferences.remove({ key: "first_launch" });
    } catch (error) {
      console.warn("[supabaseClient] Errore nella pulizia preferenze:", error);
    }
  } else {
    safeLocalRemove("access_token");
    safeLocalRemove("refresh_token");
    safeLocalRemove(supabaseAuthKey);
  }
}

// ---- Create client ----------------------------------------------------------
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storageKey: supabaseAuthKey,
    // Su nativo passiamo l’adapter asincrono; sul web usiamo lo storage di default
    storage: Capacitor.isNativePlatform() ? NativeStorageAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
});
