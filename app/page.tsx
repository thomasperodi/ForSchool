"use client";
import Image from "next/image";
import Navbar from "../components/Navbar";
import FeatureCard from "../components/FeatureCard";
import HowItWorks from "../components/HowItWorks";
import WhyUs from "../components/WhyUs"; // Corrected typo here
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Camera, Check, Crown, MessagesSquare, Shirt, Star, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input"; // Import Input component for the promo code field
import { getUtenteCompleto } from "@/lib/api";
import { Capacitor } from "@capacitor/core";
import {useRouter } from "next/navigation";
import { useSession } from "@supabase/auth-helpers-react";
import Footer from "@/components/Footer";

// Define a type for your error state to hold more details
interface CustomError {
  message: string;
  code?: string;
  source?: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CustomError | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState<string>(""); // State to hold the promo code input
  const [promoCodeValid, setPromoCodeValid] = useState<boolean | null>(null);
  const router = useRouter();
  const session = useSession();

  // Define your Stripe Price IDs here.
  // IMPORTANT: Replace these with your actual Stripe Price IDs
  // for your Plus and Elite subscription products.
  const STRIPE_PRICE_IDS = {
    // These were example IDs. YOU MUST REPLACE THEM with actual live/test Price IDs from your Stripe Dashboard.
    // They should look like 'price_xxxxxxxxxxxxxxxxxxxx'.
    elite: "price_1RvDdRG1gLpUu4C4xB1XxyBU", // Your actual Plus plan Price ID
    plus: "price_1RvDciG1gLpUu4C4xcKB08Nu", // Your actual Elite plan Price ID
  };


// useEffect(() => {
//   if (Capacitor.isNativePlatform()) {
//     router.replace(session ? '/home' : '/login');
//   }
// }, [session]);



  useEffect(() => {
    // This is a placeholder for your actual authentication check.
    const checkAuthenticationStatus = () => {
      const userToken = localStorage.getItem('user_auth_token');
      if (!userToken) {
        console.warn("DEBUG: User is not authenticated on page load.");
      } else {
        console.log("DEBUG: User is authenticated (token found).");
      }
    };
    checkAuthenticationStatus();
  }, []);

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


