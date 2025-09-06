import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Preferences } from "@capacitor/preferences";

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
    } catch {}
  },
};

// Pulizia token alla prima installazione/reinstall
async function cleanFirstLaunchTokens() {
  const { value } = await Preferences.get({ key: "first_launch" });
  if (!value) {
    console.log("Primo avvio: pulisco i token residui");
    await CapacitorStorage.removeItem("access_token");
    await CapacitorStorage.removeItem("refresh_token");
    await Preferences.set({ key: "first_launch", value: "true" });
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
