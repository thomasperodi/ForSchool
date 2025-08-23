// app/abbonamenti/page.tsx oppure pages/abbonamenti.tsx
"use client";

import { useEffect, useState } from "react";
import { Abbonamenti } from "@/components/Abbonamenti";
import { useRouter } from "next/navigation";
import { getUtenteCompleto } from "@/lib/api";
interface CustomError {
  message: string;
  code?: string;
  source?: string;
}
export default function AbbonamentiPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<CustomError | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState<string>(""); // State to hold the promo code input
  const [promoCodeValid, setPromoCodeValid] = useState<boolean | null>(null);


  // Funzione fittizia di validazione promo
  useEffect(() => {
  if (promoCodeInput.trim().length === 0) {
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
    } catch (error) {
      console.error("Errore validazione codice promo:", error);
      setPromoCodeValid(false);
    }
  };

  fetchValidCodes();
}, [promoCodeInput]);




  const handleCheckout = async (priceId: string, p0: string | null) => {
    setLoading(true);
    setError(null);
    const user = await getUtenteCompleto();
    const userId = user.id
    console.log(`DEBUG: Initiating checkout for priceId: ${priceId}`);
    // Include the promo code in the debug log
    console.log(`DEBUG: Promo Code provided: ${promoCodeInput}`);

    try {
      // Corrected API endpoint name based on your backend code
      const response = await fetch("/api/checkout-abbonamenti", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Send both priceId and promoCodeInput to the backend
        body: JSON.stringify({ priceId, promoCode: promoCodeInput,userId  }),
      });

      const data = await response.json();
      console.log("DEBUG: API Response for checkout:", data);

      if (response.ok) {
        if (data.url) {
          console.log("DEBUG: Redirecting to Stripe Checkout URL:", data.url);
          window.location.href = data.url;
        } else {
          setError({
            message: "La risposta dell'API non conteneva un URL di checkout valido.",
            code: "MISSING_CHECKOUT_URL",
            source: "API Response",
          });
          console.error("ERROR: Missing checkout URL in successful API response.", data);
        }
      } else {
        let errorMessage: string = "Si è verificato un errore sconosciuto.";
        let errorCode: string = `HTTP_STATUS_${response.status}`;

        if (data && typeof data === 'object') {
          if (data.error && typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error && typeof data.error === 'object' && data.error.message) {
            errorMessage = data.error.message;
          } else if (data.message && typeof data.message === 'string') {
            errorMessage = data.message;
          } else {
            errorMessage = "Si è verificato un errore inatteso dal server. (Dettagli nel log console)";
            console.error("DEBUG: Unexpected error object from API:", data);
          }

          if (data.code && typeof data.code === 'string') {
            errorCode = data.code;
          } else if (data.error && typeof data.error === 'object' && data.error.code) {
            errorCode = data.error.code;
          }
        } else if (typeof data === 'string' && data.length > 0) {
            errorMessage = data;
            errorCode = "API_RESPONSE_STRING_ERROR";
        }

        if (response.status === 400) {
          errorCode = errorCode === "resource_missing" ? "PRICE_ID_MISSING" : "BAD_REQUEST"; // More specific error for missing price
        } else if (response.status === 401) {
          errorCode = "UNAUTHORIZED_API_CALL";
          errorMessage = errorMessage.includes("unautenticato") ? errorMessage : "Utente non autenticato. Accedi e riprova.";
        } else if (response.status === 404) {
          errorCode = "NOT_FOUND";
        } else if (response.status === 500) {
          errorCode = "INTERNAL_SERVER_ERROR";
          if (Object.keys(data).length === 0) {
            errorMessage = "Errore interno del server. Riprova più tardi o contatta il supporto.";
          }
        } else if (response.status === 400 && errorCode === "PROMO_CODE_ERROR") { // Specific check for promo code error from backend
            errorMessage = data.error || "Codice promo non valido o non attivo.";
        }

        setError({
          message: errorMessage,
          code: errorCode,
          source: "API",
        });
        console.error(`ERROR: API returned status ${response.status}:`, data);
      }
    } catch (err: unknown) {
      console.error("ERROR: Failed to initiate checkout (network or client error):", err);

      let errorMessage = "Impossibile connettersi al servizio di checkout. Controlla la tua connessione e riprova.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError({
        message: errorMessage,
        code: "NETWORK_ERROR",
        source: "Client (Fetch)",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Abbonamenti
      promoCodeInput={promoCodeInput}
      setPromoCodeInput={setPromoCodeInput}
      promoCodeValid={promoCodeValid ?? false} // se null diventa false
      loading={loading}
      handleCheckout={handleCheckout}
    />
  );
}
