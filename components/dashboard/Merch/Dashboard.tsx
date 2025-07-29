 "use client"
import { use, useEffect, useState } from "react"
import { StatsCards } from "@/components/dashboard/Merch/stats-cards"
import { AddProductForm } from "@/components/dashboard/Merch/add-product-form"
import { OrdersTable } from "@/components/dashboard/Merch/orders-table"
import { ProductsTable } from "@/components/dashboard/Merch/products-table"
import { RevenueChart } from "@/components/dashboard/Merch/revenue-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Filter, MenuIcon } from "lucide-react"
import { mockOrders, mockStats } from "@/lib/mock-data"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import type { ProdottoWithScuola } from "@/types/database"
import { getOrdiniMerch, getProdotti } from "@/lib/database-functions"
import StripePrompt from "./StripePrompt"
import { supabase } from "@/lib/supabaseClient"
import { User } from "@supabase/supabase-js"
import { getUtenteCompleto } from "@/lib/api"
import { OrderItem, OrdineMerchCompleto } from "@/types"

type Scuola = {
  id: string | null
  nome: string | null
}

type UtenteConScuola = {
  scuola: Scuola | null
  scuola_nome: string | null
  id: string
  nome: string
  email: string
  classe: string | null
  ruolo: 'studente' | 'professore' | 'admin' | 'lista' | 'merch'
  notifiche: boolean | null
  tema: string | null
  stripe_account_id?: string | null

}



export default function MerchAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [prodotti, setProdotti] = useState<ProdottoWithScuola[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UtenteConScuola | null>(null)
const [ordini, setOrdini] = useState<OrdineMerchCompleto[]>([]) // Tipizza se hai il tipo Ordine
  




  // Funzione chiamata quando un prodotto è stato eliminato
  
async function loadProdotti() {
  setLoading(true);
  const prodottiRaw = await getProdotti();

const prodotti: ProdottoWithScuola[] = prodottiRaw
  .filter(p => p.scuole !== null)
  .map(p => ({
    ...p,
    colore: typeof p.colore === "object" && p.colore !== null ? p.colore.nome : p.colore,
    scuole: {
      id: p.scuole?.id ?? "",
      nome: p.scuole?.nome ?? "",
      citta: p.scuole?.citta ?? "",
      dominio: p.scuole?.dominio ?? null,
    }
  }));



setProdotti(prodotti);
  setLoading(false);
}

async function loadOrdini() {
    try {
      const ordiniRaw = await getOrdiniMerch()
      setOrdini(ordiniRaw)
    } catch (err) {
      console.error("Errore caricamento ordini:", err)
    }
  }

  const handleProductDeleted = (id: string) => {
    setProdotti((prev) => prev.filter((p) => p.id !== id))
  }
useEffect(() => {
    loadOrdini()
    loadProdotti()
  }, [])

  const handleProductAdded = async () => {
    await loadProdotti() // ricarica la lista
  }
  const handleProductUpdate = (updatedProduct: ProdottoWithScuola) => {
    console.log("Prodotto aggiornato:", updatedProduct)
    setProdotti((prevProdotti) =>
      prevProdotti.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    )
  }

  const [hasStripeAccount, setHasStripeAccount] = useState(false)

 useEffect(() => {
  async function checkUser() {
    setLoading(true)
    const userData = await getUtenteCompleto()  // deve restituire Oggetto Utente compatibile
    if (!userData) {
      setUser(null)
      setLoading(false)
      return
    }
    setUser(userData)

    // Check Stripe
    
    setLoading(false)
  }
  checkUser()
}, [])

  
if(!user?.stripe_account_id)
   return <StripePrompt />

  return (
    <>
    <header className=" w-full h-14 md:h-16 shrink-0 items-center gap-2 border-b px-2 md:px-4">
          
          <div className="flex flex-1 items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-lg font-semibold truncate">Dashboard Merchandising</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Gestisci i tuoi prodotti, ordini e monitora le performance
              </p>
            </div>
            
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-3 md:gap-4 p-2 md:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="items-center flex justify-center  mb-2">
  {/* Dropdown mobile */}
  <div className="md:hidden ">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-100" size="sm">
          <MenuIcon></MenuIcon>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-100">
        <DropdownMenuItem  onClick={() => setActiveTab("overview")}>Panoramica</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setActiveTab("products")}>Prodotti</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setActiveTab("orders")}>Ordini</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setActiveTab("analytics")}>Analytics</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setActiveTab("revenue")}>Guadagni</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  {/* Tabs desktop */}
  <TabsList className="hidden md:grid w-full grid-cols-5 h-9 md:h-10">
    <TabsTrigger value="overview" className="text-xs md:text-sm">
      Panoramica
    </TabsTrigger>
    <TabsTrigger value="products" className="text-xs md:text-sm">
      Prodotti
    </TabsTrigger>
    <TabsTrigger value="orders" className="text-xs md:text-sm">
      Ordini
    </TabsTrigger>
    <TabsTrigger value="analytics" className="text-xs md:text-sm">
      Analytics
    </TabsTrigger>
    <TabsTrigger value="revenue" className="text-xs md:text-sm">
      Guadagni
    </TabsTrigger>
  </TabsList>
</div>


            <TabsContent value="overview" className="space-y-4">
              <StatsCards stats={mockStats} />
              <div className="grid gap-4 md:grid-cols-2">
                <RevenueChart stats={mockStats} />
                <Card>
                  <CardHeader>
                    <CardTitle>Prodotti Top</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockStats.topProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <span className="font-medium">{product.nome}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{product.vendite} vendite</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <OrdersTable orders={ordini.slice(0, 5)} />
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">Gestione Prodotti</h2>
          
        </div>
        <AddProductForm onProductAdded={handleProductAdded} />
        {/* Passa la prop onProductDeleted */}
        <ProductsTable
          products={prodotti}
          onProductDeleted={handleProductDeleted}
          onProductUpdated={handleProductUpdate} // This is correctly passed
        />
      </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gestione Ordini</h2>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtra
                </Button>
              </div>
              <OrdersTable orders={ordini} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <h2 className="text-2xl font-bold">Analytics</h2>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <RevenueChart stats={mockStats} />
                <Card>
                  <CardHeader>
                    <CardTitle>Metriche Chiave</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Tasso di Conversione</span>
                        <span className="font-medium">3.2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valore Medio Ordine</span>
                        <span className="font-medium">€45.12</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Margine Medio</span>
                        <span className="font-medium">67.3%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clienti Ricorrenti</span>
                        <span className="font-medium">28%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <h2 className="text-2xl font-bold">Analisi Guadagni</h2>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Fatturato Questo Mese</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">€15,420.50</div>
                    <p className="text-sm text-muted-foreground">+12.5% dal mese scorso</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Costi Totali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">€5,047.20</div>
                    <p className="text-sm text-muted-foreground">32.7% del fatturato</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Profitto Netto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">€10,373.30</div>
                    <p className="text-sm text-muted-foreground">67.3% margine</p>
                  </CardContent>
                </Card>
              </div>
              <RevenueChart stats={mockStats} />
            </TabsContent>
          </Tabs>
        </div>
    
    </>
        
  )
}
