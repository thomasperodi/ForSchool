import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const CapacitorStorage = {
  getItem: async (key: string) => {
    try {
      const result = await SecureStoragePlugin.get({ key });
      return result.value;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    await SecureStoragePlugin.set({ key, value });
  },
  removeItem: async (key: string) => {
    try {
      await SecureStoragePlugin.remove({ key });
    } catch {
      // ignoriamo se non esiste
    }
  },
};

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
