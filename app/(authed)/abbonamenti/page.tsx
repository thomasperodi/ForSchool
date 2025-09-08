"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getUtenteCompleto } from "@/lib/api";

// Definizioni di tipi aggiornate per il plugin CdvPurchase
interface CustomError {
  message: string;
  code?: string;
  source?: string;
}

interface IAPProduct {
  id: string;
  transaction?: Record<string, unknown>;
  finish: () => void;
  owned: boolean;
  canPurchase: boolean;
}

interface IAPError {
  code?: string | number;
  message?: string;
  [key: string]: unknown;
}

interface Store {
  ready: (callback: () => void) => void;
  when: (productId: string) => {
    approved: (callback: (product: IAPProduct) => void) => void;
    owned: (callback: (product: IAPProduct) => void) => void;
  };
  error: (callback: (err: IAPError) => void) => void;
  refresh: () => void;
  order: (productId: string) => void;
  PAID_SUBSCRIPTION: string;
  products: {
    get: (id: string) => IAPProduct | undefined;
  };
}

// Utilizzo del "Declaration Merging" per estendere l'interfaccia 'Window'
// senza creare conflitti con i tipi esistenti di 'cordova'.
declare global {
  interface Window {
    CdvPurchase?: {
      Store: Store;
    };
    // Aggiungiamo 'capacitor' direttamente a Window.
    // Il tipo 'Cordova' per 'cordova' è già fornito da @types/cordova.
    capacitor?: Record<string, unknown>;
  }
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

  useEffect(() => {
    setIsMobileApp(typeof window !== "undefined" && (!!window.cordova || !!window.capacitor));
  }, []);

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

  useEffect(() => {
    if (!isMobileApp) return;

    const initIAP = () => {
      const store = window.CdvPurchase?.Store;
      if (!store) {
        console.error("CdvPurchase.Store non disponibile");
        return;
      }

      const productId = "it.skoolly.app.abbonamento.mensile";

      const product = store.products.get(productId);
      if (!product) {
        console.error("Prodotto non trovato:", productId);
        return;
      }

      store.ready(() => {
        console.log("Store pronto", store.products);
        setIapReady(true);
      });

      store.when(productId).approved(async (product: IAPProduct) => {
        console.log("Abbonamento approvato:", product.id);
        
        const receiptData = product.transaction?.receipt;
        const transactionId = product.transaction?.id;
        const platform = !!window.cordova ? 'ios' : 'android';

        if (!receiptData || !transactionId) {
          console.error("Dati di transazione mancanti per la validazione.");
          return;
        }

        try {
          const user = await getUtenteCompleto();
          const response = await fetch("/api/validate-receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              productId: product.id,
              platform,
              receiptData,
              transactionId,
            }),
          });
          
          if (response.ok) {
            console.log("Validazione backend riuscita. Chiamata a product.finish()");
            product.finish();
            setLoading(false);
          } else {
            const errorData = await response.json();
            console.error("Validazione backend fallita:", errorData);
            setError({ message: errorData.error || "Errore di validazione della ricevuta", source: "Backend" });
            setLoading(false);
          }

        } catch (err: unknown) {
          console.error("Errore nella chiamata all'API di backend:", err);
          let errorMessage = "Errore sconosciuto durante la validazione";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          setError({ message: errorMessage, source: "Client" });
          setLoading(false);
        }
      });

      store.when(productId).owned((product: IAPProduct) => {
        console.log("Abbonamento già posseduto:", product.id);
        setLoading(false);
      });

      store.error((err: IAPError) => {
        console.error("Errore IAP:", err);
        setError({ message: err.message || "Errore IAP sconosciuto", source: "IAP" });
        setLoading(false);
      });

      store.refresh();
    };

    if (document.readyState === 'complete') {
        initIAP();
    } else {
        document.addEventListener("deviceready", initIAP, false);
    }

    return () => {
      document.removeEventListener("deviceready", initIAP, false);
    };

  }, [isMobileApp]);

  const handleCheckout = async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      if (isMobileApp) {
        if (!iapReady) {
          throw new Error("Store non pronto. Riprova tra pochi istanti.");
        }
        
        const store = window.CdvPurchase?.Store;
        if (!store) throw new Error("Plugin IAP non disponibile");

        console.log("Avvio acquisto IAP per:", productId);
        store.order(productId);
      } else {
        const user = await getUtenteCompleto();
        const response = await fetch("/api/checkout-abbonamenti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: productId, promoCode: promoCodeInput, userId: user.id }),
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
      let errorMessage = "Errore sconosciuto durante il checkout";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError({
        message: errorMessage,
        code: "CHECKOUT_ERROR",
        source: "Client",
      });
    } finally {
      if (!isMobileApp) {
        setLoading(false);
      }
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