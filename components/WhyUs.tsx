"use client"
import Image from "next/image";
import { useState } from "react";

const reasons = [
  {
    icon: "/window.svg",
    title: "Sicurezza",
    description: "Dati protetti, accesso solo con email scolastica, privacy garantita.",
    color: "from-[#38bdf8] to-[#34d399]"
  },
  {
    icon: "/next.svg",
    title: "Community",
    description: "Uno spazio creato dagli studenti, per gli studenti, senza pubblicità invasive.",
    color: "from-[#fbbf24] to-[#fb7185]"
  },
  {
    icon: "/globe.svg",
    title: "Innovazione",
    description: "Strumenti digitali moderni per vivere la scuola in modo nuovo e smart.",
    color: "from-[#fb7185] to-[#fbbf24]"
  }
];

export default function WhyUs() {
  return (
    <section className="py-12 px-4 bg-gradient-to-br from-[#1e293b]/10 via-[#38bdf8]/10 to-[#34d399]/10 relative overflow-hidden" id="why">
      {/* Decorazioni geometriche */}
      <div className="absolute -top-8 right-0 w-32 h-32 bg-[#38bdf8]/20 rounded-full blur-2xl z-0" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#fbbf24]/20 rounded-full blur-2xl z-0" />
      <div className="max-w-3xl mx-auto relative z-10">
        <h2 className="text-2xl font-semibold mb-8 text-center text-[#1e293b]">Perché scegliere <span className="Skoolly">Skoolly</span>?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {reasons.map((reason, i) => (
            <ReasonCard key={i} {...reason} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReasonCard({ icon, title, description, color }: { icon: string; title: string; description: string; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center h-full transition-transform duration-200 group cursor-pointer hover:scale-105 hover:shadow-2xl animate-fade-in`}
      style={{ boxShadow: hovered ? "0 8px 32px 0 #38bdf822" : "0 4px 16px 0 #1e293b11" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`mb-2 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br ${color} shadow-lg transition-transform duration-200 ${hovered ? "animate-pulse" : ""}`}
      >
        <Image src={icon} alt={title} width={32} height={32} />
      </span>
      <h3 className="font-semibold text-lg mb-1 text-[#1e293b]">{title}</h3>
      <p className="text-sm text-[#334155]">{description}</p>
    </div>
  );
} 