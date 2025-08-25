"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import type { ProdottoWithScuola } from "@/types/database"
import Image from "next/image"
import { MobileProductsList } from "./mobile-products-list"
import { deleteProdotto, updateProdotto } from "@/lib/database-functions"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import toast from "react-hot-toast"
import { EditDialog } from "@/components/EditDialog"

interface ProductsTableProps {
  products: ProdottoWithScuola[]
  onProductDeleted: (id: string) => void
  onProductUpdated: (updatedProduct: ProdottoWithScuola) => void // Ensure this prop is defined
}

export function ProductsTable({ products, onProductDeleted, onProductUpdated }: ProductsTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 3 // prodotti per pagina

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [currentProductToEdit, setCurrentProductToEdit] = useState<ProdottoWithScuola | null>(null) // New state

  const [search, setSearch] = useState("")
  const [filterScuola, setFilterScuola] = useState<string | null>(null)
  const [filterDisponibilità, setFilterDisponibilità] = useState<"tutti" | "disponibile" | "esaurito">("tutti")

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase())
    const matchesScuola = !filterScuola || p.scuole.id === filterScuola
    const matchesDisponibilità =
      filterDisponibilità === "tutti" ||
      (filterDisponibilità === "disponibile" && p.disponibile && p.stock > 0) ||
      (filterDisponibilità === "esaurito" && p.stock === 0)

    return matchesSearch && matchesScuola && matchesDisponibilità
  })

  // Calculate products for the current page
  const startIndex = (currentPage - 1) * pageSize
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize)

  const totalPages = Math.ceil(filteredProducts.length / pageSize)

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
      const newTotalPages = Math.ceil((filteredProducts.length - 1) / pageSize)
      if (currentPage > newTotalPages && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
      toast.success("Prodotto eliminato con successo!")
    } else {
      toast.error("Errore durante l'eliminazione del prodotto.")
    }
    setLoading(null)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterScuola, filterDisponibilità])

  // This useEffect is good, it will now trigger when handleEditClick sets editId
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestione Prodotti ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Vista Desktop */}
          
          <div className="hidden lg:block">
            <div className="mb-4 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4">
              <input
                type="text"
                placeholder="Cerca per nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-3 py-2 rounded-md text-sm w-full lg:w-64"
              />

              <select
                value={filterScuola ?? ""}
                onChange={(e) => setFilterScuola(e.target.value || null)}
                className="border px-3 py-2 rounded-md text-sm"
              >
                <option value="">Tutte le scuole</option>
                {[...new Set(products.map(p => `${p.scuole.id}|${p.scuole.nome}`))].map((val) => {
                  const [id, nome] = val.split("|")
                  return <option key={id} value={id}>{nome}</option>
                })}
              </select>

              <select
                value={filterDisponibilità}
                onChange={(e) => setFilterDisponibilità(e.target.value as "tutti" | "disponibile" | "esaurito")}
                className="border px-3 py-2 rounded-md text-sm"
              >
                <option value="tutti">Tutti</option>
                <option value="disponibile">Disponibili</option>
                <option value="esaurito">Esauriti</option>
              </select>
            </div>

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
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Image
                          src={product.immagine_url || "/placeholder.svg?height=40&width=40&text=Prodotto"}
                          alt={product.nome}
                          width={40}
                          height={40}
                          className="rounded-lg object-cover"
                          loading="lazy"
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
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(product)}
                        >
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

            {/* Pagination controls */}
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

          {/* Mobile View */}
          <div className="lg:hidden">
            <div className="mb-4 flex flex-col items-start gap-2">
              <input
                type="text"
                placeholder="Cerca per nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-3 py-2 rounded-md text-sm w-full"
              />

              <select
                value={filterScuola ?? ""}
                onChange={(e) => setFilterScuola(e.target.value || null)}
                className="border px-3 py-2 rounded-md text-sm w-full"
              >
                <option value="">Tutte le scuole</option>
                {[...new Set(products.map(p => `${p.scuole.id}|${p.scuole.nome}`))].map((val) => {
                  const [id, nome] = val.split("|")
                  return <option key={id} value={id}>{nome}</option>
                })}
              </select>

              <select
                value={filterDisponibilità}
                onChange={(e) => setFilterDisponibilità(e.target.value as "tutti" | "disponibile" | "esaurito")}
                className="border px-3 py-2 rounded-md text-sm w-full"
              >
                <option value="tutti">Tutti</option>
                <option value="disponibile">Disponibili</option>
                <option value="esaurito">Esauriti</option>
              </select>
            </div>
            <MobileProductsList
              products={filteredProducts} // You might want to paginate this for mobile too
              onProductDeleted={onProductDeleted}
              onProductUpdated={onProductUpdated} // Pass the new prop
            />
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun prodotto trovato. Aggiungi il primo prodotto!
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        title="Elimina Prodotto"
        description="Sei sicuro di voler eliminare questo prodotto? Questa azione non può essere annullata."
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

      {/* This EditDialog should be outside the map to avoid re-rendering many dialogs */}
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
    </>
  )
}