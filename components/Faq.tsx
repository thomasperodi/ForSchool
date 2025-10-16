"use client"
import { useState } from "react";

const faqs = [
  {
    question: "Chi può iscriversi a Skoolly?",
    answer: "Tutti gli studenti, rappresentanti e docenti delle scuole superiori e professionali che hanno una email scolastica.",
    accent: "#fb7185"
  },
  {
    question: "Skoolly è gratuito?",
    answer: "Sì, l'accesso e l'uso della piattaforma sono gratuiti per tutti gli studenti.",
    accent: "#fb7185"
  },
  {
    question: "I miei dati sono al sicuro?",
    answer: "Assolutamente sì: usiamo solo provider sicuri e non vendiamo né condividiamo i tuoi dati con terzi.",
    accent: "#fb7185"
  }
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="py-12 px-4 bg-gradient-to-br from-[#f1f5f9] via-[#38bdf8]/10 to-[#fbbf24]/10 relative overflow-hidden">
      {/* Decorazione sfumata */}
      <div className="absolute -top-8 right-0 w-32 h-32 bg-[#38bdf8]/20 rounded-full blur-2xl z-0" />
      <div className="max-w-2xl mx-auto relative z-10">
        <h2 className="text-2xl font-semibold mb-8 text-center text-[#1e293b]">Domande frequenti</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className={`border-l-4 rounded-lg bg-white shadow group transition-all duration-300 border-[${faq.accent}]`}>
              <button
                className="w-full flex justify-between items-center px-4 py-3 text-left font-medium focus:outline-none hover:bg-[#f1f5f9] transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span>{faq.question}</span>
                <span className={`ml-2 transition-transform duration-300 ${open === i ? "rotate-90 text-[#38bdf8]" : "text-[#fbbf24]"}`}>{open === i ? "-" : "+"}</span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${open === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
                style={{}}
              >
                <div className="px-4 pb-4 text-[#334155] text-sm">{faq.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 