"use client";

import { useEffect, useState } from "react";
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

import { configureRevenueCat, purchaseElite } from "@/lib/revenuecat";

interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: (value: string) => void;
  promoCodeValid: boolean;
  loading: boolean;
  handleCheckout: (productId: string) => void;
  isMobileApp: boolean;
}

const STRIPE_PRICE_ID_ELITE = "price_1S27l1G1gLpUu4C4Jd0vIePN"; // ID Stripe web
const IAP_PRODUCT_ID_ELITE = "it.skoolly.app.abbonamento.mensile"; // ID IAP mobile
const IAP_PRODUCT_ID_PROMO = "it.skoolly.app.abbonamento.mensile_promo"; // ID IAP mobile promo

export function Abbonamenti({
  promoCodeInput,
  setPromoCodeInput,
  promoCodeValid,
  loading,
  handleCheckout,
  isMobileApp,
}: AbbonamentiProps) {
  const SUBSCRIPTIONS_ENABLED = true;
  const [eliteActive, setEliteActive] = useState(false);
  const [usePromo, setUsePromo] = useState(false);

  const elitePrice = 7.99;
  const promoPrice = 5.99;

  const productId = isMobileApp
    ? usePromo
      ? IAP_PRODUCT_ID_PROMO
      : IAP_PRODUCT_ID_ELITE
    : STRIPE_PRICE_ID_ELITE;

  // Inizializza RevenueCat
  useEffect(() => {
    if (!isMobileApp) return;

    (async () => {
      await configureRevenueCat(); 
    })();
  }, [isMobileApp]);

  // Aggiorna l’uso del promo quando cambia il codice
  useEffect(() => {
    setUsePromo(promoCodeValid);
  }, [promoCodeValid]);

// Funzione acquisto per mobile/web (temporaneamente disabilitata)
const handlePurchaseClick = async () => {
  if (!SUBSCRIPTIONS_ENABLED) {
    alert("Gli abbonamenti non sono ancora attivi. Torna presto! ⏳");
    return;
  }

  if (isMobileApp) {
    const usePromo = promoCodeValid && promoCodeInput.length > 0;
    const ok = await purchaseElite(usePromo);
    setEliteActive(ok);
    alert(ok ? "Abbonamento attivato ✅" : "Acquisto annullato o fallito ❌");
  } else {
    handleCheckout(productId);
  }
};

  const displayedPrice = isMobileApp
    ? usePromo
      ? promoPrice
      : elitePrice
    : !isMobileApp && promoCodeValid
    ? promoPrice
    : elitePrice;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
          Sblocca <span className="Skoolly">Skoolly</span> al massimo
        </h2>
        <p className="text-xl text-gray-600">
          Attiva l&apos;abbonamento Elitè e vivi la scuola senza limiti
        </p>
      </div>

      {/* Promo Code solo web (disabilitato se non attivo) */}
      {!isMobileApp && (
        <div className="max-w-xs mx-auto mb-8">
          <label
            htmlFor="promo-code"
            className="block text-gray-700 text-sm font-bold mb-2 text-center"
          >
            Hai un codice promo?
          </label>
          <Input
            id="promo-code"
            type="text"
            placeholder="Inserisci qui il codice promo"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value)}
            disabled={!SUBSCRIPTIONS_ENABLED}
          />
          {SUBSCRIPTIONS_ENABLED && promoCodeValid && (
            <p className="text-green-600 text-center mt-2">
              Codice valido! Sconto del 25% applicato 🎉
            </p>
          )}
          {SUBSCRIPTIONS_ENABLED && promoCodeInput && !promoCodeValid && (
            <p className="text-red-500 text-center mt-2">Codice non valido ❌</p>
          )}
          {!SUBSCRIPTIONS_ENABLED && (
            <p className="text-gray-500 text-center mt-2">
              Gli abbonamenti non sono ancora attivi.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-center items-start gap-8 max-w-4xl mx-auto">
        <Card className="relative border-2 border-purple-400 hover:border-purple-500 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">Elitè</CardTitle>
            <CardDescription className="text-gray-500">Per studenti attivi</CardDescription>
            <div className="text-4xl font-black text-purple-600 mt-4">
              €{displayedPrice.toFixed(2)}
            </div>
            <span className="text-gray-400 text-sm">/mese</span>
            {eliteActive && (
              <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                Attivo
              </span>
            )}
          </CardHeader>

          <CardContent className="space-y-3 mt-4">
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>Accesso al marketplace</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>Salta fila agli eventi</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>Eventi esclusivi per abbonati</span>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
              onClick={handlePurchaseClick}
              disabled={loading || !SUBSCRIPTIONS_ENABLED}
            >
              {SUBSCRIPTIONS_ENABLED ? (loading ? "Caricamento..." : "Attiva Elite 🚀") : "In arrivo ⏳"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
