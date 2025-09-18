"use client"
import { useState } from "react"
import { UserPlus, Ticket, School } from "lucide-react"

const steps = [
  {
    icon: <UserPlus size={32} />,
    title: "Registrati",
    description: "Accedi con la tua email scolastica e crea il tuo profilo in pochi secondi.",
    color: "from-[#38bdf8] to-[#34d399]",
  },
  {
    icon: <Ticket size={32} />,
    title: "Partecipa",
    description: "Unisciti a eventi, forum, marketplace e scopri tutte le iniziative scolastiche.",
    color: "from-[#fbbf24] to-[#fb7185]",
  },
  {
    icon: <School size={32} />,
    title: "Vivi la scuola",
    description: "Scopri tutti i servizi digitali pensati per te e la tua classe, in un unico posto.",
    color: "from-[#34d399] to-[#38bdf8]",
  },
]

export default function HowItWorks() {
  return (
    <section
      id="how"
      className="py-12 px-4 bg-gradient-to-br from-[#1e293b]/10 via-[#38bdf8]/10 to-[#34d399]/10 relative overflow-hidden"
    >
      {/* Decorazioni sfumate */}
      <div className="absolute -top-10 left-0 w-32 h-32 bg-[#fb7185]/20 rounded-full blur-2xl z-0" />
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#fbbf24]/20 rounded-full blur-2xl z-0" />
      <div className="max-w-3xl mx-auto relative z-10">
        <h2 className="text-2xl font-semibold mb-8 text-center text-[#1e293b]">
          Come funziona?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <StepCard key={i} {...step} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StepCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center h-full transition-transform duration-200 group cursor-pointer hover:scale-105 hover:shadow-2xl animate-fade-in`}
      style={{
        boxShadow: hovered
          ? "0 8px 32px 0 #38bdf822"
          : "0 4px 16px 0 #1e293b11",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`mb-2 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br ${color} shadow-lg transition-transform duration-200 ${
          hovered ? "animate-pulse" : ""
        }`}
      >
        {icon}
      </span>
      <h3 className="font-semibold text-lg mb-1 text-[#1e293b]">{title}</h3>
      <p className="text-sm text-[#334155]">{description}</p>
    </div>
  )
}
