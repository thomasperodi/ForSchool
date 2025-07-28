"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Trash2, Eye, ChevronRight, ChevronLeft } from "lucide-react"
import type { ProdottoWithScuola } from "@/types/database"
import Image from "next/image"
import { deleteProdotto } from "@/lib/database-functions"
import { ConfirmDialog } from "@/components/ConfirmDialog"

interface MobileProductsListProps {
  products: ProdottoWithScuola[]
  onProductDeleted: (id: string) => void  // <-- modifica qui
}

export function MobileProductsList({ products, onProductDeleted }: MobileProductsListProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
const [cancelId, setCancelId] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 3 // prodotti per pagina

  const totalPages = Math.ceil(products.length / pageSize)
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

  const handleDeleteProdotto = async (id: string) => {
    

    setLoading(id)
    const success = await deleteProdotto(id)
    if (success) {
      onProductDeleted(id)
      // Se elimini l'ultimo prodotto nella pagina, torna indietro di una pagina se non sei alla prima
      const newTotalPages = Math.ceil((products.length - 1) / pageSize)
      if (currentPage > newTotalPages && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    }
    setLoading(null)
  }

  return (
    <div className="space-y-3">
      {products
  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
  .map((product) => (

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
                    onClick={() => {
                          setOpenDeleteDialog(true)
                          setCancelId(product.id)
                        }}
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

{totalPages > 1 && (
            <div className="flex justify-end items-center space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Mostro i numeri pagina */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
      <ConfirmDialog
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        title="Annulla Prenotazione"
        description="Sei sicuro di voler annullare questa prenotazione? Questa azione non può essere annullata."
        cancelText="Annulla"
        actionText="Elimina"
        actionClassName="bg-[#f02e2e] text-white"
        onConfirm={async () => {
          if (cancelId) {
            await handleDeleteProdotto(cancelId)
            setCancelId(null)
          }
        }}
        onCancel={() => {
          setOpenDeleteDialog(false)
          setCancelId(null)
        }}
      />
    </div>

    
  )
}
