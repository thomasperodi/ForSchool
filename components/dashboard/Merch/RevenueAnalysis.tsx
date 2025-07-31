import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

type RevenueAnalysisProps = {
  stats: {
    id: string;
    nome: string;
    totaleGuadagnato: number;
    statsMese: {
      mese: string;
      num_pagamenti: number;
      totale_incassato: number;
      totale_commissioni: number;
      profitto: number;
      incasso_medio: number;
      commissione_media: number;
      margine_percentuale: number;
    }; // Puoi specificare meglio il tipo se servono i dettagli
  } | null;
};

const formatCurrency = (value: number) =>
  `€${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const mese = stats.statsMese.mese;

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold">Analisi Guadagni - {mese}</h2>
      <p className="text-sm text-muted-foreground">
        Report per <strong>{stats.nome}</strong> aggiornato a <strong>{mese}</strong>.
      </p>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Incasso Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.statsMese.totale_incassato)}</div>
            <p className="text-sm text-muted-foreground">
              Pagamenti: {stats.statsMese.num_pagamenti}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commissioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.statsMese.totale_commissioni)}</div>
            <p className="text-sm text-muted-foreground">
              Media: {formatCurrency(stats.statsMese.commissione_media)}
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
                stats.statsMese.margine_percentuale >= 50 ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {formatCurrency(stats.statsMese.profitto)}
            </div>
            <p className="text-sm text-muted-foreground">
              Margine: {stats.statsMese.margine_percentuale}%
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