  const elitePrice = 7.99;
  const discountedPrice = (elitePrice * 0.75).toFixed(2);
  const STRIPE_PRICE_ID_ELITE = "price_1S27l1G1gLpUu4C4Jd0vIePN"; 

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9] text-[#1e293b] font-sans">
      <Navbar />
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-8 text-center bg-gradient-to-b from-[#1e293b] via-[#38bdf8] to-[#34d399] relative overflow-hidden">
        <span className="inline-block px-4 py-1 rounded-full bg-[#fbbf24] text-[#1e293b] text-xs font-semibold shadow mb-2 animate-bounce">Nuova piattaforma!</span>
        <Image src="/file.svg" alt="Logo" width={72} height={72} className="mb-2 drop-shadow-lg" loading="lazy"/>
        <h1 className="Skoolly text-6xl">Skoolly</h1>
        <p className="text-lg sm:text-xl max-w-2xl mb-6 text-white/90">
          La piattaforma digitale per la vita scolastica: eventi, comunicazione, marketplace, foto di classe e molto altro. Costruita dagli studenti, per gli studenti.
        </p>
        <Link href="/login" className="block w-fit mx-auto relative z-10">
  <button
    className="w-full rounded-md bg-[#38bdf8] text-[#1e293b] px-6 py-3 font-medium text-lg shadow-lg hover:bg-[#fbbf24] hover:text-[#1e293b] hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#fbbf24]/60 active:scale-95"
  >
    Accedi con email scolastica
  </button>
</Link>

{/* Decorative spheres */}
<div className="absolute -top-10 -left-10 w-40 h-40 bg-[#fb7185]/30 rounded-full blur-2xl z-0 pointer-events-none" />
<div className="absolute -bottom-16 right-0 w-56 h-56 bg-[#34d399]/30 rounded-full blur-2xl z-0 pointer-events-none" />

      </section>

      {/* Main Features */}
      <section id="features" className="py-12 bg-gradient-to-b from-[#f1f5f9] via-white to-[#f1f5f9]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-8 text-center text-[#1e293b]">Cosa puoi fare su <span className="Skoolly">Skoolly</span>?</h2>
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
  <FeatureCard 
    icon={<Ticket size={32} />} 
    title="Eventi & Biglietti" 
    description="Scopri gli eventi della tua scuola, partecipa e acquista i biglietti online in pochi clic." 
    color="from-[#38bdf8] to-[#34d399]" 
  />
  <FeatureCard 
    icon={<BookOpen size={32} />} 
    title="Marketplace & Ripetizioni" 
    description="Compra e vendi libri usati, appunti, ripetizioni e materiale scolastico tra studenti." 
    color="from-[#fbbf24] to-[#fb7185]" 
  />
  <FeatureCard 
    icon={<Shirt size={32} />} 
    title="Merchandising" 
    description="Ordina il merchandising ufficiale della tua scuola: felpe, t-shirt e accessori." 
    color="from-[#6366f1] to-[#8b5cf6]" 
  />

  <FeatureCard 
    icon={<Star size={32} />} 
    title="Promozioni & Sconti" 
    description="Scopri offerte, sconti e promozioni riservate agli studenti grazie agli sponsor." 
    color="from-[#facc15] to-[#f59e0b]" 

  />
</div>

        </div>
      </section>
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
          Sblocca <span className="Skoolly">Skoolly</span> al massimo
        </h2>
        <p className="text-xl text-gray-600">Attiva l&apos;abbonamento Elitè e vivi la scuola senza limiti</p>
      </div>

      {/* Promo Code */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Gratis */}
        <Card className="border-2 border-gray-200 hover:border-gray-400 transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Gratis</CardTitle>
            <CardDescription className="text-gray-500">Per iniziare senza impegno</CardDescription>
            <div className="text-4xl font-black text-gray-800 mt-4">€0</div>
            <span className="text-gray-500 text-sm">/mese</span>
          </CardHeader>
          <CardContent className="space-y-3 mt-4">
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>Accesso agli eventi pubblici</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-400">
              <span className="w-5 h-5 text-red-500">❌</span>
              <span>Marketplace e salta fila non inclusi</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-400">
              <span className="w-5 h-5 text-red-500">❌</span>
              <span>Eventi esclusivi abbonati</span>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold">
                Inizia Gratis
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Elite */}
        <Card className="relative border-2 border-purple-400 hover:border-purple-500 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg">
          {/* <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-4 py-1">
            PIÙ SCELTO ⭐
          </Badge> */}
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">Elitè</CardTitle>
            <CardDescription className="text-gray-500">Per studenti attivi</CardDescription>
            <div className="text-4xl font-black text-purple-600 mt-4">
              €{promoCodeValid ? discountedPrice : elitePrice.toFixed(2)}
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
              onClick={() => handleCheckout(STRIPE_PRICE_ID_ELITE, promoCodeValid ? promoCodeInput : null)}
              disabled={loading}
            >
              {loading ? "Caricamento..." : "Attiva Elite 🚀"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>


      <HowItWorks />
      <WhyUs /> {/* Corrected typo here */}
      <Faq />
      <Contact />

      {/* Footer */}
      {/* <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r rounded-lg flex items-center justify-center">
                  <Image src="/images/SkoollyLogo.png" alt="Logo Skoolly" width={48} height={48} loading="lazy" />
                </div>
                <span className="Skoolly text-3xl">Skoolly</span>
              </div>
              <p className="text-gray-400">La piattaforma che rende la scuola più tua.</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Funzionalità</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Eventi</li>
                <li>Ripetizioni</li>
                <li>Forum</li>
                <li>Libri usati</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Supporto</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Centro assistenza</li>
                <li>Contattaci</li>
                <li>FAQ</li>
                <li>Login Admin</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legale</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Termini di servizio</li>
                <li>Privacy Policy</li>
                <li>Cookie Policy</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} <span className="Skoolly">Skoolly</span>. Tutti i diritti riservati. Realizzato da Thomas Perodi. Fatto per gli studenti.</p>
          </div>
        </div>
      </footer> */}
      <Footer/>
    </div>
  );
}

