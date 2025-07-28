"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Trash2, Eye } from "lucide-react"
import type { ProdottoWithScuola } from "@/types/database"
import Image from "next/image"
import { deleteProdotto } from "@/lib/database-functions"

interface MobileProductsListProps {
  products: ProdottoWithScuola[]
  onProductDeleted: (id: string) => void  // <-- modifica qui
}

export function MobileProductsList({ products, onProductDeleted }: MobileProductsListProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const getStatusBadge = (product: ProdottoWithScuola) => {
    if (!product.disponibile) {
      return (
        <Badge variant="secondary" className="text-xs">
          Non Disponibile
        </Badge>
      )
    }
    if (product.stock === 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Esaurito
        </Badge>
      )
    }
    if (product.stock < 10) {
      return (
        <Badge variant="outline" className="text-xs">
          Stock Basso
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="text-xs">
        Disponibile
      </Badge>
    )
  }

  const handleDelete = async (id: string) => {
  if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return

  setLoading(id)
  const success = await deleteProdotto(id)
  if (success) {
    onProductDeleted(id)    // <-- passa id qui
  }
  setLoading(null)
}

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <Card key={product.id} className="p-0">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Image
                src={product.immagine_url || "/placeholder.svg?height=60&width=60&text=Prodotto"}
                alt={product.nome}
                width={60}
                height={60}
                className="rounded-lg object-cover flex-shrink-0 h-16 mt-8 w-16"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{product.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.scuole.nome} - {product.scuole.citta}
                    </div>
                  </div>
                  {getStatusBadge(product)}
                </div>

                <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.descrizione}</div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">Prezzo: </span>
                    <span className="font-medium">€{product.prezzo.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stock: </span>
                    <span className={`font-medium ${product.stock < 10 ? "text-red-500" : ""}`}>{product.stock}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Creato: </span>
                    <span className="font-medium">{new Date(product.created_at).toLocaleDateString("it-IT")}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-transparent"
                    onClick={() => handleDelete(product.id)}
                    disabled={loading === product.id}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
