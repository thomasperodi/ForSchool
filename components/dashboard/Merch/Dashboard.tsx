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
import { AlertTriangle, CreditCard, DollarSign, Filter, MenuIcon, Package, School, Shirt } from "lucide-react"
import { mockOrders } from "@/lib/mock-data"
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
import {  OrderItem, OrdineMerchCompleto } from "@/types"
import type { DashboardStats } from "@/types/database"
import { RevenueAnalysis } from "./RevenueAnalysis"
import { RevenueStats } from "@/types";
import { RevenueStatsDetailed } from "@/types"; // Assuming this is the correct type for detailed revenue stats

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

  const [user, setUser] = useState<UtenteConScuola | null>(null)
  const [ordini, setOrdini] = useState<OrdineMerchCompleto[]>([]) // Tipizza se hai il tipo Ordine
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStatsDetailed| null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



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
      console.log("Ordini caricati:", ordiniRaw)
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

 
 useEffect(() => {
  const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard-stats"); // Replace with your actual API endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: DashboardStats = await response.json();
        setDashboardStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError("Impossibile caricare i dati della dashboard.");
      } finally {
        setLoading(false);
      }
    };
    const fetchRevenueStats = async () => {
  try {
    setLoading(true);

    // Get current date
    const currentDate = new Date();
    // Get the current year (e.g., 2025)
    const currentYear = currentDate.getFullYear();
    // Get the current month (0-indexed, so add 1 for 1-indexed month, e.g., July is 6, so we want 7)
    const currentMonth = currentDate.getMonth() + 1;

    console.log(`Fetching revenue stats for year: ${currentYear}, month: ${currentMonth}`);

    // Construct the API endpoint with dynamic year and month
    const response = await fetch(`/api/revenue-stats?year=${currentYear}&month=${currentMonth}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: RevenueStatsDetailed = await response.json();
    console.log("Revenue stats fetched:", data);
    setRevenueStats(data);
  } catch (err) {
    console.error("Failed to fetch revenue stats:", err);
    setError("Impossibile caricare i dati dei guadagni.");
  } finally {
    setLoading(false);
  }
};
    fetchRevenueStats();
    fetchStats();
    loadOrdini();
    loadProdotti();
  checkUser()
}, [])

  
if(!user?.stripe_account_id)
   return <StripePrompt />

if(!dashboardStats || !revenueStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caricamento Dashboard...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 md:h-80 flex items-center justify-center">
            <p>Caricamento dati della dashboard...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  

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
  <StatsCards stats={dashboardStats} />
  <div className="grid gap-4 md:grid-cols-2">
    {/* RevenueChart - Added overflow-x-auto for horizontal scrolling on small screens */}
    <div className="overflow-x-auto">
      <RevenueChart stats={dashboardStats} />
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Prodotti Top</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Top Products - Added overflow-x-auto for horizontal scrolling if content overflows */}
        <div className="space-y-4 overflow-x-auto">
          {dashboardStats?.topProducts.map((product, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <span className="font-medium">{product.name}</span>{" "}
                {/* usa "name" */}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.sales} vendite {/* usa "sales" */}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
  {/* OrdersTable - Ensure it's also responsive, potentially needing its own overflow if it's wide */}
  <div className="overflow-x-auto">
    <OrdersTable orders={ordini.slice(0, 5)} />
  </div>
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
              </div>
              <OrdersTable orders={ordini} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
      <h2 className="text-2xl font-bold">Analytics</h2>

      {/* Summary Statistics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fatturato Totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{dashboardStats?.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Fatturato complessivo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordini Totali</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Numero totale di ordini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordini in Sospeso</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Ordini in attesa di elaborazione</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prodotti Totali</CardTitle>
            <Shirt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Articoli a catalogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scuole Partner</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.totalSchools}</div>
            <p className="text-xs text-muted-foreground">Istituti convenzionati</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prodotti Sotto Scorta</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {dashboardStats?.lowStockProducts}
            </div>
            <p className="text-xs text-muted-foreground">Articoli da riordinare</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart and Top/Schools */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <RevenueChart stats={dashboardStats} />


        <div className="grid gap-4 grid-cols-1">
  {/* Top Products Card */}
  <Card>
    <CardHeader>
      <CardTitle>Prodotti Più Venduti</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Check if topProducts exists AND has length > 0 */}
      {dashboardStats.topProducts?.length > 0 ? (
        <ul className="space-y-2">
          {/* Apply optional chaining before .map() again, ensuring topProducts is valid */}
          {dashboardStats?.topProducts.map((product, index) => (
            <li key={index} className="flex justify-between items-center">
              <span>{product.name}</span>
              <span className="font-medium">{product.sales} venduti</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nessun prodotto più venduto disponibile.</p>
      )}
    </CardContent>
  </Card>

  {/* Top Schools Card */}
  <Card>
    <CardHeader>
      <CardTitle>Scuole Top per Fatturato</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Check if topSchools exists AND has length > 0 */}
      {dashboardStats.topSchools?.length > 0 ? (
        <ul className="space-y-2">
          {/* Apply optional chaining before .map() again, ensuring topSchools is valid */}
          {dashboardStats?.topSchools.map((school, index) => (
            <li key={index} className="flex justify-between items-center">
              <span>{school.nome}</span>
              <span className="font-medium">€{school.fatturato.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nessuna scuola top disponibile.</p>
      )}
    </CardContent>
  </Card>
</div>
      </div>
    </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <RevenueAnalysis stats={revenueStats} />
              {/* <h2 className="text-2xl font-bold">Analisi Guadagni</h2>
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
              </div> */}
              {/* <RevenueChart stats={dashboardStats} /> */}
            </TabsContent>
          </Tabs>
        </div>
    
    </>
        
  )
}
