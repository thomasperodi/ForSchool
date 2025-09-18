"use client"
import Image from "next/image"
import Link from "next/link"
import { Instagram  } from "lucide-react"
import { SiTiktok } from "react-icons/si"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 relative overflow-hidden">
      {/* Effetti sfumati decorativi */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#38bdf8]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-52 h-52 bg-[#34d399]/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Logo + descrizione */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Image
                src="/images/SkoollyLogo.png"
                alt="Logo Skoolly"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="Skoolly text-2xl font-bold text-white">Skoolly</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              La piattaforma che rende la scuola più tua.
            </p>
            {/* Social */}
<div className="flex space-x-4 mt-4">
  <Link href="https://www.instagram.com/skoollyapp" target="_blank" className="hover:text-[#38bdf8] transition">
    <Instagram size={20} />
  </Link>
  <Link href="https://www.tiktok.com/@skoollyapp" target="_blank" className="hover:text-[#38bdf8] transition">
    <SiTiktok size={20} />
  </Link>
</div>

          </div>

          {/* Funzionalità */}
          <div>
            <h4 className="font-semibold text-white mb-4">Funzionalità</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/eventi" className="hover:text-white transition">Eventi</Link></li>
              <li><Link href="/ripetizioni" className="hover:text-white transition">Ripetizioni</Link></li>
              <li><Link href="/forum" className="hover:text-white transition">Forum</Link></li>
              <li><Link href="/marketplace" className="hover:text-white transition">Libri usati</Link></li>
            </ul>
          </div>

          {/* Supporto */}
          <div>
            <h4 className="font-semibold text-white mb-4">Supporto</h4>
            <ul className="space-y-2 text-sm">

              <li><Link href="/#contact" className="hover:text-white transition">Contattaci</Link></li>

            </ul>
          </div>

          {/* Legale */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legale</h4>
            <ul className="space-y-2 text-sm">
            
              <li><Link href="https://www.iubenda.com/privacy-policy/79987490" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="https://www.iubenda.com/privacy-policy/79987490/cookie-policy" className="hover:text-white transition">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} <span className="Skoolly">Skoolly</span>.  
            Tutti i diritti riservati. Realizzato da{" "}
            <span className="text-white font-medium">Thomas Perodi</span> ✨  
          </p>
        </div>
      </div>
    </footer>
  )
}
