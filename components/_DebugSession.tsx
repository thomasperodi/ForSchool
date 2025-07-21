"use client";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import type { User } from '@supabase/supabase-js';

export default function DebugSession({ user }: { user?: User | null }) {
  useEffect(() => {
    if (user) {
      console.log("[Supabase] Sessione utente:", user);
      const domain = user.email?.split("@")[1];
      console.log("Domain:", domain);
      if (domain) {
        fetch(`/api/scuole?domain=${domain}`)
          .then(res => res.json())
          .then(res => {
            console.log("[SCUOLA] Risposta API /api/scuole:", res);
          });
      }
    } else {
      console.log("[Supabase] Nessuna sessione utente attiva");
    }
  }, [user]);
  return null;
} 