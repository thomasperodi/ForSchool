"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Package, ShoppingCart, Euro, School } from "lucide-react"
import type { DashboardStats } from "../types/database"

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Fatturato Totale",
      value: `€${stats.totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
      change: "+12.5%",
      changeType: "positive" as const,
      icon: Euro,
    },
    {
      title: "Prodotti Totali",
      value: stats.totalProducts.toString(),
      change: "+8.2%",
      changeType: "positive" as const,
      icon: Package,
    },
    {
      title: "Scuole Partner",
      value: stats.totalSchools.toString(),
      change: "+3",
      changeType: "positive" as const,
      icon: School,
    },
    {
      title: "Stock Basso",
      value: stats.lowStockProducts.toString(),
      change: "-2",
      changeType: "negative" as const,
      icon: ShoppingCart,
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">{card.title}</CardTitle>
            <card.icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg md:text-2xl font-bold leading-tight">{card.value}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {card.changeType === "positive" ? (
                <TrendingUp className="mr-1 h-2 w-2 md:h-3 md:w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-2 w-2 md:h-3 md:w-3 text-red-500" />
              )}
              <span className={card.changeType === "positive" ? "text-green-500" : "text-red-500"}>{card.change}</span>
              <span className="ml-1 hidden sm:inline">dal mese scorso</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
