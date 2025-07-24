"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Package, Truck, Mail } from "lucide-react"
import type { Order } from "../types"

interface MobileOrdersListProps {
  orders: Order[]
}

export function MobileOrdersList({ orders }: MobileOrdersListProps) {
  const getStatusBadge = (status: Order["status"]) => {
    const statusConfig = {
      pending: { label: "In Attesa", variant: "secondary" as const },
      processing: { label: "In Lavorazione", variant: "default" as const },
      shipped: { label: "Spedito", variant: "outline" as const },
      delivered: { label: "Consegnato", variant: "default" as const },
      cancelled: { label: "Annullato", variant: "destructive" as const },
    }

    const config = statusConfig[status]
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id} className="p-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-sm">{order.id}</div>
                <div className="text-xs text-muted-foreground">{order.createdAt.toLocaleDateString("it-IT")}</div>
              </div>
              {getStatusBadge(order.status)}
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm">{order.customerName}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {order.customerEmail}
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <div className="text-xs font-medium text-muted-foreground">Prodotti:</div>
              {order.items.map((item, index) => (
                <div key={index} className="text-xs">
                  {item.quantity}x {item.productName} - €{item.price.toFixed(2)}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="font-bold">€{order.total.toFixed(2)}</div>
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
      ))}
    </div>
  )
}
