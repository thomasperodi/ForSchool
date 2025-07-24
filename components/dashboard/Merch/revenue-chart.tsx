"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardStats } from "../types"

interface RevenueChartProps {
  stats: DashboardStats
}

export function RevenueChart({ stats }: RevenueChartProps) {
  const maxRevenue = Math.max(...stats.monthlyRevenue)
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento Fatturato Mensile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-60 md:h-80 flex items-end justify-between space-x-1 md:space-x-2">
          {stats.monthlyRevenue.map((revenue, index) => (
            <div key={index} className="flex flex-col items-center space-y-2 flex-1">
              <div
                className="bg-primary rounded-t-sm w-full transition-all hover:bg-primary/80"
                style={{
                  height: `${(revenue / maxRevenue) * 250}px`,
                  minHeight: "20px",
                }}
              />
              <div className="text-xs text-muted-foreground">{months[index]}</div>
              <div className="text-xs font-medium">€{(revenue / 1000).toFixed(1)}k</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
