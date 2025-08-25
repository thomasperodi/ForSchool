"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { Download, Filter, TrendingUp, Users, Gift, Calendar } from 'lucide-react'
import { DatePickerDemo } from '@/components/DatePicker'
import { useSession } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'

const discountTypeData = [
  { name: 'Percentuale', value: 65, color: '#8884d8' },
  { name: 'Importo Fisso', value: 35, color: '#82ca9d' },
]
interface ApiDailyStat {
  giorno: string
  clienti_unici: number
  numero_riscatti: number
}

interface ApiPromoStat {
  promozione_id: string
  promozione_nome: string
  numero_riscatti: number
}

interface ApiHourlyStat {
  ora: number
  numero_riscatti: number
}

interface ApiAnalyticsResponse {
  dailyStats: ApiDailyStat[]
  promoStats: ApiPromoStat[]
  hourlyStats: ApiHourlyStat[]
}

interface DailyData {
  date: string;
  customers: number;
  redemptions: number;
}

interface WeeklyData {
  week: string;
  customers: number;
  redemptions: number;
}

interface HourlyData {
  hour: string;
  redemptions: number;
}

interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

interface DiscountData {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsData {
  dailyData: DailyData[];
  weeklyData: WeeklyData[];
  hourlyData: HourlyData[];
  categoryData: CategoryData[];
  discountTypeData: DiscountData[];
}

export default function AnalyticsPage() {
  const session = useSession()
  const userId = session?.user.id ?? null

  const [localeId, setLocaleId] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('weekly')
  const [category, setCategory] = useState('all')
  const [discountType, setDiscountType] = useState('all')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<AnalyticsData>({
    dailyData: [],
    weeklyData: [],
    hourlyData: [],
    categoryData: [],
    discountTypeData: discountTypeData,
  })
useEffect(() => {
    if (!userId) return

    const fetchLocaleId = async () => {
      const { data, error } = await supabase
        .from("locali")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Errore nel recupero del locale_id:", error.message)
        return
      }

      setLocaleId(data.id)
    }

    fetchLocaleId()
    
  }, [userId])



useEffect(() => {
  if (!localeId) return

  async function fetchData() {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/promozioni/dashboard/analytics?locale_id=${localeId}`, { cache: 'no-store' })

      if (!res.ok) {
        let errorMsg = 'Errore risposta API'
        try {
          const errorJson = await res.json()
          if (errorJson?.error) errorMsg = errorJson.error
          else if (errorJson?.message) errorMsg = errorJson.message
        } catch {}
        throw new Error(errorMsg)
      }

const json: ApiAnalyticsResponse = await res.json()


      // palette di fallback per categorie
      const palette = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#8dd1e1']

      // 🔹 Mappa i dati API nei tuoi tipi
      const dailyData: DailyData[] = (json.dailyStats || []).map((d: ApiDailyStat) => ({
        date: new Date(d.giorno).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
        customers: d.clienti_unici ?? 0,
        redemptions: d.numero_riscatti ?? 0,
      }))

      const categoryData: CategoryData[] = (json.promoStats || []).map((c: ApiPromoStat, idx: number) => ({
        name: c.promozione_nome,
        value: c.numero_riscatti ?? 0,
        color: palette[idx % palette.length],
      }))

      const hourlyData: HourlyData[] = (json.hourlyStats || []).map((h: ApiHourlyStat) => ({
        hour: `${h.ora}:00`,
        redemptions: h.numero_riscatti ?? 0,
      }))

      setData(prevData => ({
        ...prevData,
        dailyData,
        weeklyData: [], // se non lo usi ancora
        hourlyData,
        categoryData,
      }))
    } catch (error: unknown) {
      console.error("Errore caricamento dati:", error)
      setError(
        error instanceof Error
          ? error.message
          : 'Impossibile caricare i dati. Riprova più tardi.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  fetchData()
}, [localeId])



  const handleExportCSV = () => {
    const current = getCurrentData()
    const isWeekly = timeRange === 'weekly'
    const header = (isWeekly ? 'Settimana' : 'Data') + ',Riscatti,Clienti\n'
    const csvData = current
      .map((row: { week?: string; date?: string; redemptions?: number; customers?: number }) => {
        const label = isWeekly ? row.week : row.date
        const red = typeof row.redemptions === 'number' ? row.redemptions : 0
        const cus = typeof row.customers === 'number' ? row.customers : 0
        return `${label},${red},${cus}`
      })
      .join('\n')

    const csv = header + csvData

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'analytics-report.csv'
    a.click()
  }

 // Tipizza il ritorno
const getCurrentData = (): DailyData[] | WeeklyData[] => {
  switch (timeRange) {
    case 'daily':
      return data.dailyData || []
    case 'weekly':
      return data.weeklyData || []
    default:
      return []
  }
}

// Serie corrente memoizzata in base al periodo selezionato
const currentSeries = useMemo<DailyData[] | WeeklyData[]>(() => getCurrentData(), [timeRange, data.dailyData, data.weeklyData])

// Tipo per i punti del grafico
type TimeSeriesItem = { label: string; redemptions: number; customers: number }

type ChartItem = {
  label: string
  redemptions: number
  customers: number
}
// Normalizzazione senza any
const chartData: ChartItem[] = data.dailyData.map(d => ({
  label: d.date,          // es: "25/08"
  redemptions: d.redemptions,
  customers: d.customers,
}))


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analisi & Report</h1>
          <p className="text-muted-foreground">
            Analizza le performance delle tue promozioni
          </p>
        </div>
        {/* <Button onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Esporta CSV
        </Button> */}
      </div>

      

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Andamento Riscatti</CardTitle>
            <CardDescription>
              Riscatti e clienti nel tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">Caricamento…</div>
            ) : chartData.length > 0 ? (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="label" />
      <YAxis />
      <Tooltip />
      <Area type="monotone" dataKey="redemptions" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
      <Area type="monotone" dataKey="customers" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
    </AreaChart>
  </ResponsiveContainer>
) : (
  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
    Nessun dato disponibile
  </div>
)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riscatti per Categoria</CardTitle>
            <CardDescription>
              Distribuzione per tipo di prodotto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${Math.round((typeof percent === 'number' ? percent : 0) * 100)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Riscatti per Ora</CardTitle>
            <CardDescription>
              Distribuzione oraria dei riscatti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="redemptions" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle>Tipo di Sconto</CardTitle>
            <CardDescription>
              Preferenze per tipo di sconto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.discountTypeData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.discountTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.discountTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {data.discountTypeData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}