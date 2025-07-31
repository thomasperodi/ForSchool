"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Euro, School } from "lucide-react";
import type { DashboardStats } from "@/types/database";

interface StatsCardsProps {
  stats: DashboardStats | null; 
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Se stats è null, uso un fallback con valori a 0
  const safeStats = stats ?? {
    totalRevenue: 0,
    totalProducts: 0,
    totalSchools: 0,
  };

  const cards = [
    {
      title: "Fatturato Totale",
      value: `€${safeStats.totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
      icon: Euro,
    },
    {
      title: "Prodotti Totali",
      value: safeStats.totalProducts.toString(),
      icon: Package,
    },
    {
      title: "Scuole Partner",
      value: safeStats.totalSchools.toString(),
      icon: School,
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-3 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">
              {card.title}
            </CardTitle>
            <card.icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg md:text-2xl font-bold leading-tight">
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
