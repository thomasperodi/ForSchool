"use client";

import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CartProvider } from "@/context/CartContext";
import { SessionContextProvider, useSessionContext } from "@supabase/auth-helpers-react";
import { ThemeProvider } from "@/components/theme-provider";
import { StatusBar, Style } from "@capacitor/status-bar";


export default function Providers({ children }: { children: React.ReactNode }) {
  
    useEffect(() => {
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  }, []);
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const applyTheme = (t: string) => {
      const root = document.documentElement;
      if (t === "dark") root.classList.add("dark");
      else if (t === "light") root.classList.remove("dark");
      else if (t === "auto") {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    const fetchAndApplyTheme = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          applyTheme("auto");
          return;
        }

        const { data } = await supabase
          .from("utenti")
          .select("tema")
          .eq("id", user.id)
          .single();

        const tema = data?.tema || "auto";
        applyTheme(tema);

        unsubscribe = supabase
          .channel("public:utenti")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "utenti",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              const nuovoTema = payload.new.tema || "auto";
              applyTheme(nuovoTema);
            }
          )
          .subscribe().unsubscribe;
      } catch {
        applyTheme("auto");
      }
    };

    fetchAndApplyTheme();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider >
    <SessionContextProvider supabaseClient={supabase}>

      <CartProvider>
        {children}
        <Toaster
            position="top-center"
            toastOptions={{ duration: 4000 }}
            containerClassName="safe-area-mtop"
          />
      </CartProvider>

    </SessionContextProvider>
    </ThemeProvider>
  );
}
