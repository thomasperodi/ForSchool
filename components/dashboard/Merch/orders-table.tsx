// orders-table.tsx
"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Package, Truck, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import type { OrdineMerchCompleto } from "@/types"
import { MobileOrdersList } from "./mobile-orders-list"
import { deleteOrdineMerch } from "@/lib/database-functions"
import toast from "react-hot-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
// import { supabase } from "@/lib/supabaseClient" // Not directly used in the provided snippet

interface OrdersTableProps {
  orders: OrdineMerchCompleto[]
}

const ITEMS_PER_PAGE = 10 // For desktop
const MOBILE_ITEMS_PER_PAGE = 3; // For mobile

export function OrdersTable({ orders }: OrdersTableProps) {
  const [localOrders, setLocalOrders] = useState(orders)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1) // Current page for desktop

  // Filter states - now managed here
  const [filterSchool, setFilterSchool] = useState<string>("")
  const [filterProductType, setFilterProductType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<OrdineMerchCompleto["stato"] | "">("")

  const [openDetails, setOpenDetails] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrdineMerchCompleto | null>(null);

  // Status badge function (unchanged)
  const getStatusBadge = (status: OrdineMerchCompleto["stato"]) => {
    const statusConfig: Record<
      OrdineMerchCompleto["stato"],
      { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
    > = {
      in_attesa: { label: "In Attesa", variant: "secondary" },
      spedito: { label: "Spedito", variant: "outline" },
      ritirato: { label: "Consegnato", variant: "default" },
    }
    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Toggle selection (unchanged)
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedOrders(new Set(localOrders.map((o) => o.id)))
  }

  const deselectAll = () => {
    setSelectedOrders(new Set())
  }

  // Update locale and backend (unchanged)
  const updateLocalOrderStatus = (orderId: string, newStatus: OrdineMerchCompleto["stato"]) => {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, stato: newStatus } : o))
    )
  }

  const updateMultipleLocalStatuses = (orderIds: string[], newStatus: OrdineMerchCompleto["stato"]) => {
    setLocalOrders((prev) =>
      prev.map((o) => (orderIds.includes(o.id) ? { ...o, stato: newStatus } : o))
    )
  }

  async function updateOrdersStatus(orderIds: string[], newStatus: OrdineMerchCompleto["stato"]) {
    try {
      setLoading(true)
      const res = await fetch("/api/updateStatusOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, newStatus }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Errore durante l'aggiornamento degli ordini")
      }

      updateMultipleLocalStatuses(orderIds, newStatus)
      setSelectedOrders(new Set())
      toast.success("Stato ordine aggiornato con successo!")
    } catch (error) {
      console.error(error)
      toast.error("Si è verificato un errore durante l'aggiornamento degli ordini.")
    } finally {
      setLoading(false)
    }
  }

  const handleBulkChangeStatus = (newStatus: OrdineMerchCompleto["stato"]) => {
    if (selectedOrders.size === 0) return
    updateOrdersStatus(Array.from(selectedOrders), newStatus)
  }

  // Filter orders - now handles all filtering logic
  const filteredOrders = useMemo(() => {
    return localOrders.filter((order) => {
      if (filterSchool && order.utente?.scuola?.nome !== filterSchool) {
        return false
      }
      if (
        filterProductType &&
        !order.prodotto?.nome.toLowerCase().includes(filterProductType.toLowerCase())
      ) {
        return false
      }
      if (filterStatus && order.stato !== filterStatus) {
        return false
      }
      return true
    })
  }, [localOrders, filterSchool, filterProductType, filterStatus])

  // Calculate total pages for desktop
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)

  // Slice orders to show on current desktop page
  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredOrders.slice(startIdx, startIdx + ITEMS_PER_PAGE)
  }, [filteredOrders, currentPage])

  // Extract schools and products (unchanged)
  const uniqueSchools = useMemo(() => {
    const scuoleSet = new Set<string>()
    localOrders.forEach((o) => {
      if (o.utente?.scuola?.nome) scuoleSet.add(o.utente.scuola.nome)
    })
    return Array.from(scuoleSet)
  }, [localOrders])

  const uniqueProductNames = useMemo(() => {
    const prodSet = new Set<string>()
    localOrders.forEach((o) => {
      if (o.prodotto?.nome) prodSet.add(o.prodotto.nome)
    })
    return Array.from(prodSet)
  }, [localOrders])

  // Change page, avoid out of range pages for desktop
  const goToPage = (page: number) => {
    if (page < 1) page = 1
    else if (page > totalPages) page = totalPages
    setCurrentPage(page)
  }

  async function handleDeleteOrder(id: string) {
    const success = await deleteOrdineMerch(id);

    if (!success) {
      toast.error("Errore durante la cancellazione dell'ordine");
      return;
    }

    toast.success("Ordine cancellato con successo");

    // Update local state by removing the deleted order
    setLocalOrders((prev) => prev.filter((o) => o.id !== id));

    // Close dialog and reset state
    setOpenDeleteDialog(false);
    setDeleteId(null);
    setSelectedOrders(new Set());

    // Adjust desktop page if needed
    const startIdxDesktop = (currentPage - 1) * ITEMS_PER_PAGE;
    const remainingItemsDesktop = filteredOrders.length - 1;
    if (remainingItemsDesktop <= startIdxDesktop && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }

  const handleMobileViewDetails = (order: OrdineMerchCompleto) => {
    setSelectedOrderDetails(order);
    setOpenDetails(true);
  }

  const handleMobileDeleteOrder = (orderId: string) => {
    setDeleteId(orderId);
    setOpenDeleteDialog(true);
  }

  function abbreviate(text: string, maxLength = 15) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ordini Recenti</CardTitle>

          {/* --- DESKTOP FILTERS & BULK ACTIONS --- */}
          <div className="hidden md:block">
            <div className="flex flex-wrap gap-4 my-4">
              <select
                value={filterSchool}
                onChange={(e) => {
                  setFilterSchool(e.target.value)
                  setCurrentPage(1) // reset page if filter changes
                }}
                className="border rounded p-1"
                aria-label="Filtro per scuola"
              >
                <option value="">Tutte le scuole</option>
                {uniqueSchools.map((scuola) => (
                  <option key={scuola} value={scuola}>
                    {scuola}
                  </option>
                ))}
              </select>

              <select
                value={filterProductType}
                onChange={(e) => {
                  setFilterProductType(e.target.value)
                  setCurrentPage(1)
                }}
                className="border rounded p-1"
                aria-label="Filtro per tipo prodotto"
              >
                <option value="">Tutti i prodotti</option>
                {uniqueProductNames.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as OrdineMerchCompleto["stato"] | "")
                  setCurrentPage(1)
                }}
                className="border rounded p-1"
                aria-label="Filtro per stato ordine"
              >
                <option value="">Tutti gli stati</option>
                <option value="in_attesa">In Attesa</option>
                <option value="spedito">Spedito</option>
                <option value="ritirato">Consegnato</option>
              </select>
            </div>

            {/* Bulk action buttons */}
            <div className="flex space-x-2 mt-2">
              <Button onClick={selectAll} disabled={loading}>
                Seleziona Tutti
              </Button>
              <Button onClick={deselectAll} disabled={loading}>
                Deseleziona Tutti
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkChangeStatus("spedito")}
                disabled={loading || selectedOrders.size === 0}
              >
                Segna come Spedito
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkChangeStatus("ritirato")}
                disabled={loading || selectedOrders.size === 0}
              >
                Segna come Consegnato
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                      onChange={(e) =>
                        e.target.checked
                          ? setSelectedOrders(new Set(paginatedOrders.map((o) => o.id)))
                          : setSelectedOrders(new Set())
                      }
                      aria-label="Seleziona tutti gli ordini"
                    />
                  </TableHead>
                  <TableHead>ID Ordine</TableHead>
                  <TableHead>Scuola</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Prodotto</TableHead>
                  <TableHead>Colore</TableHead>
                  <TableHead>Quantità</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const customerName = order.utente ? `${order.utente.nome}` : "Anonimo";
                  const customerEmail = order.utente?.email ?? "-";
                  const productName = order.prodotto?.nome ?? "Prodotto sconosciuto";
                  const price = order.variante?.prezzo ?? order.prodotto?.prezzo ?? 0;
                  const total = price * order.quantita;
                  const isSelected = selectedOrders.has(order.id);

                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors"
                      data-selected={isSelected}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          aria-label={`Seleziona ordine ${order.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.id.length > 10
                          ? `${order.id.slice(0, 6)}...${order.id.slice(-4)}`
                          : order.id}
                      </TableCell>

                      <TableCell className="font-medium">
                        {order.utente?.scuola?.nome
                          ? abbreviate(order.utente.scuola.nome, 15)
                          : ""}
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium">{customerName}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[150px]">{customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{productName}</TableCell>
                      <TableCell className="font-medium">
                        {order.prodotto?.colore?.nome
                          ? order.prodotto.colore.nome.charAt(0).toUpperCase() + order.prodotto.colore.nome.slice(1)
                          : "N/A"}
                      </TableCell>


                      <TableCell>{order.quantita}x</TableCell>
                      <TableCell>€{total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.stato)}</TableCell>
                      <TableCell>{new Date(order.timestamp).toLocaleDateString("it-IT")}</TableCell>

                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Visualizza Dettagli"
                            onClick={() => {
                              setSelectedOrderDetails(order);
                              setOpenDetails(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {order.stato === "in_attesa" && (
                            <Button
                              variant="outline"
                              size="icon"
                              title="Segna come Spedito"
                              onClick={() => updateOrdersStatus([order.id], "spedito")}
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          )}

                          {order.stato === "spedito" && (
                            <Button
                              variant="outline"
                              size="icon"
                              title="Segna come Consegnato"
                              onClick={() => updateOrdersStatus([order.id], "ritirato")}
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="icon"
                            title="Elimina Ordine"
                            onClick={() => {
                              setDeleteId(order.id);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden">
            <MobileOrdersList
              orders={filteredOrders} // Pass ALL filtered orders, MobileOrdersList will paginate them
              onViewDetails={handleMobileViewDetails}
              onDeleteOrder={handleDeleteOrder} // Pass the main handleDeleteOrder
              onUpdateStatus={updateOrdersStatus}
              // Pass filter states and options to MobileOrdersList
              filterSchool={filterSchool}
              setFilterSchool={setFilterSchool}
              filterProductType={filterProductType}
              setFilterProductType={setFilterProductType}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              uniqueSchools={uniqueSchools}
              uniqueProductNames={uniqueProductNames}
            />
          </div>

          {/* DESKTOP PAGINATION */}
          <div className="hidden md:flex justify-center items-center space-x-4 mt-4">
            <Button
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Pagina precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {[...Array(totalPages).keys()].map((pageIndex) => {
              const pageNum = pageIndex + 1;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  onClick={() => goToPage(pageNum)}
                  aria-current={pageNum === currentPage ? "page" : undefined}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              aria-label="Pagina successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Order Details Dialog (shared by both desktop and mobile) */}
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dettagli Ordine</DialogTitle>
          </DialogHeader>

          {selectedOrderDetails && (
            <div className="space-y-3 text-sm">
              <p><strong>ID:</strong> {selectedOrderDetails.id}</p>
              <p><strong>Utente:</strong> {selectedOrderDetails.utente?.nome} ({selectedOrderDetails.utente?.email})</p>
              <p><strong>Scuola:</strong> {selectedOrderDetails.utente?.scuola?.nome ?? "N/A"}</p>
              <p><strong>Prodotto:</strong> {selectedOrderDetails.prodotto?.nome ?? "N/A"}</p>
              <p><strong>Colore:</strong> {selectedOrderDetails.prodotto?.colore?.nome ?? "N/A"}</p>
              <p><strong>Quantità:</strong> {selectedOrderDetails.quantita}</p>
              <p><strong>Prezzo:</strong> €{selectedOrderDetails.prodotto?.prezzo?.toFixed(2) ?? 0}</p>
              <p><strong>Totale:</strong> €{ ((selectedOrderDetails.prodotto?.prezzo ?? 0) * (selectedOrderDetails.quantita ?? 1)).toFixed(2) }</p>
              <p><strong>Stato:</strong> {selectedOrderDetails.stato}</p>
              <p><strong>Data:</strong> {new Date(selectedOrderDetails.timestamp).toLocaleString("it-IT")}</p>

              {selectedOrderDetails.prodotto?.immagine_url && (
                <Image
                  src={selectedOrderDetails.prodotto.immagine_url}
                  alt={selectedOrderDetails.prodotto.nome ?? ""}
                  className="w-32 h-32 object-cover rounded-md mt-2"
                  width={128}
                  height={128}
                  loading="lazy"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog (shared by both desktop and mobile) */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo ordine? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenDeleteDialog(false)}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#f02e2e] text-white"
              onClick={async () => {
                if (deleteId) {
                  await handleDeleteOrder(deleteId);
                }
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}