// components/Abbonamenti.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";

import {
  configureRevenueCat,
  isEliteActive as rcIsEliteActive,
  restorePurchases,
  purchaseElite,
  // ⛔️ rimosso: rcSetPromoCode
  rcSetAttributes,
  getDisplayedPrice,         // NEW: legge il prezzo corrente dall’offering attiva
  presentOfferCodeRedemption // NEW: su iOS apre la sheet Apple di riscatto codice
} from "@/lib/revenuecat";

interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: (value: string) => void;
  promoCodeValid: boolean; // lato web
  loading: boolean;
  handleCheckout: (priceId: string, promoApplied: boolean) => void; // solo web (Stripe)
  isMobileApp: boolean; // true su iOS/Android (Capacitor)
}

const STRIPE_PRICE_ID_ELITE = "price_1S27l1G1gLpUu4C4Jd0vIePN";
const BASE_PRICE_EUR = 7.99;

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
  const [displayedPrice, setDisplayedPrice] = useState<number>(BASE_PRICE_EUR);
  const [iosOfferSupported, setIosOfferSupported] = useState(false);

  // CONFIGURAZIONE MOBILE: RevenueCat
  useEffect(() => {
    if (!isMobileApp || !user?.id) return;
    (async () => {
      try {
        await configureRevenueCat(user.id);
        const active = await rcIsEliteActive();
        setEliteActive(active);
        const p = await getDisplayedPrice(); // legge prezzo dall’offering attiva
        if (p && !Number.isNaN(p)) setDisplayedPrice(p);
        // abilita pulsante redemption solo su iOS
        setIosOfferSupported(true);
      } catch (e) {
        console.warn("[RC] init failed:", e);
      }
    })();
  }, [isMobileApp, user?.id]);

  // WEB: calcolo prezzo mostrato (promo solo web)
  const webPrice = useMemo(() => {
    return promoCodeValid ? Math.max(0, BASE_PRICE_EUR - 2) : BASE_PRICE_EUR; // es: 5.99 se valido
  }, [promoCodeValid]);

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
      handleCheckout(STRIPE_PRICE_ID_ELITE, promoCodeValid);
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

      {/* PROMO INPUT: SOLO WEB (Stripe). Su mobile non è presente. */}
      {!isMobileApp && (
        <div className="max-w-xs mx-auto mb-8">
          <label htmlFor="promo-code" className="block text-gray-700 text-sm font-bold mb-2 text-center">
            Hai un codice promo (solo web)?
          </label>
          <div className="flex gap-2">
            <Input
              id="promo-code"
              type="text"
              placeholder="Inserisci qui il codice promo"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              disabled={loading}
            />
            <Button
              variant="secondary"
              onClick={() => {/* la validazione avviene fuori e aggiorna promoCodeValid */}}
              disabled={!promoCodeInput}
            >
              Applica
            </Button>
          </div>
          <p className={`text-center mt-2 ${promoCodeValid ? "text-green-600" : "text-gray-500"}`}>
            {promoCodeValid ? "Codice valido! Prezzo scontato al checkout web." : "I codici promo si applicano solo sul sito web."}
          </p>
        </div>
      )}

      <div className="flex justify-center items-start gap-8 max-w-4xl mx-auto">
        <Card className="relative border-2 border-purple-400 hover:border-purple-500 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">Elite</CardTitle>
            <CardDescription className="text-gray-500">Per studenti attivi</CardDescription>

            <div className="text-4xl font-black text-purple-600 mt-4">
              €{(isMobileApp ? displayedPrice : webPrice).toFixed(2)}
            </div>
            <span className="text-gray-400 text-sm">/mese</span>

            {eliteActive && isMobileApp && (
              <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                Attivo
              </span>
            )}
          </CardHeader>

          <CardContent className="space-y-3 mt-4">
            <div className="flex items-center space-x-3"><Check className="w-5 h-5" /><span>Accesso al marketplace</span></div>
            <div className="flex items-center space-x-3"><Check className="w-5 h-5" /><span>Salta fila agli eventi</span></div>
            <div className="flex items-center space-x-3"><Check className="w-5 h-5" /><span>Eventi esclusivi per abbonati</span></div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 text-center mt-4">
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
              onClick={handlePurchaseClick}
              disabled={loading}
            >
              {isMobileApp ? (eliteActive ? "Gestisci / Ripristina" : "Attiva Elite") : "Checkout web"}
            </Button>

            {/* iOS: redemption ufficiale Apple */}
            {isMobileApp && iosOfferSupported && (
              <Button
                variant="outline"
                onClick={presentOfferCodeRedemption}
                className="w-full"
              >
                Riscatta codice offerta (Apple)
              </Button>
            )}

            <p className="text-xs text-gray-500 mt-4">
              Continuando, accetti i nostri{" "}
              <a href="https://www.skoolly.it/terms" target="_blank" rel="noopener noreferrer" className="underline text-purple-600">Termini di utilizzo</a>{" "}
              e la nostra{" "}
              <a href="https://www.iubenda.com/privacy-policy/79987490" target="_blank" rel="noopener noreferrer" className="underline text-purple-600">Privacy Policy</a>.
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
