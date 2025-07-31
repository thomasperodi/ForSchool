"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/types/database";

interface RevenueChartProps {
  stats: DashboardStats | null;
}

export function RevenueChart({ stats }: RevenueChartProps) {
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  // Stato di caricamento
  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Andamento Fatturato Mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 md:h-80 flex items-center justify-center">
            <p>Caricamento dati fatturato...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Protezione: fallback a [] se null
  const monthlyRevenue = stats.monthlyRevenue || [];
  const currentMonthlyRevenue = Array(12)
    .fill(0)
    .map((_, i) => monthlyRevenue[i] || 0);

  const maxRevenue = Math.max(...currentMonthlyRevenue);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento Fatturato Mensile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-60 md:h-80 overflow-x-auto scrollbar-thin">
          <div className="flex items-end justify-between space-x-2 min-w-[600px] md:min-w-0 w-full px-1">
            {currentMonthlyRevenue.map((revenue, index) => (
              <div
                key={index}
                className="flex flex-col items-center space-y-1 flex-1 min-w-[30px]"
              >
                <div
                  className="bg-primary rounded-t-sm w-full transition-all hover:bg-primary/80"
                  style={{
                    height: `${
                      (revenue / (maxRevenue === 0 ? 1 : maxRevenue)) * 200
                    }px`,
                    minHeight: "3px", // Mostra comunque una barra minima
                  }}
                />
                <div className="text-[10px] md:text-xs text-muted-foreground">
                  {months[index]}
                </div>
                <div className="text-[10px] md:text-xs font-medium">
                  €{(revenue / 1000).toFixed(1)}k
                </div>
              </div>
            ))}
          </div>
        </div>

        {maxRevenue === 0 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Nessun fatturato registrato finora.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
