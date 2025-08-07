"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { TrendingUp, TrendingDown, Users, Gift, Calendar, Target } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button'
import { MenuIcon } from 'lucide-react'
import Promotions from './promotions'
import Scanner from './scanner'
import Analytics from './analytics'

// Dati mock per i grafici
const monthlyData = [
  { month: 'Gen', current: 45, previous: 32 },
  { month: 'Feb', current: 52, previous: 41 },
  { month: 'Mar', current: 48, previous: 38 },
  { month: 'Apr', current: 61, previous: 45 },
  { month: 'Mag', current: 55, previous: 49 },
  { month: 'Giu', current: 67, previous: 52 },
]

const ageData = [
  { name: '18-25', value: 30, color: '#8884d8' },
  { name: '26-35', value: 45, color: '#82ca9d' },
  { name: '36-45', value: 25, color: '#ffc658' },
  { name: '46+', value: 15, color: '#ff7c7c' },
]

const activePromotions = [
  { name: 'Sconto Aperitivo', discount: '20%', expires: '2024-01-15', redeemed: 23 },
  { name: 'Menu Pranzo', discount: '15%', expires: '2024-01-20', redeemed: 45 },
  { name: 'Happy Hour', discount: '30%', expires: '2024-01-25', redeemed: 67 },
]

export default function Dashboard() {
   const isMobile = useIsMobile();
   const [activeTab, setActiveTab] = useState("overview");
  const currentMonthRedemptions = 67
  const previousMonthRedemptions = 52
  const growthPercentage = ((currentMonthRedemptions - previousMonthRedemptions) / previousMonthRedemptions * 100).toFixed(1)
  const redemptionRate = 78.5
  const totalCustomers = 156

  return (
    <>
      <div className="space-y-6">
     
        
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Locale</h1>
      <p className="text-muted-foreground">Gestisci Promozioni, Scansiona QR code, Visualizza analytics</p>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="items-center flex justify-center mb-2">
          {/* Dropdown mobile */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <MenuIcon className="mr-2 h-4 w-4" /> {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[calc(100vw-32px)]"> {/* Adjusted width */}
                <DropdownMenuItem onClick={() => setActiveTab("overview")}>Panoramica</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("promozioni")}>Promozioni</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("scanner")}>Scanner</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("analytics")}>Analytics</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tabs desktop */}
          <TabsList className="hidden md:grid w-full grid-cols-5 h-9 md:h-10">
            <TabsTrigger value="overview" className="text-xs md:text-sm">Panoramica</TabsTrigger>
            <TabsTrigger value="promozioni" className="text-xs md:text-sm">Promozioni</TabsTrigger>
            <TabsTrigger value="scanner" className="text-xs md:text-sm">Scanner</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm">Analytics</TabsTrigger>
          </TabsList>
        </div>

        {/* Content for each tab */}
        <TabsContent value="overview">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Riscatti Mese Corrente
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthRedemptions}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`inline-flex items-center ${Number(growthPercentage) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(growthPercentage) > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {growthPercentage}%
              </span>
              {' '}rispetto al mese scorso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasso di Riscatto
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{redemptionRate}%</div>
            <Progress value={redemptionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clienti Totali
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Clienti che hanno usufruito delle promozioni
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Promozioni Attive
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePromotions.length}</div>
            <p className="text-xs text-muted-foreground">
              Promozioni attualmente disponibili
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Riscatti Mensili</CardTitle>
            <CardDescription>
              Confronto tra mese corrente e precedente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="current" fill="#8884d8" name="Mese Corrente" />
                <Bar dataKey="previous" fill="#82ca9d" name="Mese Precedente" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riscatti per Fascia d&apos;Età</CardTitle>
            <CardDescription>
              Distribuzione dei clienti per età
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}


                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Promozioni attive */}
      <Card>
        <CardHeader>
          <CardTitle>Promozioni Attive</CardTitle>
          <CardDescription>
            Le tue promozioni attualmente disponibili
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activePromotions.map((promo, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">{promo.name}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{promo.discount}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Scade il {new Date(promo.expires).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{promo.redeemed}</div>
                  <div className="text-sm text-muted-foreground">riscatti</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </TabsContent>

        <TabsContent value="promozioni">
          {/* Content for the Products page */}
          <Promotions/>
        </TabsContent>

        <TabsContent value="scanner">
          {/* Content for the Orders page */}
          <Scanner/>
        </TabsContent>

        <TabsContent value="analytics">
          {/* Content for the Analytics page */}
          <Analytics/>
        </TabsContent>
        
        

      </Tabs>
      

      
    </div>


</>
      
    
  )
}
