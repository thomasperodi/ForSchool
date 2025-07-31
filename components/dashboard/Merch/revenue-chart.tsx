// components/dashboard/Merch/RevenueChart.tsx (updated)
"use client";

// Remove useEffect and useState imports since data fetching will happen in parent
// import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/types/database"; // Assuming DashboardStats is correctly typed

// Define the props interface for RevenueChart
interface RevenueChartProps {
  stats: DashboardStats | null; // Now expects stats as a prop
}

export function RevenueChart({ stats }: RevenueChartProps) {
  // Remove loading and error states as they will be managed by the parent
  // const [stats, setStats] = useState<DashboardStats | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  const months = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ]; // All 12 months

  // Remove the useEffect hook that was fetching data
  // useEffect(() => {
  //   const fetchDashboardStats = async () => { /* ... */ };
  //   fetchDashboardStats();
  // }, []);

  // Modify conditional renders to check for the passed 'stats' prop
  if (!stats) { // If stats is null (e.g., still loading in parent or an error occurred there)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Andamento Fatturato Mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 md:h-80 flex items-center justify-center">
            <p>Caricamento dati fatturato...</p> {/* Message when data is not yet available */}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Your existing logic for displaying "Nessun dato sul fatturato disponibile."
  // This check is still useful if `stats` is provided but `monthlyRevenue` is empty.
  if (stats.monthlyRevenue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Andamento Fatturato Mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 md:h-80 flex items-center justify-center">
            <p>Nessun dato sul fatturato disponibile.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure monthlyRevenue has 12 entries, padding with 0 if necessary
  const currentMonthlyRevenue = Array(12)
    .fill(0)
    .map((_, i) => stats.monthlyRevenue[i] || 0);

  // Calculate the maximum revenue for scaling the bars
  const maxRevenue = Math.max(...currentMonthlyRevenue);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento Fatturato Mensile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-60 md:h-80 flex items-end justify-between space-x-1 md:space-x-2">
          {currentMonthlyRevenue.map((revenue, index) => (
            <div
              key={index}
              className="flex flex-col items-center space-y-2 flex-1"
            >
              <div
                className="bg-primary rounded-t-sm w-full transition-all hover:bg-primary/80"
                style={{
                  height: `${
                    (revenue / (maxRevenue === 0 ? 1 : maxRevenue)) * 250
                  }px`,
                  minHeight: "2px", // Minimum height for bars with 0 revenue
                }}
              />
              <div className="text-xs text-muted-foreground">
                {months[index]}
              </div>
              <div className="text-xs font-medium">
                €{(revenue / 1000).toFixed(1)}k
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}