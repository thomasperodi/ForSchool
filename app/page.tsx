import Image from "next/image";
import Navbar from "../components/Navbar";
import FeatureCard from "../components/FeatureCard";
import HowItWorks from "../components/HowItWorks";
import WhyUs from "../components/WhyUs";
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9] text-[#1e293b] font-sans">
      <Navbar />
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-8 text-center bg-gradient-to-b from-[#1e293b] via-[#38bdf8] to-[#34d399] relative overflow-hidden">
        <span className="inline-block px-4 py-1 rounded-full bg-[#fbbf24] text-[#1e293b] text-xs font-semibold shadow mb-2 animate-bounce">Nuova piattaforma!</span>
        <Image src="/file.svg" alt="Logo" width={72} height={72} className="mb-2 drop-shadow-lg" />
        <h1 className="Skoolly text-6xl">Skoolly</h1>
        <p className="text-lg sm:text-xl max-w-2xl mb-6 text-white/90">
          La piattaforma digitale per la vita scolastica: eventi, comunicazione, marketplace, foto di classe e molto altro. Costruita dagli studenti, per gli studenti.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-[#38bdf8] text-[#1e293b] px-6 py-3 font-medium text-lg shadow-lg hover:bg-[#fbbf24] hover:text-[#1e293b] hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#fbbf24]/60 animate-pulse"
        >
          Accedi con email scolastica
        </a>
        {/* Effetto decorativo sfere */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#fb7185]/30 rounded-full blur-2xl z-0" />
        <div className="absolute -bottom-16 right-0 w-56 h-56 bg-[#34d399]/30 rounded-full blur-2xl z-0" />
      </section>

      {/* Funzionalità principali */}
      <section id="features" className="py-12 bg-gradient-to-b from-[#f1f5f9] via-white to-[#f1f5f9]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-8 text-center text-[#1e293b]">Cosa puoi fare su <span className="Skoolly">Skoolly</span>?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <FeatureCard icon="/globe.svg" title="Eventi & Biglietti" description="Partecipa, acquista biglietti e resta aggiornato sugli eventi scolastici." color="from-[#38bdf8] to-[#34d399]" />
            <FeatureCard icon="/window.svg" title="Forum & Comunicazioni" description="Condividi idee, partecipa alle discussioni e ricevi annunci ufficiali." color="from-[#fbbf24] to-[#fb7185]" />
            <FeatureCard icon="/next.svg" title="Marketplace Studentesco" description="Compra e vendi libri, appunti, ripetizioni e merchandising scolastico." color="from-[#34d399] to-[#38bdf8]" />
            <FeatureCard icon="/vercel.svg" title="Foto di Classe" description="Prenota, scarica o ordina le foto della tua classe in modo sicuro." color="from-[#fb7185] to-[#fbbf24]" />
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">Sblocca <span className="Skoolly">Skoolly</span> al massimo</h2>
          <p className="text-xl text-gray-600">Attiva un abbonamento e vivi la scuola senza limiti</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Basic Plan */}
          <Card className="relative border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 bg-white">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-800">Basic</CardTitle>
              <CardDescription className="text-lg">Perfetto per iniziare</CardDescription>
              <div className="text-4xl font-black text-gray-800 mt-4">Gratis</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Accesso agli eventi</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <span className="w-5 h-5 text-red-500">❌</span>
                <span>Commissioni su biglietti</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <span className="w-5 h-5 text-red-500">❌</span>
                <span>Nessun vantaggio partner</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold">Inizia Gratis</Button>
            </CardFooter>
          </Card>

          {/* Plus Plan */}
          <Card className="relative border-2 border-purple-300 hover:border-purple-400 transition-all duration-300 transform hover:scale-105 bg-white shadow-lg">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-4 py-1">
              PIÙ SCELTO ⭐
            </Badge>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-purple-600">Plus</CardTitle>
              <CardDescription className="text-lg">Per studenti attivi</CardDescription>
              <div className="text-4xl font-black text-purple-600 mt-4">
                €2,99<span className="text-lg text-gray-500">/mese</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>No commissioni sugli eventi</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Accesso anticipato alle liste</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Merchandising esclusivo</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold">
                Attiva Ora 🚀
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
              <CardDescription className="text-lg">Per i veri leader</CardDescription>
              <div className="text-4xl font-black text-yellow-600 mt-4">
                €5,99<span className="text-lg text-gray-500">/mese</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Tutto il piano Plus</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Salta-fila nei locali partner</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Badge profilo esclusivo</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold">
                Diventa Elite 👑
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <HowItWorks />
      <WhyUs />
      <Faq />
      <Contact />

      {/* Footer */}
       <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r rounded-lg flex items-center justify-center">
                  <Image src="/images/SkoollyLogo.png" alt="Logo Skoolly" width={48} height={48}  />
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
            <p>&copy; {new Date().getFullYear()} <span className="Skoolly">Skoolly</span>. Tutti i diritti riservati.  Realizzato da Thomas Perodi. Fatto per gli studenti.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
