// Imports necessari
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"

// Definizione dei tipi per i dati
type FinancialData = {
  merchRevenue: number
  subscriptionsRevenue: number
  totalRevenue: number
  merchTransactions: Array<{ id: string, amount: number, date: string }>
  subscriptionPayments: Array<{ id: string, amount: number, userEmail: string, date: string }>
}

// Componente React per la gestione degli analytics
export function AnalyticsManager() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    // Simula una chiamata API per ottenere i dati finanziari
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then(r => r.json())
      .then((json: FinancialData) => {
        if (!ignore) {
          setData(json)
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })
    return () => { ignore = true }
  }, [])

  if (loading) {
    return <p>Caricamento dati finanziari...</p>
  }

  if (!data) {
    return <p>Nessun dato finanziario disponibile.</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics e Guadagni</CardTitle>
        <CardDescription>
          Riepilogo dei guadagni derivati da merchandising e abbonamenti.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Totale Guadagni</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">€ {data.totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Guadagni Merchandising</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">€ {data.merchRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Guadagni Abbonamenti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">€ {data.subscriptionsRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-2">Transazioni Merchandising</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transazione</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.merchTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={3}>Nessuna transazione merch.</TableCell></TableRow>
                ) : (
                  data.merchTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.id}</TableCell>
                      <TableCell>€ {t.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{t.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Pagamenti Abbonamenti</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pagamento</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.subscriptionPayments.length === 0 ? (
                  <TableRow><TableCell colSpan={4}>Nessun pagamento di abbonamento.</TableCell></TableRow>
                ) : (
                  data.subscriptionPayments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.id}</TableCell>
                      <TableCell>€ {p.amount.toFixed(2)}</TableCell>
                      <TableCell>{p.userEmail}</TableCell>
                      <TableCell className="text-right">{p.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}