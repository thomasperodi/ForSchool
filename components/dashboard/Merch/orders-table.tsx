"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Package, Truck } from "lucide-react"
import type { Order } from "../types"
import { MobileOrdersList } from "./mobile-orders-list"

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const getStatusBadge = (status: Order["status"]) => {
    const statusConfig = {
      pending: { label: "In Attesa", variant: "secondary" as const },
      processing: { label: "In Lavorazione", variant: "default" as const },
      shipped: { label: "Spedito", variant: "outline" as const },
      delivered: { label: "Consegnato", variant: "default" as const },
      cancelled: { label: "Annullato", variant: "destructive" as const },
    }

    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordini Recenti</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Vista Desktop */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Ordine</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Prodotti</TableHead>
                <TableHead>Totale</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {order.items.map((item, index) => (
                        <div key={index}>
                          {item.quantity}x {item.productName}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>€{order.total.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{order.createdAt.toLocaleDateString("it-IT")}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Truck className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Vista Mobile */}
        <div className="md:hidden">
          <MobileOrdersList orders={orders} />
        </div>
      </CardContent>
    </Card>
  )
}
