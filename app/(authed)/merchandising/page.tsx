"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ShoppingBag, Search, Star, ShoppingCart, Heart, Truck, Shield } from "lucide-react"

const categories = [
  { id: "clothing", name: "Abbigliamento", count: 12 },
  { id: "accessories", name: "Accessori", count: 8 },
  { id: "stationery", name: "Cancelleria", count: 15 },
]

const merchandiseItems = [
  {
    id: "1",
    name: "Felpa con Cappuccio Scuola",
    description: "Felpa ufficiale della scuola in cotone biologico. Disponibile in vari colori.",
    price: 35,
    originalPrice: 45,
    images: ["/placeholder.svg?height=300&width=300"],
    category: "clothing",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blu Navy", "Grigio", "Nero"],
    stock: 25,
    rating: 4.8,
    reviews: 23,
    isNew: true,
    isSale: true,
  },
  {
    id: "2",
    name: "T-Shirt Logo Scuola",
    description: "T-shirt in cotone con logo della scuola ricamato. Perfetta per tutti i giorni.",
    price: 18,
    originalPrice: null,
    images: ["/placeholder.svg?height=300&width=300"],
    category: "clothing",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Bianco", "Blu Navy", "Rosso"],
    stock: 42,
    rating: 4.6,
    reviews: 18,
    isNew: false,
    isSale: false,
  },
  {
    id: "3",
    name: "Zaino Scuola Premium",
    description: "Zaino resistente con scomparto laptop e tasche organizer. Perfetto per studenti.",
    price: 65,
    originalPrice: 80,
    images: ["/placeholder.svg?height=300&width=300"],
    category: "accessories",
    sizes: null,
    colors: ["Nero", "Blu Navy", "Grigio"],
    stock: 15,
    rating: 4.9,
    reviews: 31,
    isNew: false,
    isSale: true,
  },
  {
    id: "4",
    name: "Set Penne Personalizzate",
    description: "Set di 5 penne con logo della scuola. Inchiostro di alta qualità.",
    price: 12,
    originalPrice: null,
    images: ["/placeholder.svg?height=300&width=300"],
    category: "stationery",
    sizes: null,
    colors: ["Blu", "Nero", "Rosso"],
    stock: 67,
    rating: 4.4,
    reviews: 12,
    isNew: true,
    isSale: false,
  },
  {
    id: "5",
    name: "Agenda Scolastica 2024/25",
    description: "Agenda ufficiale della scuola per l'anno scolastico. Layout ottimizzato per studenti.",
    price: 22,
    originalPrice: null,
    images: ["/placeholder.svg?height=300&width=300"],
    category: "stationery",
    sizes: null,
    colors: ["Blu", "Verde", "Viola"],
    stock: 33,
    rating: 4.7,
    reviews: 28,
    isNew: true,
    isSale: false,
  },
  {
    id: "6",
    name: "Borraccia Termica Scuola",
    description: "Borraccia in acciaio inox con isolamento termico. Mantiene le bevande calde/fredde.",
    price: 28,
    originalPrice: 35,
    images: ["/placeholder.svg?height=300&width=300"],
    category: "accessories",
    sizes: ["500ml", "750ml"],
    colors: ["Acciaio", "Nero", "Blu"],
    stock: 19,
    rating: 4.5,
    reviews: 15,
    isNew: false,
    isSale: true,
  },
]

export default function MerchandisePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("featured")
  const [favorites, setFavorites] = useState<string[]>([])

  const filteredItems = merchandiseItems
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        case "rating":
          return b.rating - a.rating
        case "newest":
          return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)
        default:
          return 0
      }
    })

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  return (
    <>
      

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

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cerca prodotti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">Tutte le categorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.count})
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="featured">In evidenza</option>
              <option value="newest">Più recenti</option>
              <option value="price-low">Prezzo: crescente</option>
              <option value="price-high">Prezzo: decrescente</option>
              <option value="rating">Più votati</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative">
                <img
                  src={item.images[0] || "/placeholder.svg"}
                  alt={item.name}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {item.isNew && <Badge className="bg-green-500">Nuovo</Badge>}
                  {item.isSale && <Badge className="bg-red-500">Offerta</Badge>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  onClick={() => toggleFavorite(item.id)}
                >
                  <Heart
                    className={`h-4 w-4 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                  />
                </Button>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {item.rating}
                    <span className="text-muted-foreground">({item.reviews})</span>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{item.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Colors */}
                {item.colors && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Colori disponibili:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.colors.map((color) => (
                        <Badge key={color} variant="outline" className="text-xs">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sizes */}
                {item.sizes && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Taglie:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.sizes.map((size) => (
                        <Badge key={size} variant="outline" className="text-xs">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.stock > 10 ? "Disponibile" : `Solo ${item.stock} rimasti`}
                  </span>
                  <span className={item.stock > 10 ? "text-green-600" : "text-orange-600"}>
                    {item.stock > 0 ? "In stock" : "Esaurito"}
                  </span>
                </div>

                {/* Price and Actions */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">€{item.price}</span>
                      {item.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">€{item.originalPrice}</span>
                      )}
                    </div>
                    {item.originalPrice && (
                      <p className="text-xs text-green-600">Risparmi €{item.originalPrice - item.price}</p>
                    )}
                  </div>
                  <Button className="flex items-center gap-2" disabled={item.stock === 0}>
                    <ShoppingCart className="h-4 w-4" />
                    {item.stock === 0 ? "Esaurito" : "Aggiungi"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun prodotto trovato</h3>
            <p className="text-muted-foreground">Prova a modificare i filtri di ricerca o esplora altre categorie.</p>
          </div>
        )}

        {/* Shopping Cart Summary */}
        <div className="fixed bottom-4 right-4">
          <Button size="lg" className="rounded-full shadow-lg">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Carrello (0)
          </Button>
        </div>
      </div>
    </>
  )
}
