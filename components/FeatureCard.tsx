"use client"
import { ReactNode, useState } from "react"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  color?: string // gradiente cerchio icona
}

export default function FeatureCard({ icon, title, description, color = "from-[#38bdf8] to-[#34d399]" }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center h-full transition-transform duration-200 group cursor-pointer hover:scale-105 hover:shadow-2xl`}
      style={{ boxShadow: hovered ? "0 8px 32px 0 #38bdf822" : "0 4px 16px 0 #1e293b11" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`mb-2 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br ${color} shadow-lg transition-transform duration-200 ${hovered ? "animate-pulse" : ""}`}
      >
        {icon}
      </span>
      <h3 className="font-semibold text-lg mb-1 text-[#1e293b]">{title}</h3>
      <p className="text-sm text-[#334155]">{description}</p>
    </div>
  )
}
