"use client";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Providers({ children }: { children: React.ReactNode }) {
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
        const { data: { user } } = await supabase.auth.getUser();
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
        applyTheme("auto"); // fallback in caso di errore
      }
    };

    fetchAndApplyTheme();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <>
      {children}
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </>
  );
}
