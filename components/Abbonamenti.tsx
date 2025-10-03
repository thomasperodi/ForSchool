// components/Abbonamenti.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
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
import { Purchases } from "@revenuecat/purchases-capacitor";

interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: (value: string) => void;
  promoCodeValid: boolean;                 // true = codice valido (web) oppure lo settiamo da validatePromoMobile (app)
  loading: boolean;
  handleCheckout: (productId: string) => void; // web (Stripe)
  isMobileApp: boolean;                    // true su iOS/Android (Capacitor)
}

const STRIPE_PRICE_ID_ELITE = "price_1S27l1G1gLpUu4C4Jd0vIePN";

// === prezzi UI fissi in euro, come richiesto ===
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

  // Stato promo lato app
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoPackageId, setPromoPackageId] = useState<string | null>(null); // es. "$rc_monthly_promo"
  const [offeringId, setOfferingId] = useState<string>("default");
  const [mobilePlatform, setMobilePlatform] =
    useState<"android" | "ios" | "web">("web");

  // === prezzo UI controllato localmente (non leggiamo il priceString Apple) ===
  const [uiPromoActive, setUiPromoActive] = useState(false);

  useEffect(() => {
    if (!isMobileApp) return;
    try {
      const p = Capacitor.getPlatform();
      setMobilePlatform(p === "ios" || p === "android" ? p : "web");
    } catch {
      setMobilePlatform("web");
    }
  }, [isMobileApp]);

  // Init RC su app (solo per gestire entitlements / acquisti)
  useEffect(() => {
    if (!isMobileApp || !user?.id) return;
    (async () => {
      try {
        const { configureRevenueCat, isEliteActive } = await import("@/lib/revenuecat");
        await configureRevenueCat(user.id);
        setEliteActive(await isEliteActive());
      } catch (e) {
        console.warn("[RC] init failed:", e);
      }
    })();
  }, [isMobileApp, user?.id]);

  // Web: attiva/disattiva promo nella UI in base alla validazione esterna
  useEffect(() => {
    if (isMobileApp) return;
    setUiPromoActive(Boolean(promoCodeValid));
  }, [isMobileApp, promoCodeValid]);

  // Se l’utente cancella il codice: reset UI
  useEffect(() => {
    if (!promoCodeInput.trim()) {
      setUiPromoActive(false);
      setPromoMessage(null);
      setPromoPackageId(null);
      setOfferingId("default");
    }
  }, [promoCodeInput]);

  // prezzo mostrato
  const displayedPrice = useMemo(() => {
    return uiPromoActive ? PROMO_PRICE_EUR : BASE_PRICE_EUR;
  }, [uiPromoActive]);

  // === Validazione promo SU APP (muove anche la UI a 5,99) ===
  async function validatePromoMobile() {
    setPromoMessage(null);
    setPromoPackageId(null);

    if (!promoCodeInput || !user?.id) {
      setPromoMessage("Inserisci un codice e accedi.");
      return;
    }

    setValidatingPromo(true);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          userId: user.id,
          platform: mobilePlatform, // 'android' | 'ios'
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setPromoMessage(data?.message ?? "Codice non valido.");
        setPromoPackageId(null);
        setUiPromoActive(false); // torna a 7,99
      } else {
        const packageId: string = data.packageId;            // es. "$rc_monthly_promo"
        const offId: string = data.offeringId ?? "default";  // di solito "default"

        setPromoPackageId(packageId);
        setOfferingId(offId);
        setPromoMessage("Codice valido! Prezzo promo applicato.");
        setUiPromoActive(true); // passa a 5,99

        // attributo su RC (facoltativo)
        try {
          await Purchases.setAttributes({
            ambassador_code: String(promoCodeInput).trim().toUpperCase(),
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

  const handlePurchaseClick = async () => {
    if (isMobileApp) {
      try {
        const mod = await import("@/lib/revenuecat");
        const { restorePurchases, isEliteActive, purchaseElite, purchasePackageByIdentifier } = mod;

        if (eliteActive) {
          const ok = (await restorePurchases()) || (await isEliteActive());
          setEliteActive(ok);
          alert(ok ? "Abbonamento confermato/ripristinato" : "Nessun acquisto da ripristinare");
          return;
        }

        console.log("[UI] Avvio acquisto Elite...");
        let ok = false;

        if (promoPackageId) {
          ok = await purchasePackageByIdentifier({
            packageIdentifier: promoPackageId,
            offeringId,
          });
        } else {
          ok = await purchaseElite();
        }

        setEliteActive(ok);
        alert(ok ? "Abbonamento attivato" : "Acquisto annullato o non attivo");
      } catch (e) {
        console.error("[UI] purchaseElite/restore error:", e);
        alert("Errore durante l'operazione");
      }
    } else {
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
          Attiva l&apos;abbonamento Elite e vivi la scuola senza limiti
        </p>
      </div>

      {/* PROMO INPUT */}
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
          {isMobileApp ? (
            <Button
              variant="secondary"
              onClick={validatePromoMobile}
              disabled={validatingPromo || !promoCodeInput}
            >
              {validatingPromo ? "..." : "Applica"}
            </Button>
          ) : null}
        </div>

        {/* feedback */}
        {!isMobileApp && promoCodeInput && (
          <p className={`text-center mt-2 ${promoCodeValid ? "text-green-600" : "text-red-500"}`}>
            {promoCodeValid ? "Codice valido! Prezzo promo applicato." : "Codice non valido"}
          </p>
        )}
        {isMobileApp && promoMessage && (
          <p className="text-center mt-2 text-sm">{promoMessage}</p>
        )}
      </div>

      <div className="flex justify-center items-start gap-8 max-w-4xl mx-auto">
        <Card className="relative border-2 border-purple-400 hover:border-purple-500 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">Elite</CardTitle>
            <CardDescription className="text-gray-500">Per studenti attivi</CardDescription>

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
                  : promoPackageId
                  ? "Attiva Elite (Promo)"
                  : "Attiva Elite"
                : "Checkout web"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
