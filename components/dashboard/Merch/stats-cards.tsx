"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Package, ShoppingCart, Euro, School } from "lucide-react"
import type { DashboardStats } from "@/types/database"

interface StatsCardsProps {
  stats: DashboardStats | null; // Now expects stats as a prop
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Fatturato Totale",
      value: `€${stats?.totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
      
      icon: Euro,
    },
    {
      title: "Prodotti Totali",
      value: stats?.totalProducts.toString(),
      
      icon: Package,
    },
    {
      title: "Scuole Partner",
      value: stats?.totalSchools.toString(),
      
      icon: School,
    },
    
  ]

  return (
    <div className="grid gap-3 grid-cols-3 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">{card.title}</CardTitle>
            <card.icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg md:text-2xl font-bold leading-tight">{card.value}</div>
            
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
