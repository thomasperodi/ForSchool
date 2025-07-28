"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import type { ProdottoWithScuola } from "@/types/database"
import Image from "next/image"
import { MobileProductsList } from "./mobile-products-list"
import { deleteProdotto } from "@/lib/database-functions"
import { ConfirmDialog } from "@/components/ConfirmDialog"

interface ProductsTableProps {
  products: ProdottoWithScuola[]
  onProductDeleted: (id: string) => void
}

export function ProductsTable({ products, onProductDeleted }: ProductsTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10 // prodotti per pagina

  const totalPages = Math.ceil(products.length / pageSize)

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
const [cancelId, setCancelId] = useState<string | null>(null)



  const getStatusBadge = (product: ProdottoWithScuola) => {
    if (!product.disponibile) {
      return <Badge variant="secondary">Non Disponibile</Badge>
    }
    if (product.stock === 0) {
      return <Badge variant="destructive">Esaurito</Badge>
    }
    if (product.stock < 10) {
      return <Badge variant="outline">Stock Basso</Badge>
    }
    return <Badge variant="default">Disponibile</Badge>
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

  // prodotti da mostrare in questa pagina
  const currentProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Gestione Prodotti ({products.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Vista Desktop */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Scuola</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Creazione</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Image
                        src={product.immagine_url || "/placeholder.svg?height=40&width=40&text=Prodotto"}
                        alt={product.nome}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium">{product.nome}</div>
                        <div className="text-sm text-muted-foreground">{product.descrizione?.substring(0, 50)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.scuole.nome}</div>
                      <div className="text-sm text-muted-foreground">{product.scuole.citta}</div>
                    </div>
                  </TableCell>
                  <TableCell>€{product.prezzo.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={product.stock < 10 ? "text-red-500 font-medium" : ""}>{product.stock}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(product)}</TableCell>
                  <TableCell>{new Date(product.created_at).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {/* <Button variant="outline" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button> */}
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setOpenDeleteDialog(true)
                          setCancelId(product.id)
                        }}
                        disabled={loading === product.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Controlli paginazione */}
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
        </div>

        {/* Vista Mobile */}
        <div className="lg:hidden">
          {/* Per mobile potresti usare la paginazione identica, oppure infinite scroll */}
          <MobileProductsList
            products={products}
            onProductDeleted={onProductDeleted}
          />
        </div>

        {products.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nessun prodotto trovato. Aggiungi il primo prodotto!
          </div>
        )}
      </CardContent>
    </Card>
    
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
    </>
    
  )
}
