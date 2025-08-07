"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { Download, Filter, TrendingUp, Users, Gift, Calendar } from 'lucide-react'
import { DatePickerDemo } from '@/components/DatePicker'

const discountTypeData = [
  { name: 'Percentuale', value: 65, color: '#8884d8' },
  { name: 'Importo Fisso', value: 35, color: '#82ca9d' },
]

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
  const [timeRange, setTimeRange] = useState('weekly')
  const [category, setCategory] = useState('all')
  const [discountType, setDiscountType] = useState('all')

  const [data, setData] = useState<AnalyticsData>({
    dailyData: [],
    weeklyData: [],
    hourlyData: [],
    categoryData: [],
    discountTypeData: discountTypeData,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const json = {
          "dailyData": [
            { "date": "07/08", "customers": 1, "redemptions": 2 },
            { "date": "07/08", "customers": 1, "redemptions": 2 }
          ],
          "hourlyData": [
            { "hour": "15:00", "redemptions": 1 },
            { "hour": "18:00", "redemptions": 1 }
          ],
          "weeklyData": [
            { "week": "Sett 32", "customers": 1, "redemptions": 2 },
            { "week": "Sett 32", "customers": 1, "redemptions": 2 }
          ],
          "categoryData": [
            { "name": "Menu Studenti", "value": 2 },
            { "name": "Menu Studenti", "value": 2 }
          ]
        }
        
        setData(prevData => ({
          ...prevData,
          dailyData: json.dailyData || [],
          weeklyData: json.weeklyData || [],
          hourlyData: json.hourlyData || [],
          categoryData: json.categoryData || [],
        }))
      } catch (error) {
        console.error("Errore caricamento dati:", error)
      }
    }

    fetchData()
  }, [])

  const handleExportCSV = () => {
    const csvData = data.dailyData.map(row =>
      `${row.date},${row.redemptions},${row.customers}`
    ).join('\n')

    const header = 'Data,Riscatti,Clienti\n'
    const csv = header + csvData

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'analytics-report.csv'
    a.click()
  }

  const getCurrentData = () => {
  switch (timeRange) {
    case 'daily':
      return data.dailyData || []
    case 'weekly':
      return data.weeklyData || []
    default:
      // fallback a dati che hanno entrambi i campi, o array vuoto
      return []
  }
}
const filteredData = getCurrentData()
  .filter(item => 
    item &&
    (timeRange === 'weekly' ? item.week !== undefined : item.date !== undefined) &&
    typeof item.redemptions === 'number' &&
    typeof item.customers === 'number'
  );

console.log("Filtered data for chart:", filteredData);



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analisi & Report</h1>
          <p className="text-muted-foreground">
            Analizza le performance delle tue promozioni
          </p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Esporta CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Periodo</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Giornaliero</SelectItem>
                  <SelectItem value="weekly">Settimanale</SelectItem>
                  <SelectItem value="monthly">Mensile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="food">Cibo</SelectItem>
                  <SelectItem value="drinks">Bevande</SelectItem>
                  <SelectItem value="desserts">Dolci</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo Sconto</label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="percentage">Percentuale</SelectItem>
                  <SelectItem value="fixed">Importo Fisso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Intervallo Date</label>
              <DatePickerDemo />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Riscatti Totali
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> rispetto al periodo precedente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clienti Unici
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">892</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> rispetto al periodo precedente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasso Conversione
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72.3%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">-2.1%</span> rispetto al periodo precedente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valore Medio
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€15.40</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5.7%</span> rispetto al periodo precedente
            </p>
          </CardContent>
        </Card>
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
            {getCurrentData().length > 0 ? (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={filteredData}>
      {/* ... */}
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

        <Card>
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
        </Card>
      </div>
    </div>
  )
}