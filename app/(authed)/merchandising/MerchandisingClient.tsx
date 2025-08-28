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

export default function MerchandisePage() {
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [productId: string]: number }>({})
  const [schoolId, setSchoolId] = useState<string | null>(null)

  // Filtri
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedSize, setSelectedSize] = useState<string>("all")

  // Nuovi stati per filtro nome e ordinamento
const [searchTerm, setSearchTerm] = useState("")
const [sortOption, setSortOption] = useState<"name" | "priceAsc" | "priceDesc">("name")


  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 1. Ottieni scuola utente
      const user = await supabase.auth.getUser()
      const userId  = user.data.user?.id ?? null
      const userSchoolId = await getUserSchool(userId?.toString() ?? "") 
      setSchoolId(userSchoolId ?? null)

      // 2. Ottieni prodotti
      const data = await getProdotti()
      if (!data) {
        setProdotti([])
        setLoading(false)
        return
      }

      const mapped: Prodotto[] = data.map((p: ProdottoWithDetails) => {
        const allColors = new Set<string>()
        if (p.colore?.nome) allColors.add(p.colore.nome)
        p.varianti?.forEach((v) => {
          if (v.colore?.nome) allColors.add(v.colore.nome)
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
        if (allImages.length === 0) allImages.push({ url: "/placeholder.svg" })

        return {
          id: p.id,
          name: p.nome,
          description: p.descrizione ?? "",
          price: p.prezzo,
          originalPrice: null,
          images: allImages,
          colors: Array.from(allColors),
          sizes: p.taglie ? p.taglie.map((t) => t.nome) : [],
          stock: p.stock ?? 0,
          schoolId: p.scuola_id, // Assumi che la tabella prodotti abbia un campo scuola_id
        }
      })

      setProdotti(mapped)
      setLoading(false)

      const initialImageIndexes: { [productId: string]: number } = {}
      mapped.forEach((product) => {
        initialImageIndexes[product.id] = 0
      })
      setCurrentImageIndex(initialImageIndexes)
    }

    fetchData()
  }, [])

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  const goToPreviousImage = (productId: string) => {
    setCurrentImageIndex((prevIndexes) => {
      const currentIdx = prevIndexes[productId] || 0
      const images = prodotti.find((p) => p.id === productId)?.images || []
      const newIdx = (currentIdx - 1 + images.length) % images.length
      return { ...prevIndexes, [productId]: newIdx }
    })
  }

  const goToNextImage = (productId: string) => {
    setCurrentImageIndex((prevIndexes) => {
      const currentIdx = prevIndexes[productId] || 0
      const images = prodotti.find((p) => p.id === productId)?.images || []
      const newIdx = (currentIdx + 1) % images.length
      return { ...prevIndexes, [productId]: newIdx }
    })
  }

  const handleViewProduct = (productId: string) => {
    router.push(`/merchandising/${productId}`)
  }

  // Filtra prodotti per scuola e filtri selezionati
  const filteredProducts = prodotti
  .filter((item) => {
    // Mostra solo i prodotti della stessa scuola
    console.log("School ID:", schoolId, "Product School ID:", item.schoolId)
    if (!schoolId || item.schoolId !== schoolId) return false

    // Filtra per taglia
    if (selectedSize !== "all" && !(item.sizes || []).includes(selectedSize)) return false

    // Filtra per ricerca nome
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false

    return true
  })
  .sort((a, b) => {
    switch (sortOption) {
      case "priceAsc":
        return a.price - b.price
      case "priceDesc":
        return b.price - a.price
      case "name":
      default:
        return a.name.localeCompare(b.name)
    }
  })


  if (loading) {
    return <div className="p-6 text-center">Caricamento prodotti...</div>
  }

  const sizes = Array.from(new Set(prodotti.flatMap((p) => p.sizes || [])))

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Hero Section */}
      <FloatingCartButton />
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

      {/* Filtri */}
      {/* Filtri */}
<div className="flex flex-wrap gap-4 items-center w-full">
  <Input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Cerca prodotto..."
    className="border rounded-lg px-3 py-2 w-full sm:w-48"
  />

  {/* Ordinamento */}
  <Select
    value={sortOption}
    onValueChange={(v) => setSortOption(v as typeof sortOption)}
  >
    <SelectTrigger className="w-full sm:w-48">
      <SelectValue placeholder="Ordina per" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="name">Nome (A-Z)</SelectItem>
      <SelectItem value="priceAsc">Prezzo crescente</SelectItem>
      <SelectItem value="priceDesc">Prezzo decrescente</SelectItem>
    </SelectContent>
  </Select>
</div>


      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
            <div className="relative w-full aspect-square">
  {/* Carousel for images */}
  <Image
    fill
    src={item.images[currentImageIndex[item.id]]?.url || "/placeholder.svg"}
    alt={item.name}
    className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
    loading="lazy"
  />

  {item.images.length > 1 && (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
        onClick={(e) => { e.stopPropagation(); goToPreviousImage(item.id); }}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
        onClick={(e) => { e.stopPropagation(); goToNextImage(item.id); }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </>
  )}
</div>


            <CardHeader className="pb-2">
              <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
              <CardDescription className="line-clamp-2">{item.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-xl font-semibold">€{item.price.toFixed(2)}</div>

              {item.colors && item.colors.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Colori disponibili:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.colors.map((color) => (
                      <Badge key={color} variant="outline" className="text-xs">
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {item.sizes && item.sizes.length > 0 && (
  <div>
    <p className="text-sm font-medium">Taglie disponibili:</p>
    <div className="flex flex-wrap gap-2 mt-1">
      {item.sizes
        .slice() // copia per non mutare l'array originale
        .sort((a, b) => {
          const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
          return order.indexOf(a) - order.indexOf(b);
        })
        .map((size) => (
          <Badge key={size} variant="outline" className="text-xs">
            {size}
          </Badge>
        ))}
    </div>
  </div>
)}


              <Button className="w-full mt-4" onClick={() => handleViewProduct(item.id)}>
                Acquista
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
