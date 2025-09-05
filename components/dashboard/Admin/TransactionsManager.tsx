"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
  // 📦 Merch
  const [merchOrders, setMerchOrders] = useState<MerchOrder[]>([])
  const [loadingMerch, setLoadingMerch] = useState(true)
  const [merchPage, setMerchPage] = useState(1)
  const [merchLimit] = useState(10)
  const [merchTotal, setMerchTotal] = useState(0)

  // 🔧 Services
  const [serviceTransactions, setServiceTransactions] = useState<ServiceTransaction[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [servicesPage, setServicesPage] = useState(1)
  const [servicesLimit] = useState(10)
  const [servicesTotal, setServicesTotal] = useState(0)

  // --- FETCH MERCH ORDERS ---
  const fetchMerchOrders = async (page: number) => {
    setLoadingMerch(true)
    try {
      const res = await fetch(`/api/admin/merch/orders?page=${page}&limit=${merchLimit}`, { cache: 'no-store' })
      const json = await res.json()
      setMerchOrders(json.orders || [])
      setMerchTotal(json.totalCount || 0)
    } catch (err) {
      console.error("Errore caricamento ordini merch", err)
    } finally {
      setLoadingMerch(false)
    }
  }

  // --- FETCH SERVICE TRANSACTIONS ---
  const fetchServiceTransactions = async (page: number) => {
    setLoadingServices(true)
    try {
      const res = await fetch(`/api/admin/transactions/services?page=${page}&limit=${servicesLimit}`, { cache: 'no-store' })
      const json = await res.json()
      setServiceTransactions(json.transactions || [])
      setServicesTotal(json.totalCount || 0)
    } catch (err) {
      console.error("Errore caricamento transazioni servizi", err)
    } finally {
      setLoadingServices(false)
    }
  }

  useEffect(() => { fetchMerchOrders(merchPage) }, [merchPage])
  useEffect(() => { fetchServiceTransactions(servicesPage) }, [servicesPage])

  const merchTotalPages = Math.ceil(merchTotal / merchLimit)
  const servicesTotalPages = Math.ceil(servicesTotal / servicesLimit)

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

          {/* ORDINI MERCH */}
          <TabsContent value="merch" className="mt-4">
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
                  ) : merchOrders.map(o => (
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginazione Merch */}
            <div className="flex justify-between mt-4">
              <Button disabled={merchPage <= 1} onClick={() => setMerchPage(prev => prev - 1)}>Precedente</Button>
              <span>Pagina {merchPage} di {merchTotalPages}</span>
              <Button disabled={merchPage >= merchTotalPages} onClick={() => setMerchPage(prev => prev + 1)}>Successiva</Button>
            </div>
          </TabsContent>

          {/* TRANSIZIONI SERVIZI */}
          <TabsContent value="services" className="mt-4">
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
                  ) : serviceTransactions.map(t => (
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginazione Servizi */}
            <div className="flex justify-between mt-4">
              <Button disabled={servicesPage <= 1} onClick={() => setServicesPage(prev => prev - 1)}>Precedente</Button>
              <span>Pagina {servicesPage} di {servicesTotalPages}</span>
              <Button disabled={servicesPage >= servicesTotalPages} onClick={() => setServicesPage(prev => prev + 1)}>Successiva</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
