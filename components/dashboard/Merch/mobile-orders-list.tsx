// mobile-orders-list.tsx
"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Package, Truck, Mail, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import type { OrdineMerchCompleto } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { deleteOrdineMerch } from "@/lib/database-functions"
import toast from "react-hot-toast"
import Image from "next/image"

interface MobileOrdersListProps {
  orders: OrdineMerchCompleto[]; // Now receives already filtered orders from parent (OrdersTable)
  onViewDetails: (order: OrdineMerchCompleto) => void;
  onDeleteOrder: (orderId: string) => void;
  onUpdateStatus: (orderIds: string[], newStatus: OrdineMerchCompleto["stato"]) => Promise<void>;
  // New props for filters
  filterSchool: string;
  setFilterSchool: (school: string) => void;
  filterProductType: string;
  setFilterProductType: (productType: string) => void;
  filterStatus: OrdineMerchCompleto["stato"] | "";
  setFilterStatus: (status: OrdineMerchCompleto["stato"] | "") => void;
  uniqueSchools: string[];
  uniqueProductNames: string[];
}

const MOBILE_ITEMS_PER_PAGE = 3; // Defined for mobile pagination

export function MobileOrdersList({
  orders,
  onViewDetails,
  onDeleteOrder,
  onUpdateStatus,
  filterSchool,
  setFilterSchool,
  filterProductType,
  setFilterProductType,
  filterStatus,
  setFilterStatus,
  uniqueSchools,
  uniqueProductNames,
}: MobileOrdersListProps) {
  const [currentPageMobile, setCurrentPageMobile] = useState(1); // Internal state for mobile pagination

  const [openDetails, setOpenDetails] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrdineMerchCompleto | null>(null)

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const getStatusBadge = (status: OrdineMerchCompleto["stato"]) => {
    const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "destructive" }> = {
      in_attesa: { label: "In Attesa", variant: "secondary" },
      in_lavorazione: { label: "In Lavorazione", variant: "default" },
      spedito: { label: "Spedito", variant: "outline" },
      consegnato: { label: "Consegnato", variant: "default" },
      ritirato: { label: "Consegnato", variant: "default" }, // Ensure 'ritirato' maps correctly
      annullato: { label: "Annullato", variant: "destructive" },
    }

    const config = statusConfig[status] ?? { label: status, variant: "secondary" }
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const totalPagesMobile = Math.ceil(orders.length / MOBILE_ITEMS_PER_PAGE);

  // Slice orders to show on current mobile page
  const paginatedMobileOrders = useMemo(() => {
    const startIdx = (currentPageMobile - 1) * MOBILE_ITEMS_PER_PAGE;
    return orders.slice(startIdx, startIdx + MOBILE_ITEMS_PER_PAGE);
  }, [orders, currentPageMobile]);

  // Change mobile page, avoid out of range pages
  const goToPageMobile = (page: number) => {
    if (page < 1) page = 1;
    else if (page > totalPagesMobile) page = totalPagesMobile;
    setCurrentPageMobile(page);
  };

  async function handleDeleteOrderInternal(id: string) {
    const success = await deleteOrdineMerch(id)

    if (!success) {
      toast.error("Errore durante la cancellazione dell'ordine")
      return
    }

    toast.success("Ordine cancellato con successo")
    onDeleteOrder(id); // Propagate delete to parent

    setOpenDeleteDialog(false)
    setDeleteId(null)
  }

  return (
    <>
      {/* --- MOBILE FILTERS --- */}
      <div className="flex flex-col gap-3 my-4">
        <select
          value={filterSchool}
          onChange={(e) => {
            setFilterSchool(e.target.value)
            setCurrentPageMobile(1) // reset page if filter changes
          }}
          className="border rounded p-2 text-sm"
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
            setCurrentPageMobile(1)
          }}
          className="border rounded p-2 text-sm"
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
            setCurrentPageMobile(1)
          }}
          className="border rounded p-2 text-sm"
          aria-label="Filtro per stato ordine"
        >
          <option value="">Tutti gli stati</option>
          <option value="in_attesa">In Attesa</option>
          <option value="spedito">Spedito</option>
          <option value="ritirato">Consegnato</option>
        </select>
      </div>

      <div className="space-y-3">
        {paginatedMobileOrders.map((order) => {
          const prezzoUnitario = order.variante?.prezzo ?? order.prodotto?.prezzo ?? 0
          const total = prezzoUnitario * order.quantita

          return (
            <Card key={order.id} className="p-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm">
                      {order.id.length > 10 ? `${order.id.slice(0, 6)}...${order.id.slice(-4)}` : order.id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.timestamp).toLocaleDateString("it-IT")}
                    </div>
                  </div>
                  {getStatusBadge(order.stato)}
                </div>

                {/* User Data */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">
                      {order.utente
                        ? `${order.utente.nome}`
                        : "Utente sconosciuto"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {order.utente?.email ?? "Email non disponibile"}
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-1 mb-3">
                  <div className="text-xs font-medium text-muted-foreground">Prodotti:</div>
                  <div className="text-xs">
                    {order.quantita}x {order.prodotto?.nome ?? "Prodotto sconosciuto"} - €
                    {prezzoUnitario.toFixed(2)}
                  </div>
                </div>

                {/* Total and Actions */}
                <div className="flex items-center justify-between">
                  <div className="font-bold">€{total.toFixed(2)}</div>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Visualizza Dettagli"
                      onClick={() => onViewDetails(order)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>

                    {order.stato === "in_attesa" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Segna come Spedito"
                        onClick={() => onUpdateStatus([order.id], "spedito")}
                      >
                        <Package className="h-3 w-3" />
                      </Button>
                    )}

                    {order.stato === "spedito" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Segna come Consegnato"
                        onClick={() => onUpdateStatus([order.id], "ritirato")}
                      >
                        <Truck className="h-3 w-3" />
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Elimina Ordine"
                      onClick={() => {
                        setDeleteId(order.id);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* MOBILE PAGINATION */}
      <div className="flex justify-center items-center space-x-4 mt-4">
        <Button
          variant="outline"
          onClick={() => goToPageMobile(currentPageMobile - 1)}
          disabled={currentPageMobile === 1}
          aria-label="Pagina precedente"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {[...Array(totalPagesMobile).keys()].map((pageIndex) => {
          const pageNum = pageIndex + 1;
          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPageMobile ? "default" : "outline"}
              onClick={() => goToPageMobile(pageNum)}
              aria-current={pageNum === currentPageMobile ? "page" : undefined}
            >
              {pageNum}
            </Button>
          );
        })}

        <Button
          variant="outline"
          onClick={() => goToPageMobile(currentPageMobile + 1)}
          disabled={currentPageMobile === totalPagesMobile || totalPagesMobile === 0}
          aria-label="Pagina successiva"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* AlertDialog for delete confirmation */}
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
                  await handleDeleteOrderInternal(deleteId); // Call internal handler
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