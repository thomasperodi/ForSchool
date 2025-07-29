"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Trash2, Eye, ChevronRight, ChevronLeft } from "lucide-react"
import type { ProdottoWithScuola } from "@/types/database"
import Image from "next/image"
import { deleteProdotto, updateProdotto } from "@/lib/database-functions"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import toast from "react-hot-toast"
import { EditDialog } from "@/components/EditDialog"

interface MobileProductsListProps {
  products: ProdottoWithScuola[]
  onProductDeleted: (id: string) => void  // <-- modifica qui
  onProductUpdated: (updatedProduct: ProdottoWithScuola) => void
}

export function MobileProductsList({ products, onProductDeleted, onProductUpdated }: MobileProductsListProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
const [cancelId, setCancelId] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 3 // prodotti per pagina


  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [currentProductToEdit, setCurrentProductToEdit] = useState<ProdottoWithScuola | null>(null) // New state


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
  useEffect(() => {
    if (!editId) {
      setCurrentProductToEdit(null)
      setOpenEditDialog(false)
    } else {
      const prod = products.find(p => p.id === editId) ?? null
      setCurrentProductToEdit(prod)
      setOpenEditDialog(true)
    }
  }, [editId])

  function handleEditClick(product: ProdottoWithScuola) {
  setEditId(product.id)
}
const handleEditProdotto = async (updatedProductWithScuola: ProdottoWithScuola) => {
    // Destructure to get the actual product data for the database update.
    // We exclude 'scuole', 'created_at', 'updated_at' as they are managed by the database,
    // and 'id' as it's passed separately.
    const { scuole, created_at, updated_at, id, ...productDataForUpdate } = updatedProductWithScuola;

    const success = await updateProdotto(id, productDataForUpdate);

    if (success) {
      toast.success("Prodotto aggiornato con successo!");
      onProductUpdated(updatedProductWithScuola); // <-- Call the prop function here!
      setEditId(null); // This will also close the dialog via the useEffect
      // No need to setCurrentProductToEdit(null) explicitly here, as the useEffect handles it
      // when editId becomes null.
    } else {
      toast.error("Errore durante l'aggiornamento del prodotto.");
    }
  };

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
                  
                  <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(product)}
                        >
                          <Edit className="h-4 w-4" />
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

      {openEditDialog && currentProductToEdit && (
              <EditDialog<ProdottoWithScuola>
                open={openEditDialog}
                onOpenChange={setOpenEditDialog}
                id={editId}
                title="Modifica Prodotto"
                fields={[
                  { name: "nome", label: "Nome", type: "text" },
                  { name: "descrizione", label: "Descrizione", type: "text" },
                  { name: "prezzo", label: "Prezzo (€)", type: "number" },
                  { name: "stock", label: "Stock", type: "number" },
                  { name: "disponibile", label: "Disponibile", type: "checkbox" },
                  {
                    name: "scuola_id",
                    label: "Scuola",
                    type: "select",
                    options: [...new Set(products.map(p => `${p.scuole.id}|${p.scuole.nome}`))].map((val) => {
                      const [id, nome] = val.split("|")
                      return { value: id, label: nome }
                    }),
                  },
                  { name: "immagine_url", label: "URL Immagine", type: "text" },
                ]}
                initialValues={currentProductToEdit} // Use the state variable
                submitText="Salva Modifiche"
                onSubmit={handleEditProdotto}
                onSave={(data) => {
                  handleEditProdotto(data)
                  
                }}
              />
            )}
    </div>

    
  )
}
