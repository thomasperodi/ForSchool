"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

type MerchOrder = {
  id: string
  cliente: string
  email: string
  prodotti: string
  totale: number
  statoSpedizione: "in attesa" | "spedito" | "consegnato"
  dataOrdine: string
}

type ServiceTransaction = {
  id: string
  tipo: "ripetizione" | "abbonamento"
  utente: string
  email: string
  importo: number
  statoPagamento: "successo" | "fallito" | "rimborsato"
  data: string
}

export default function TransactionsManager() {
  const [merchOrders, setMerchOrders] = useState<MerchOrder[]>([])
  const [serviceTransactions, setServiceTransactions] = useState<ServiceTransaction[]>([])
  const [loadingMerch, setLoadingMerch] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    let ignore = false
    setLoadingMerch(true)
    fetch('/api/admin/merch/orders', { cache: 'no-store' }).then(r => r.json()).then((json: MerchOrder[]) => {
      if (!ignore) setMerchOrders(json)
    }).finally(() => {
      if (!ignore) setLoadingMerch(false)
    })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false
    setLoadingServices(true)
    fetch('/api/admin/transactions/services', { cache: 'no-store' }).then(r => r.json()).then((json: ServiceTransaction[]) => {
      if (!ignore) setServiceTransactions(json)
    }).finally(() => {
      if (!ignore) setLoadingServices(false)
    })
    return () => { ignore = true }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transazioni & Pagamenti</CardTitle>
        <CardDescription>Monitora tutti gli ordini, abbonamenti e pagamenti</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="merch">
          <TabsList>
            <TabsTrigger value="merch">Ordini Merch</TabsTrigger>
            <TabsTrigger value="services">Transazioni Servizi</TabsTrigger>
          </TabsList>

          <TabsContent value="merch" className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Ordini di Merchandising</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordine ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Prodotti</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMerch ? (
                    <TableRow><TableCell colSpan={6}>Caricamento…</TableCell></TableRow>
                  ) : merchOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={6}>Nessun ordine</TableCell></TableRow>
                  ) : (
                    merchOrders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id}</TableCell>
                        <TableCell>{o.cliente} ({o.email})</TableCell>
                        <TableCell>{o.prodotti}</TableCell>
                        <TableCell>€ {o.totale.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={o.statoSpedizione === "consegnato" ? "default" : o.statoSpedizione === "spedito" ? "secondary" : "outline"}>
                            {o.statoSpedizione}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{o.dataOrdine}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Transazioni per Servizi</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transazione ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Utente</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingServices ? (
                    <TableRow><TableCell colSpan={6}>Caricamento…</TableCell></TableRow>
                  ) : serviceTransactions.length === 0 ? (
                    <TableRow><TableCell colSpan={6}>Nessuna transazione</TableCell></TableRow>
                  ) : (
                    serviceTransactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.id}</TableCell>
                        <TableCell><Badge variant="secondary">{t.tipo}</Badge></TableCell>
                        <TableCell>{t.utente} ({t.email})</TableCell>
                        <TableCell>€ {t.importo.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={t.statoPagamento === "successo" ? "default" : "destructive"}>
                            {t.statoPagamento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{t.data}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}