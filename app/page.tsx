import Image from "next/image";
import Navbar from "../components/Navbar";
import FeatureCard from "../components/FeatureCard";
import HowItWorks from "../components/HowItWorks";
import WhyUs from "../components/WhyUs";
import Faq from "../components/Faq";
import Contact from "../components/Contact";

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
          <h2 className="text-2xl font-semibold mb-8 text-center text-[#1e293b]">Cosa puoi fare su ForSchool?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <FeatureCard icon="/globe.svg" title="Eventi & Biglietti" description="Partecipa, acquista biglietti e resta aggiornato sugli eventi scolastici." color="from-[#38bdf8] to-[#34d399]" />
            <FeatureCard icon="/window.svg" title="Forum & Comunicazioni" description="Condividi idee, partecipa alle discussioni e ricevi annunci ufficiali." color="from-[#fbbf24] to-[#fb7185]" />
            <FeatureCard icon="/next.svg" title="Marketplace Studentesco" description="Compra e vendi libri, appunti, ripetizioni e merchandising scolastico." color="from-[#34d399] to-[#38bdf8]" />
            <FeatureCard icon="/vercel.svg" title="Foto di Classe" description="Prenota, scarica o ordina le foto della tua classe in modo sicuro." color="from-[#fb7185] to-[#fbbf24]" />
          </div>
        </div>
      </section>

      <HowItWorks />
      <WhyUs />
      <Faq />
      <Contact />

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-white border-t bg-[#1e293b] flex flex-col gap-2 mt-8">
        <div className="flex justify-center gap-4 mb-2">
          <a href="#" aria-label="Instagram" className="hover:underline text-[#fb7185] hover:text-[#fbbf24] transition-colors">Instagram</a>
          <a href="#" aria-label="Email" className="hover:underline text-[#38bdf8] hover:text-[#fbbf24] transition-colors">Email</a>
          <a href="#" aria-label="GitHub" className="hover:underline text-[#fbbf24] hover:text-[#38bdf8] transition-colors">GitHub</a>
        </div>
        <div>
          © {new Date().getFullYear()} ForSchool · Progetto open source per la scuola
        </div>
      </footer>
    </div>
  );
}
