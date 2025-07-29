"use client"

import { useState, useEffect } from "react"
import { getProdotti, ProdottoWithDetails } from "@/lib/database-functions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Truck, Shield, Heart, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation" // Importa useRouter

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
}

export default function MerchandisePage() {
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [productId: string]: number }>({});

  const router = useRouter(); // Inizializza il router

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const data = await getProdotti()
      if (!data) {
        setProdotti([])
        setLoading(false)
        return
      }

      const mapped: Prodotto[] = data.map((p: ProdottoWithDetails) => {
  const allColors = new Set<string>()
  if (p.colore?.nome) {
    allColors.add(p.colore.nome)
  }
  p.varianti?.forEach((v) => {
    if (v.colore?.nome) {
      allColors.add(v.colore.nome)
    }
  })

  const allImages: { url: string; color?: string }[] = []
  p.immagini?.forEach((img) => {
    allImages.push({ url: img.url, color: p.colore?.nome })
  })
  p.varianti?.forEach((v) => {
    v.immagini?.forEach((img) => {
      allImages.push({ url: img.url, color: v.colore?.nome })
    })
  })

  if (allImages.length === 0) {
    allImages.push({ url: "/placeholder.svg" })
  }

  return {
    id: p.id,
    name: p.nome,
    description: p.descrizione ?? "",
    price: p.prezzo,
    originalPrice: null,
    images: allImages,
    colors: Array.from(allColors),
    sizes: p.taglie ? p.taglie.map(t => t.nome) : [],
    stock: p.stock ?? 0,
  }
})


      setProdotti(mapped)
      setLoading(false)
      const initialImageIndexes: { [productId: string]: number } = {};
      mapped.forEach(product => {
        initialImageIndexes[product.id] = 0;
      });
      setCurrentImageIndex(initialImageIndexes);
      console.log("Mapped:", mapped)
      console.log("Prodotti data from API:", data)
    }

    fetchData()
  }, [])

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  const goToPreviousImage = (productId: string) => {
    setCurrentImageIndex(prevIndexes => {
      const currentIdx = prevIndexes[productId] || 0;
      const images = prodotti.find(p => p.id === productId)?.images || [];
      const newIdx = (currentIdx - 1 + images.length) % images.length;
      return { ...prevIndexes, [productId]: newIdx };
    });
  };

  const goToNextImage = (productId: string) => {
    setCurrentImageIndex(prevIndexes => {
      const currentIdx = prevIndexes[productId] || 0;
      const images = prodotti.find(p => p.id === productId)?.images || [];
      const newIdx = (currentIdx + 1) % images.length;
      return { ...prevIndexes, [productId]: newIdx };
    });
  };

  // Funzione per navigare alla pagina di dettaglio del prodotto
  const handleViewProduct = (productId: string) => {
    router.push(`/merchandising/${productId}`); // Assumi che la pagina di dettaglio sia /prodotti/[id]
  };

  if (loading) {
    return <div className="p-6 text-center">Caricamento prodotti...</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Hero Section */}
      <div className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Shop Ufficiale della Scuola 🛍️</h2>
        <p className="text-purple-100 mb-4">
          Scopri la collezione ufficiale con felpe, t-shirt, accessori e molto altro!
        </p>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            <span>Spedizione gratuita sopra i 50€</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>Garanzia di qualità</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prodotti.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
            <div className="relative">
              {/* Carousel for images */}
              <Image
                width={300}
                height={300}
                src={item.images[currentImageIndex[item.id]]?.url || "/placeholder.svg"}
                alt={item.name}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                    onClick={(e) => { e.stopPropagation(); goToPreviousImage(item.id); }}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                    onClick={(e) => { e.stopPropagation(); goToNextImage(item.id); }}
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                onClick={() => toggleFavorite(item.id)}
                aria-label="Aggiungi ai preferiti"
              >
                <Heart
                  className={`h-4 w-4 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                />
              </Button>
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
              <CardDescription className="line-clamp-2">{item.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Prezzo */}
              <div className="text-xl font-semibold">€{item.price.toFixed(2)}</div>

              {/* Colori disponibili */}
              {item.colors && item.colors.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Colori disponibili:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.colors.map((color) => (
                      <Badge key={color} variant="outline" className="text-xs">
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {item.sizes && item.sizes.length > 0 && (
  <div>
    <p className="text-sm font-medium">Taglie disponibili:</p>
    <div className="flex flex-wrap gap-2 mt-1">
      {item.sizes.map((size) => (
        <Badge key={size} variant="outline" className="text-xs">
          {size}
        </Badge>
      ))}
    </div>
  </div>
)}


              

              {/* Bottone "Acquista" */}
              <Button
                className="w-full mt-4"
                onClick={() => handleViewProduct(item.id)}
              >
                Acquista
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}