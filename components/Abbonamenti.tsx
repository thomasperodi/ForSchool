import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

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

export function Abbonamenti({
  promoCodeInput,
  setPromoCodeInput,
  promoCodeValid,
  loading,
  handleCheckout,
  isMobileApp,
}: AbbonamentiProps) {
  const elitePrice = 7.99;
  const discountedPrice = (elitePrice * 0.75).toFixed(2);

  // Scegli il prodotto corretto in base alla piattaforma
  const productId = isMobileApp ? IAP_PRODUCT_ID_ELITE : STRIPE_PRICE_ID_ELITE;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
          Sblocca <span className="Skoolly">Skoolly</span> al massimo
        </h2>
        <p className="text-xl text-gray-600">Attiva l&apos;abbonamento Elitè e vivi la scuola senza limiti</p>
      </div>

      {/* Promo Code (solo web) */}
      {!isMobileApp && (
        <div className="max-w-xs mx-auto mb-8">
          <label htmlFor="promo-code" className="block text-gray-700 text-sm font-bold mb-2 text-center">
            Hai un codice promo?
          </label>
          <Input
            id="promo-code"
            type="text"
            placeholder="Inserisci qui il codice promo"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value)}
          />
          {promoCodeValid && (
            <p className="text-green-600 text-center mt-2">Codice valido! Sconto del 25% applicato 🎉</p>
          )}
          {promoCodeInput && !promoCodeValid && (
            <p className="text-red-500 text-center mt-2">Codice non valido ❌</p>
          )}
        </div>
      )}

      <div className="flex justify-center items-start gap-8 max-w-4xl mx-auto">
        {/* Elite */}
        <Card className="relative border-2 border-purple-400 hover:border-purple-500 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">Elitè</CardTitle>
            <CardDescription className="text-gray-500">Per studenti attivi</CardDescription>
            <div className="text-4xl font-black text-purple-600 mt-4">
              €
              {!isMobileApp && promoCodeValid
                ? discountedPrice
                : elitePrice.toFixed(2)}
            </div>
            <span className="text-gray-400 text-sm">/mese</span>
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
              onClick={() => handleCheckout(productId)}
              disabled={loading}
            >
              {loading ? "Caricamento..." : "Attiva Elite 🚀"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
