"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Package, Truck } from "lucide-react"
import type { OrdineMerchCompleto } from "@/types"
import { MobileOrdersList } from "./mobile-orders-list"

interface OrdersTableProps {
  orders: OrdineMerchCompleto[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
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
                <TableHead>Prodotto</TableHead>
                <TableHead>Quantità</TableHead>
                <TableHead>Totale</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const customerName = order.utente
                  ? `${order.utente.nome}`
                  : "Anonimo"
                const customerEmail = order.utente?.email ?? "-"
                const productName = order.prodotto?.nome ?? "Prodotto sconosciuto"
                const price = order.variante?.prezzo ?? order.prodotto?.prezzo ?? 0
                const total = price * order.quantita

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customerName}</div>
                        <div className="text-sm text-muted-foreground">{customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{productName}</TableCell>
                    <TableCell>{order.quantita}x</TableCell>
                    <TableCell>€{total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.stato)}</TableCell>
                    <TableCell>
                      {new Date(order.timestamp).toLocaleDateString("it-IT")}
                    </TableCell>
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
                )
              })}
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
