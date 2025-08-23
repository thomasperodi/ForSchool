import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown } from "lucide-react";
import Link from "next/link";

interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: (value: string) => void; // aggiungi questo
  promoCodeValid: boolean;
  loading: boolean;
  handleCheckout: (priceId: string, promoCode: string | null) => void;
}

  const STRIPE_PRICE_IDS = {
    // These were example IDs. YOU MUST REPLACE THEM with actual live/test Price IDs from your Stripe Dashboard.
    // They should look like 'price_xxxxxxxxxxxxxxxxxxxx'.
    elite: "price_1RvDdRG1gLpUu4C4xB1XxyBU", // Your actual Plus plan Price ID
    plus: "price_1RvDciG1gLpUu4C4xcKB08Nu", // Your actual Elite plan Price ID
  };

export function Abbonamenti({ promoCodeValid, promoCodeInput, loading, handleCheckout, setPromoCodeInput }: AbbonamentiProps) {

  return (
    <section className="container mx-auto px-4 py-16">
  <div className="text-center mb-12">
    <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
      Sblocca <span className="Skoolly">Skoolly</span> al massimo
    </h2>
    <p className="text-xl text-gray-600">Attiva un abbonamento e vivi la scuola senza limiti</p>
  </div>

  {/* Promo Code Input */}
  <div id="promo" className="max-w-xs mx-auto mb-8">
    <label htmlFor="promo-code" className="block text-gray-700 text-sm font-bold mb-2 text-center">
      Hai un codice promo?
    </label>
    <div className="flex">
      <Input
        id="promo-code"
        type="text"
        placeholder="Inserisci qui il codice promo"
        value={promoCodeInput}
        onChange={(e) => setPromoCodeInput(e.target.value)}
        className="flex-grow mr-2"
      />
    </div>
    {promoCodeValid && (
      <p className="text-green-600 text-center mt-2">
        Codice valido! Sconto del 20% applicato 🎉
      </p>
    )}
    {promoCodeInput && !promoCodeValid && (
      <p className="text-red-500 text-center mt-2">Codice non valido ❌</p>
    )}
  </div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
  {/* Basic Plan */}
  <Card className="relative border-2 border-border hover:border-muted-foreground/50 transition-all duration-300 bg-card">

    <CardHeader className="text-center">
      <CardTitle className="text-2xl font-bold text-foreground">Basic</CardTitle>
      <CardDescription className="text-lg text-muted-foreground">Perfetto per iniziare</CardDescription>
      <div className="text-4xl font-black text-foreground mt-4">Gratis</div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center space-x-3">
        <Check className="w-5 h-5 text-green-500" />
        <span className="text-foreground">Accesso agli eventi</span>
      </div>
      <div className="flex items-center space-x-3 text-muted-foreground">
        <span className="w-5 h-5 text-red-500">❌</span>
        <span>Commissioni su biglietti</span>
      </div>
      <div className="flex items-center space-x-3 text-muted-foreground">
        <span className="w-5 h-5 text-red-500">❌</span>
        <span>Nessun vantaggio partner</span>
      </div>
    </CardContent>
    <CardFooter>
      <Link href={"/login"} className="w-full">
        <Button className="w-full bg-muted-foreground hover:bg-foreground text-background font-bold" disabled={loading}>
          Inizia Gratis
        </Button>
      </Link>
    </CardFooter>
  </Card>

  {/* Plus Plan */}
  <Card className="relative border-2 border-purple-300 hover:border-purple-400 transition-all duration-300 transform hover:scale-105 bg-card shadow-lg">
    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-4 py-1">
      PIÙ SCELTO ⭐
    </Badge>
    <CardHeader className="text-center">
      <CardTitle className="text-2xl font-bold text-purple-600">Plus</CardTitle>
      <CardDescription className="text-lg text-muted-foreground">Per studenti attivi</CardDescription>
      <div className="text-4xl font-black text-purple-600 mt-4">
        €{promoCodeValid ? (4.99 * 0.8).toFixed(2) : "4,99"}
        <span className="text-lg text-muted-foreground">/mese</span>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center space-x-3">
        <Check className="w-5 h-5 text-green-500" />
        <span className="text-foreground">No commissioni sugli eventi</span>
      </div>
      <div className="flex items-center space-x-3">
        <Check className="w-5 h-5 text-green-500" />
        <span className="text-foreground">Accesso anticipato alle liste</span>
      </div>
      <div className="flex items-center space-x-3">
        <Check className="w-5 h-5 text-green-500" />
        <span className="text-foreground">Merchandising esclusivo</span>
      </div>
    </CardContent>
    <CardFooter>
      <Button
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
        onClick={() => handleCheckout(STRIPE_PRICE_IDS.plus, promoCodeValid ? promoCodeInput : null)}
        disabled={loading}
      >
        {loading ? "Caricamento..." : "Attiva Ora 🚀"}
      </Button>
    </CardFooter>
  </Card>

  {/* Elite Plan */}
  <Card className="relative border-2 border-yellow-300 hover:border-yellow-400 transition-all duration-300 bg-gradient-to-br from-yellow-50 to-orange-50">
    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
      <Crown className="w-4 h-4 text-white" />
    </div>
    <CardHeader className="text-center">
      <CardTitle className="text-2xl font-bold text-yellow-600">Elite</CardTitle>
      <CardDescription className="text-lg text-muted-foreground">Per i veri leader</CardDescription>
      <div className="text-4xl font-black text-yellow-600 mt-4">
        €{promoCodeValid ? (9.99 * 0.8).toFixed(2) : "9,99"}
        <span className="text-lg text-muted-foreground">/mese</span>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center space-x-3">
        <Check className="w-5 h-5 text-green-500" />
        <span className="text-foreground">Tutto il piano Plus</span>
      </div>
      <div className="flex items-center space-x-3">
        <Check className="w-5 h-5 text-green-500" />
        <span className="text-foreground">Salta-fila nei locali partner</span>
      </div>
      <div className="flex items-center space-x-3">
        <Check className="w-5 h-5 text-green-500" />
        <span className="text-foreground">Badge profilo esclusivo</span>
      </div>
    </CardContent>
    <CardFooter>
      <Button
        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
        onClick={() => handleCheckout(STRIPE_PRICE_IDS.elite, promoCodeValid ? promoCodeInput : null)}
        disabled={loading}
      >
        {loading ? "Caricamento..." : "Diventa Elite 👑"}
      </Button>
    </CardFooter>
  </Card>
</div>


</section>
  );
}
