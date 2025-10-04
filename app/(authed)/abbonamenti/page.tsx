// app/(authed)/abbonamenti/page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getUtenteCompleto } from "@/lib/api";

type WinEnv = Window & Partial<{
  Capacitor: { getPlatform?: () => "ios" | "android" | "web" };
}>;

const Abbonamenti = dynamic(() => import("@/components/Abbonamenti"), { ssr: false });

interface CustomError { message: string; code?: string; source?: string; }

export default function AbbonamentiPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CustomError | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [promoCodeValid, setPromoCodeValid] = useState<boolean>(false);

  const [isMobileApp, setIsMobileApp] = useState(false);

  // Rilevamento ambiente app (Capacitor) – robusto
  useEffect(() => {
    try {
      const w = window as unknown as WinEnv;
      const cap = w?.Capacitor?.getPlatform?.();
      if (cap === "ios" || cap === "android") {
        setIsMobileApp(true);
        return;
      }
    } catch {/* ignore */}
    setIsMobileApp(false);
  }, []);

  // ✅ Validazione codici promo solo su WEB
  useEffect(() => {
    if (isMobileApp) return; // in app la validazione avviene nel componente via /api/promo/validate
    const code = promoCodeInput.trim();
    if (!code) {
      setPromoCodeValid(false);
      return;
    }

    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/valid-promo-codes");
        if (!res.ok) throw new Error("Errore nel recupero codici promo");
        const data = (await res.json()) as { codes?: string[] };
        const validCodes = (data.codes ?? []).map((c) => c.toUpperCase());
        if (!aborted) setPromoCodeValid(validCodes.includes(code.toUpperCase()));
      } catch {
        if (!aborted) setPromoCodeValid(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [promoCodeInput, isMobileApp]);

  // Checkout web (Stripe). In app non viene chiamato.
  const handleCheckout = async (priceId: string) => {
    if (isMobileApp) return; // safety: in app si usa RevenueCat dentro al componente
    setLoading(true);
    setError(null);
    try {
      const user = await getUtenteCompleto();
      const response = await fetch("/api/checkout-abbonamenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          promoCode: promoCodeInput.trim(),
          userId: user.id,
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Errore durante il checkout web.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Errore sconosciuto durante il checkout";
      setError({ message, code: "CHECKOUT_ERROR", source: "Client" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Abbonamenti
      promoCodeInput={promoCodeInput}
      setPromoCodeInput={setPromoCodeInput}
      promoCodeValid={promoCodeValid}
      loading={loading}
      handleCheckout={handleCheckout}
      isMobileApp={isMobileApp}
    />
  );
}
