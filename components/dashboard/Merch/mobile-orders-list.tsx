"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Package, Truck, Mail } from "lucide-react"
import type { OrdineMerchCompleto } from "@/types"

interface MobileOrdersListProps {
  orders: OrdineMerchCompleto[]
}

export function MobileOrdersList({ orders }: MobileOrdersListProps) {
  const getStatusBadge = (status: OrdineMerchCompleto["stato"]) => {
    const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "destructive" }> = {
      in_attesa: { label: "In Attesa", variant: "secondary" },
      in_lavorazione: { label: "In Lavorazione", variant: "default" },
      spedito: { label: "Spedito", variant: "outline" },
      consegnato: { label: "Consegnato", variant: "default" },
      annullato: { label: "Annullato", variant: "destructive" },
    }

    const config = statusConfig[status] ?? { label: status, variant: "secondary" }
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

return (
  <div className="space-y-3">
    {orders.map((order) => {
      const prezzoUnitario = order.variante?.prezzo ?? order.prodotto?.prezzo ?? 0
      const total = prezzoUnitario * order.quantita

      return (
        <Card key={order.id} className="p-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-sm">{order.id}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(order.timestamp).toLocaleDateString("it-IT")}
                </div>
              </div>
              {getStatusBadge(order.stato)}
            </div>

            {/* Dati utente */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm">
                  {order.utente
                    ? `${order.utente.nome} ${order.utente.cognome}`
                    : "Utente sconosciuto"}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {order.utente?.email ?? "Email non disponibile"}
              </div>
            </div>

            {/* Prodotti */}
            <div className="space-y-1 mb-3">
              <div className="text-xs font-medium text-muted-foreground">Prodotti:</div>
              <div className="text-xs">
                {order.quantita}x {order.prodotto?.nome ?? "Prodotto sconosciuto"} - €
                {prezzoUnitario.toFixed(2)}
              </div>
            </div>

            {/* Totale e azioni */}
            <div className="flex items-center justify-between">
              <div className="font-bold">€{total.toFixed(2)}</div>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  <Package className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  <Truck className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    })}
  </div>
)

}
