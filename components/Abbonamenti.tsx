// components/Abbonamenti.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";

import {
  configureRevenueCat,
  isEliteActive as rcIsEliteActive,
  restorePurchases,
  purchaseElite,
  setPromoCode as rcSetPromoCode,
  rcSetAttributes,
} from "@/lib/revenuecat";

interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: (value: string) => void;
  promoCodeValid: boolean; // lato web
  loading: boolean;
  handleCheckout: (productId: string, promoApplied: boolean) => void; // solo web (Stripe)
  isMobileApp: boolean; // true su iOS/Android (Capacitor)
}

const STRIPE_PRICE_ID_ELITE = "price_1S27l1G1gLpUu4C4Jd0vIePN";
const BASE_PRICE_EUR = 7.99;
const PROMO_PRICE_EUR = 5.99;

export default function Abbonamenti({
  promoCodeInput,
  setPromoCodeInput,
  promoCodeValid,
  loading,
  handleCheckout,
  isMobileApp,
}: AbbonamentiProps) {
  const session = useSession();
  const user = session?.user ?? null;

  const [eliteActive, setEliteActive] = useState(false);

  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [uiPromoActive, setUiPromoActive] = useState(false);

  // CONFIGURAZIONE MOBILE: RevenueCat
  useEffect(() => {
    if (!isMobileApp || !user?.id) return;
    (async () => {
      try {
        await configureRevenueCat(user.id);
        const active = await rcIsEliteActive();
        setEliteActive(active);
      } catch (e) {
        console.warn("[RC] init failed:", e);
      }
    })();
  }, [isMobileApp, user?.id]);

  // Aggiorna UI promo code
  useEffect(() => {
    if (isMobileApp) {
      // mobile: usa stato interno
      setUiPromoActive(Boolean(promoMessage && promoMessage.includes("valido")));
    } else {
      // web: usa prop promoCodeValid
      setUiPromoActive(Boolean(promoCodeValid));
    }
  }, [isMobileApp, promoMessage, promoCodeValid]);

  // Reset UI quando l’utente cancella il codice
  useEffect(() => {
    if (!promoCodeInput.trim()) {
      setUiPromoActive(false);
      setPromoMessage(null);
    }
  }, [promoCodeInput]);

  const displayedPrice = useMemo(() => {
    return uiPromoActive ? PROMO_PRICE_EUR : BASE_PRICE_EUR;
  }, [uiPromoActive]);

  // VALIDAZIONE PROMO MOBILE
  async function validatePromoMobile() {
    setPromoMessage(null);
    if (!promoCodeInput || !user?.id) {
      setPromoMessage("Inserisci un codice e accedi.");
      return;
    }
    setValidatingPromo(true);
    try {
      const { valid, message } = await rcSetPromoCode(promoCodeInput.trim());
      if (!valid) {
        setPromoMessage(message ?? "Codice non valido.");
        setUiPromoActive(false);
      } else {
        setPromoMessage(message ?? "Codice valido! Prezzo promo applicato.");
        setUiPromoActive(true);
        try {
          await rcSetAttributes({
            ambassador_code: promoCodeInput.trim().toUpperCase(),
          });
        } catch (e) {
          console.warn("[RC] setAttributes ambassador_code failed:", e);
        }
      }
    } catch {
      setPromoMessage("Errore di validazione codice.");
      setUiPromoActive(false);
    } finally {
      setValidatingPromo(false);
    }
  }

  // VALIDAZIONE PROMO WEB
  async function validatePromoWeb() {
    // lato web la validazione avviene esternamente e viene passata via prop promoCodeValid
    // qui possiamo solo aggiornare il messaggio in UI
    if (promoCodeValid) {
      setPromoMessage("Codice valido! Prezzo promo applicato.");
    } else {
      setPromoMessage("Codice non valido.");
    }
  }

  // GESTIONE ACQUISTO
  async function handlePurchaseClick() {
    if (isMobileApp) {
      try {
        if (eliteActive) {
          const ok = (await restorePurchases()) || (await rcIsEliteActive());
          setEliteActive(ok);
          alert(ok ? "Abbonamento confermato/ripristinato" : "Nessun acquisto da ripristinare");
          return;
        }

        const ok = await purchaseElite();
        setEliteActive(ok);
        alert(ok ? "Abbonamento attivato" : "Acquisto annullato o non attivo");
      } catch (e) {
        console.error("[UI] purchase/restore error:", e);
        alert("Errore durante l'operazione");
      }
    } else {
      // WEB: Stripe
      handleCheckout(STRIPE_PRICE_ID_ELITE, uiPromoActive);
    }
  }

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
          Sblocca <span className="Skoolly">Skoolly</span> al massimo
        </h2>
        <p className="text-xl text-gray-600">
          Attiva l&apos;abbonamento Elite e vivi la scuola senza limiti
        </p>
      </div>

      {/* PROMO INPUT - mobile + web */}
      <div className="max-w-xs mx-auto mb-8">
        <label
          htmlFor="promo-code"
          className="block text-gray-700 text-sm font-bold mb-2 text-center"
        >
          Hai un codice promo?
        </label>
        <div className="flex gap-2">
          <Input
            id="promo-code"
            type="text"
            placeholder="Inserisci qui il codice promo"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value)}
            disabled={loading || validatingPromo}
          />
          <Button
            variant="secondary"
            onClick={isMobileApp ? validatePromoMobile : validatePromoWeb}
            disabled={validatingPromo || !promoCodeInput}
          >
            {validatingPromo ? "..." : "Applica"}
          </Button>
        </div>
        {promoMessage && (
          <p
            className={`text-center mt-2 ${
              uiPromoActive ? "text-green-600" : "text-red-500"
            }`}
          >
            {promoMessage}
          </p>
        )}
      </div>

      <div className="flex justify-center items-start gap-8 max-w-4xl mx-auto">
        <Card className="relative border-2 border-purple-400 hover:border-purple-500 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">
              Elite
            </CardTitle>
            <CardDescription className="text-gray-500">
              Per studenti attivi
            </CardDescription>

            <div className="text-4xl font-black text-purple-600 mt-4">
              €{displayedPrice.toFixed(2)}
            </div>
            <span className="text-gray-400 text-sm">/mese</span>

            {eliteActive && isMobileApp && (
              <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                Attivo
              </span>
            )}
          </CardHeader>

          <CardContent className="space-y-3 mt-4">
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5" />
              <span>Accesso al marketplace</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5" />
              <span>Salta fila agli eventi</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5" />
              <span>Eventi esclusivi per abbonati</span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 text-center mt-4">
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
              onClick={handlePurchaseClick}
              disabled={loading}
            >
              {isMobileApp
                ? eliteActive
                  ? "Gestisci / Ripristina"
                  : uiPromoActive
                  ? "Attiva Elite (Promo)"
                  : "Attiva Elite"
                : "Checkout web"}
            </Button>

            {/* FOOTER: termini e privacy */}
            <p className="text-xs text-gray-500 mt-4">
              Continuando, accetti i nostri{" "}
              <a
                href="https://www.skoolly.it/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-purple-600"
              >
                Termini di utilizzo
              </a>{" "}
              e la nostra{" "}
              <a
                href="https://www.iubenda.com/privacy-policy/79987490"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-purple-600"
              >
                Privacy Policy
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
