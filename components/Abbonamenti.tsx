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
import { Purchases } from "@revenuecat/purchases-capacitor";

interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: (value: string) => void;
  promoCodeValid: boolean;
  loading: boolean;
  handleCheckout: (productId: string) => void; // web (Stripe)
  isMobileApp: boolean; // true su iOS/Android (Capacitor)
}

const STRIPE_PRICE_ID_ELITE = "price_1S27l1G1gLpUu4C4Jd0vIePN";

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
  const [usePromo, setUsePromo] = useState(false);
  const [appPrice, setAppPrice] = useState<number | null>(null);

  // promo lato app
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoPackageId, setPromoPackageId] = useState<string | null>(null); // es. "$rc_monthly_promo"
  const [offeringId, setOfferingId] = useState<string>("default"); // di solito "default"

  // Prezzi fallback (solo UI web)
  const elitePrice = 7.99;
  const promoPriceWeb = 5.99;

  // piattaforma (solo app)
  const [mobilePlatform, setMobilePlatform] =
    useState<"android" | "ios" | "web">("web");

  useEffect(() => {
    if (!isMobileApp) return;
    try {
      const p = window?.Capacitor?.getPlatform?.();
      if (p === "ios" || p === "android") setMobilePlatform(p);
    } catch {
      setMobilePlatform("web");
    }
  }, [isMobileApp]);

  // Helpers
  function parsePriceStringToNumber(priceString: string): number | null {
    // Esempi: "7,99 €", "€7.99", "US$7.99"
    const normalized = priceString.replace(",", "."); // 7,99 → 7.99
    const match = normalized.match(/([0-9]+(\.[0-9]+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  async function fetchNormalPriceFromRC(): Promise<number | null> {
    try {
      const { getEliteLocalizedPrice } = await import("@/lib/revenuecat");
      return await getEliteLocalizedPrice();
    } catch {
      return null;
    }
  }

  async function fetchPriceForPackage(
    wantedOfferingId: string,
    packageIdentifier: string
  ): Promise<number | null> {
    try {
      const offerings = await Purchases.getOfferings();
      const off =
        offerings.all?.[wantedOfferingId] ??
        offerings.current ??
        null;

      const pkg =
        off?.availablePackages.find((p) => p.identifier === packageIdentifier) ??
        undefined;

      if (!pkg) return null;
      return parsePriceStringToNumber(pkg.product.priceString);
    } catch {
      return null;
    }
  }

  // Init RevenueCat + stato attivo + prezzo reale (solo app)
  useEffect(() => {
    if (!isMobileApp || !user?.id) return;

    (async () => {
      try {
        const {
          configureRevenueCat,
          isEliteActive,
        } = await import("@/lib/revenuecat");

        await configureRevenueCat(user.id);
        const active = await isEliteActive();
        setEliteActive(active);

        // prezzo standard attuale (non promo)
        const standardPrice = await fetchNormalPriceFromRC();
        if (typeof standardPrice === "number") setAppPrice(standardPrice);
      } catch (e) {
        console.warn("[RevenueCat] init/get price failed:", e);
      }
    })();
  }, [isMobileApp, user?.id]);

  // Promo: su web usi la tua logica; su app usiamo la validazione + package promo
  useEffect(() => {
    setUsePromo(Boolean(promoCodeValid));
  }, [promoCodeValid]);

  // Se l'utente cancella/modifica il codice promo su mobile, ripristiniamo prezzo standard
  useEffect(() => {
    if (!isMobileApp) return;
    if (!promoCodeInput.trim()) {
      // reset stato promo in UI
      setPromoMessage(null);
      setPromoPackageId(null);
      setOfferingId("default");
      // ricarica prezzo standard
      (async () => {
        const standardPrice = await fetchNormalPriceFromRC();
        if (typeof standardPrice === "number") setAppPrice(standardPrice);
      })();
    }
  }, [isMobileApp, promoCodeInput]);

  const displayedPrice = useMemo(() => {
    if (isMobileApp) return appPrice ?? elitePrice; // su app mostriamo il prezzo ricavato da RC
    // web: UI-only
    return usePromo ? promoPriceWeb : elitePrice;
  }, [isMobileApp, appPrice, usePromo]);

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
        setPromoMessage(data.message ?? "Codice non valido.");
        setPromoPackageId(null);

        // se il promo non è valido, torna al prezzo standard
        const standardPrice = await fetchNormalPriceFromRC();
        if (typeof standardPrice === "number") setAppPrice(standardPrice);
      } else {
        const packageId: string = data.packageId; // es. "$rc_monthly_promo"
        const offId: string = data.offeringId ?? "default";

        setPromoPackageId(packageId);
        setOfferingId(offId);
        setPromoMessage("Codice valido! Applicheremo il piano promo in cassa.");

        // salva l'attributo su RC (così lo ritrovi in webhook/sync)
        try {
          await Purchases.setAttributes({
            ambassador_code: String(promoCodeInput).trim().toUpperCase(),
          });
        } catch (e) {
          console.warn("[RC] setAttributes ambassador_code failed:", e);
        }

        // >>> aggiorna SUBITO il prezzo UI con il prezzo del promo package <<<
        const promoPrice = await fetchPriceForPackage(offId, packageId);
        if (typeof promoPrice === "number") {
          setAppPrice(promoPrice);
        } else {
          // se non troviamo il package (cache offerings), proviamo a ricaricare prezzo standard
          const standardPrice = await fetchNormalPriceFromRC();
          if (typeof standardPrice === "number") setAppPrice(standardPrice);
        }
      }
    } catch (e) {
      setPromoMessage("Errore di validazione codice.");
    } finally {
      setValidatingPromo(false);
    }
  }

  const handlePurchaseClick = async () => {
    if (isMobileApp) {
      try {
        const {
          restorePurchases,
          isEliteActive,
          purchaseElite,
          purchasePackageByIdentifier,
        } = await import("@/lib/revenuecat");

        if (eliteActive) {
          console.log("[UI] L’utente ha già Elite, provo restore");
          const ok = (await restorePurchases()) || (await isEliteActive());
          setEliteActive(ok);
          alert(ok ? "Abbonamento confermato/ripristinato" : "Nessun acquisto da ripristinare");
          return;
        }

        console.log("[UI] Avvio acquisto Elite...");
        let ok = false;

        // se è presente un package promo valido, usalo
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
          Attiva l&apos;abbonamento Elite e vivi la scuola senza limiti
        </p>
      </div>

      {/* PROMO INPUT: anche su mobile */}
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

        {/* Web: feedback promo semplice */}
        {!isMobileApp && (
          <>
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
          </>
        )}

        {/* Mobile: messaggi */}
        {isMobileApp && promoMessage && (
          <p className="text-center mt-2 text-sm">{promoMessage}</p>
        )}
        {isMobileApp && mobilePlatform === "ios" && (
          <p className="text-xs text-center text-amber-600 mt-1">
            Nota iOS: i “codici promo” per IAP sono generalmente gestiti come{" "}
            <em>Offer Codes</em> dell’App Store (si riscattano fuori app). Questa
            UI usa un piano promo separato configurato su RevenueCat/Store.
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
