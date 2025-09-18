"use client"

import { useState, useEffect } from "react"
import { getProdotti, ProdottoWithDetails, getUserSchool } from "@/lib/database-functions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Truck, Shield, Heart, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import FloatingCartButton from "@/components/Cart/FloatingCartButton"
import './MerchandisePage.css';
import { Browser } from '@capacitor/browser';
import { Capacitor } from "@capacitor/core"
import { useIsMobile } from "@/hooks/use-mobile"
interface Prodotto {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number | null
  images: { url: string; color?: string }[]
  category?: string
  sizes?: string[]
  colors?: string[]
  stock?: number
  rating?: number
  reviews?: number
  isNew?: boolean
  isSale?: boolean
  schoolId?: string
}

async function getUserSchoolLink(userId: string): Promise<string | null> {
const { data: user, error: userError } = await supabase
  .from("utenti")
  .select("scuola_id")
  .eq("id", userId)
  .single();

if (userError || !user) return null;

const { data: scuola, error: schoolError } = await supabase
  .from("scuole")
  .select("link_merch")
  .eq("id", user.scuola_id)
  .single();

if (schoolError || !scuola) return null;

return scuola.link_merch;
}

export default function MerchandisePage() {
  const [linkMerch, setLinkMerch] = useState<string | null>(null)

  useEffect(() => {
    const fetchLink = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const link = await getUserSchoolLink(user.id)
      setLinkMerch(link)
      
      // Se sei su mobile, apri direttamente
      if (link && Capacitor.isNativePlatform()) {
        try {
          await Browser.open({ url: link })
        } catch (error) {
          console.error("Errore nell'apertura del browser:", error)
        }
      }
    }
    fetchLink()
  }, [])

if (!linkMerch) {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center gap-4">
      <p className="text-lg font-medium text-gray-800">
        Caricamento merchandising...
      </p>
      <p className="text-sm text-gray-600 max-w-xs">
        Se vedi questo messaggio, significa che la tua scuola non ha ancora
        attivato lo shop online.  
        🔔 Torna a controllare più avanti!
      </p>
    </div>
  )
}


  return (
    <div className="page-container">
      <div className="main-content">
        {/* Mostra l'iframe solo su web */}
        {!Capacitor.isNativePlatform() && (
          <iframe
            src={linkMerch}
            frameBorder="0"
            className="w-full h-screen border-0"
            title="Merchandise Store"
          />
        )}

        {/* Placeholder per mobile */}
        {Capacitor.isNativePlatform() && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4 p-4 bg-gray-50 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800">
              ✨ Stiamo caricando il merchandising...
            </h2>
            <p className="text-gray-600 text-base max-w-xs">
              Se non si apre automaticamente, prova a ricaricare l’app.  
              Grazie per la pazienza! 🙏
            </p>
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  )
}
