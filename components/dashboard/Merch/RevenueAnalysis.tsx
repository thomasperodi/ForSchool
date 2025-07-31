import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import { RevenueStatsDetailed } from "@/types";

type RevenueAnalysisProps = {
  stats: RevenueStatsDetailed | null;
};

const formatCurrency = (value: number | null | undefined) =>
  `€${(value ?? 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function RevenueAnalysis({ stats }: RevenueAnalysisProps) {
  if (!stats) {
    return (
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Analisi Guadagni Mensili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              <p>Caricamento dati analisi guadagni...</p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  const mese = stats.statsMese?.mese ?? "N/D";
  const nome = stats.nome ?? "Sconosciuto";

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold">Analisi Guadagni - {mese}</h2>
      <p className="text-sm text-muted-foreground">
        Report per <strong>{nome}</strong> aggiornato a <strong>{mese}</strong>.
      </p>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Incasso Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(stats.statsMese?.totale_incassato)}
            </div>
            <p className="text-sm text-muted-foreground">
              Pagamenti: {stats.statsMese?.num_pagamenti ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commissioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(stats.statsMese?.totale_commissioni)}
            </div>
            <p className="text-sm text-muted-foreground">
              Media: {formatCurrency(stats.statsMese?.commissione_media)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitto Netto</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                (stats.statsMese?.margine_percentuale ?? 0) >= 50
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {formatCurrency(stats.statsMese?.profitto)}
            </div>
            <p className="text-sm text-muted-foreground">
              Margine: {stats.statsMese?.margine_percentuale ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
