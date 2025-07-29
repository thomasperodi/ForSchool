"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; // o come importi il client supabase
import { Button } from "@/components/ui/button";

export default function StripePrompt() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? null);

      }
    };
    getUser();
  }, [supabase]);

  const handleCreateStripeAccount = async () => {
    if (!userId || !email) {
      alert("Utente non autenticato");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/stripe-create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, email }),
    });

    const data = await res.json();
    if (data.onboardingUrl) {
      window.location.href = data.onboardingUrl;
    } else {
      setLoading(false);
      alert("Errore nella creazione dell'account Stripe");
    }
  };

  return (
    <div className="text-center">
      <p>Devi creare un account Stripe per accedere alla dashboard.</p>
      <Button onClick={handleCreateStripeAccount} disabled={loading}>
        {loading ? "Reindirizzamento..." : "Crea Account Stripe"}
      </Button>
    </div>
  );
}
