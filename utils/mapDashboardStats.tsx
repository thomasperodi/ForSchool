import type { DashboardStatsDB } from "@/types/database"
import type { DashboardStats } from "@/types"

export function mapDashboardStats(dbStats: DashboardStatsDB): DashboardStats {
  return {
    ...dbStats,
    topProducts: dbStats.topProducts.map(p => ({
      name: p.nome,
      sales: p.vendite,
    })),
  }
}
