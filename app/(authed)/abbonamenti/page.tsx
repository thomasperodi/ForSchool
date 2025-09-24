// app/(authed)/abbonamenti/page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getUtenteCompleto } from "@/lib/api";

interface CustomError { message: string; code?: string; source?: string; }

type WinEnv = Window & Partial<{
  Capacitor: { getPlatform?: () => "ios" | "android" | "web" };
}>;

const Abbonamenti = dynamic(
  () => import("@/components/Abbonamenti").then((m) => m.Abbonamenti),
  { ssr: false }
);

export default function AbbonamentiPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CustomError | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [promoCodeValid, setPromoCodeValid] = useState<boolean | null>(null);

  const [isMobileApp, setIsMobileApp] = useState(false);

  // Rilevamento ambiente app (Capacitor)
  useEffect(() => {
    const w = window as unknown as WinEnv;
    const cap = w.Capacitor?.getPlatform?.();
    setIsMobileApp(cap === "ios" || cap === "android");
  }, []);

  // Validazione codici promo (web)
  useEffect(() => {
    if (!promoCodeInput.trim()) {
      setPromoCodeValid(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/valid-promo-codes");
        if (!res.ok) throw new Error("Errore nel recupero codici promo");
        const data = (await res.json()) as { codes?: string[] };
        const validCodes = data.codes || [];
        setPromoCodeValid(validCodes.includes(promoCodeInput.toUpperCase()));
      } catch {
        setPromoCodeValid(false);
      }
    })();
  }, [promoCodeInput]);

  // Checkout web (Stripe). In app non viene chiamato.
  const handleCheckout = async (priceId: string) => {
    if (isMobileApp) return; // safety: in app usa RevenueCat dentro al componente
    setLoading(true);
    setError(null);
    try {
      const user = await getUtenteCompleto();
      const response = await fetch("/api/checkout-abbonamenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          promoCode: promoCodeInput,
          userId: user.id,
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Errore durante il checkout web.");
      }
    } catch (err: unknown) {
      setError({
        message: err instanceof Error ? err.message : "Errore sconosciuto durante il checkout",
        code: "CHECKOUT_ERROR",
        source: "Client",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Abbonamenti
      promoCodeInput={promoCodeInput}
      setPromoCodeInput={setPromoCodeInput}
      promoCodeValid={promoCodeValid ?? false}
      loading={loading}
      handleCheckout={handleCheckout}
      isMobileApp={isMobileApp}
    />
  );
}
