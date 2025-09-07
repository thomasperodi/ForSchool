// app/abbonamenti/page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getUtenteCompleto } from "@/lib/api";

interface CustomError {
  message: string;
  code?: string;
  source?: string;
}

interface IAPProduct {
  id: string;
  transaction?: Record<string, unknown>;
  finish: () => void;
}

interface IAPError {
  code?: string | number;
  message?: string;
  [key: string]: unknown;
}
declare global {
  interface Window {
    store: Store;
    capacitor?: Record<string, unknown>;
  }
}
interface Store {
  register: (product: { id: string; type: string }) => void;
  ready: (callback: () => void) => void;
  when: (productId: string) => {
    approved: (callback: (product: IAPProduct) => void) => void;
  };
  error: (callback: (err: IAPError) => void) => void;
  refresh: () => void;
  order: (productId: string) => void;
  PAID_SUBSCRIPTION: string;
  products?: IAPProduct[];
}

// Props del componente Abbonamenti
interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: React.Dispatch<React.SetStateAction<string>>;
  promoCodeValid: boolean;
  loading: boolean;
  handleCheckout: (productId: string) => void;
  isMobileApp: boolean;
}

// Import dinamico tipizzato per evitare errori TS e mismatch SSR
const Abbonamenti = dynamic<AbbonamentiProps>(
  () =>
    import("@/components/Abbonamenti").then((mod) => mod.Abbonamenti),
  { ssr: false }
);

export default function AbbonamentiPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CustomError | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [promoCodeValid, setPromoCodeValid] = useState<boolean | null>(null);

  const [iapReady, setIapReady] = useState(false);
  const [isMobileApp, setIsMobileApp] = useState(false);

  // Determina se siamo su app mobile solo lato client
  useEffect(() => {
    setIsMobileApp(!!window.cordova || !!window.capacitor);
  }, []);

  // Validazione promo codice lato web
  useEffect(() => {
    if (!promoCodeInput.trim()) {
      setPromoCodeValid(null);
      return;
    }

    const fetchValidCodes = async () => {
      try {
        const response = await fetch("/api/valid-promo-codes");
        if (!response.ok) throw new Error("Errore nel recupero codici promo");
        const data = await response.json();
        const validCodes: string[] = data.codes || [];
        setPromoCodeValid(validCodes.includes(promoCodeInput.toUpperCase()));
      } catch (err) {
        console.error("Errore validazione codice promo:", err);
        setPromoCodeValid(false);
      }
    };

    fetchValidCodes();
  }, [promoCodeInput]);

  // Inizializzazione IAP lato mobile
  useEffect(() => {
    if (!isMobileApp) return;

    const initIAP = () => {
      const store = window.store;
      if (!store) {
        console.error("Store non disponibile");
        return;
      }

      if (typeof store.register !== "function") {
        console.error("Store non pronto: register non disponibile", store);
        return;
      }

      const productId = "it.skoolly.app.abbonamento.mensile";

      store.register({ id: productId, type: store.PAID_SUBSCRIPTION });

      store.ready(() => {
        console.log("Store pronto", store.products);
        setIapReady(true);
      });

      store.when(productId).approved((product: IAPProduct) => {
        product.finish();
        console.log("Abbonamento attivato (IAP)", product);
        // Aggiorna backend/Supabase con receipt
      });

      store.error((err: IAPError) => {
        console.error("Errore IAP:", err);
        setError({ message: err.message || "Errore IAP sconosciuto", source: "IAP" });
      });

      store.refresh();
    };

    if (window.cordova) {
      document.addEventListener("deviceready", initIAP, false);
    } else {
      // Capacitor: esegui subito
      initIAP();
    }
  }, [isMobileApp]);

  // Checkout (Stripe web o IAP mobile)
  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    setError(null);

    try {
      if (isMobileApp) {
        if (!iapReady) throw new Error("Store non pronto");

        const store = window.store;
        console.log("Avvio acquisto IAP per:", priceId);
        store.order(priceId);
      } else {
        const user = await getUtenteCompleto();
        const response = await fetch("/api/checkout-abbonamenti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId, promoCode: promoCodeInput, userId: user.id }),
        });

        const data = await response.json();
        if (response.ok && data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || "Errore durante il checkout web.");
        }
      }
    } catch (err: unknown) {
      console.error("Errore checkout:", err);
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
