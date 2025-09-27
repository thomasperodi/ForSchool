// components/Abbonamenti.tsx
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
import { userAgent } from "next/server";
import { useSession } from "@supabase/auth-helpers-react";
interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: (value: string) => void;
  promoCodeValid: boolean;
  loading: boolean;
  handleCheckout: (productId: string) => void; // web (Stripe)
  isMobileApp: boolean; // true su iOS/Android (Capacitor)
}

const STRIPE_PRICE_ID_ELITE = "price_1S27l1G1gLpUu4C4Jd0vIePN";

export function Abbonamenti({
  promoCodeInput,
  setPromoCodeInput,
  promoCodeValid,
  loading,
  handleCheckout,
  isMobileApp,
}: AbbonamentiProps) {
  const [eliteActive, setEliteActive] = useState(false);
  const [usePromo, setUsePromo] = useState(false);
  const [appPrice, setAppPrice] = useState<number | null>(null);

  // Prezzi fallback (UI)
  const elitePrice = 7.99;
  const promoPrice = 5.99;
  const session = useSession();

  const user= session?.user;
  // Init RevenueCat + stato attivo + prezzo reale (solo app)
useEffect(() => {
  if (!isMobileApp || !user?.id) return; // 👈 esci se non hai l'ID utente

  (async () => {
    try {
      const {
        configureRevenueCat,
        isEliteActive,
        getEliteLocalizedPrice,
      } = await import("@/lib/revenuecat");

      await configureRevenueCat(user.id); // 👈 qui sei sicuro di passare l'UUID corretto
      const active = await isEliteActive();
      setEliteActive(active);

      const price = await getEliteLocalizedPrice();
      if (typeof price === "number") setAppPrice(price);
    } catch (e) {
      console.warn("[RevenueCat] init/get price failed:", e);
    }
  })();
}, [isMobileApp, user?.id]); // 👈 dipendenza anche su user?.id


  // Promo: su app ignoriamo (il prezzo viene da RevenueCat), sul web applichiamo sconto
  useEffect(() => {
    setUsePromo(Boolean(promoCodeValid));
  }, [promoCodeValid]);

  const displayedPrice = appPrice ?? (usePromo ? promoPrice : elitePrice);

const handlePurchaseClick = async () => {
  if (isMobileApp) {
    try {
      const {
        restorePurchases,
        isEliteActive,
        purchaseElite,
      } = await import("@/lib/revenuecat");

      if (eliteActive) {
        console.log("[UI] L’utente ha già Elite, provo restore");
        const ok = (await restorePurchases()) || (await isEliteActive());
        setEliteActive(ok);
        alert(ok ? "Abbonamento confermato/ripristinato" : "Nessun acquisto da ripristinare");
        return;
      }

      console.log("[UI] Avvio acquisto Elite...");
      const ok = await purchaseElite();
      setEliteActive(ok);
      alert(ok ? "Abbonamento attivato" : "Acquisto annullato o non attivo");
    } catch (e) {
      console.error("[UI] purchaseElite/restore error:", e);
      alert("Errore durante l'operazione");
    }
  } else {
    console.log("[UI] Redirect a Stripe checkout");
    handleCheckout(STRIPE_PRICE_ID_ELITE);
  }
};


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
            disabled={loading}
          />
          {promoCodeInput && promoCodeValid && (
            <p className="text-green-600 text-center mt-2">
              Codice valido! Sconto del 25% applicato
            </p>
          )}
          {promoCodeInput && !promoCodeValid && (
            <p className="text-red-500 text-center mt-2">Codice non valido</p>
          )}
          <p className="text-gray-500 text-center mt-2">
            Gli abbonamenti via web usano Stripe.
          </p>
        </div>
      )}

      <div className="flex justify-center items-start gap-8 max-w-4xl mx-auto">
        <Card className="relative border-2 border-purple-400 hover:border-purple-500 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">
              Elitè
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
          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
              onClick={handlePurchaseClick}
              disabled={loading}
            >
              {isMobileApp
                ? eliteActive
                  ? "Gestisci / Ripristina"
                  : "Attiva Elite"
                : "Checkout web"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}

export default Abbonamenti;
