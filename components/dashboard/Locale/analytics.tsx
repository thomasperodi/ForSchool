"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Download, Filter, TrendingUp, Users, Gift, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { DatePickerDemo } from '@/components/DatePicker'

// Dati mock per i grafici
const dailyData = [
  { date: '01/01', redemptions: 12, customers: 8 },
  { date: '02/01', redemptions: 19, customers: 15 },
  { date: '03/01', redemptions: 15, customers: 12 },
  { date: '04/01', redemptions: 25, customers: 20 },
  { date: '05/01', redemptions: 22, customers: 18 },
  { date: '06/01', redemptions: 30, customers: 25 },
  { date: '07/01', redemptions: 28, customers: 22 },
]

const weeklyData = [
  { week: 'Sett 1', redemptions: 85, customers: 65 },
  { week: 'Sett 2', redemptions: 92, customers: 72 },
  { week: 'Sett 3', redemptions: 78, customers: 58 },
  { week: 'Sett 4', redemptions: 105, customers: 85 },
]

const categoryData = [
  { name: 'Aperitivi', value: 35, color: '#8884d8' },
  { name: 'Pranzi', value: 28, color: '#82ca9d' },
  { name: 'Cene', value: 22, color: '#ffc658' },
  { name: 'Dolci', value: 15, color: '#ff7c7c' },
]

const discountTypeData = [
  { name: 'Percentuale', value: 65, color: '#8884d8' },
  { name: 'Importo Fisso', value: 35, color: '#82ca9d' },
]

const hourlyData = [
  { hour: '08:00', redemptions: 2 },
  { hour: '09:00', redemptions: 5 },
  { hour: '10:00', redemptions: 8 },
  { hour: '11:00', redemptions: 12 },
  { hour: '12:00', redemptions: 25 },
  { hour: '13:00', redemptions: 30 },
  { hour: '14:00', redemptions: 18 },
  { hour: '15:00', redemptions: 10 },
  { hour: '16:00', redemptions: 8 },
  { hour: '17:00', redemptions: 15 },
  { hour: '18:00', redemptions: 28 },
  { hour: '19:00', redemptions: 35 },
  { hour: '20:00', redemptions: 32 },
  { hour: '21:00', redemptions: 22 },
  { hour: '22:00', redemptions: 12 },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('weekly')
  const [category, setCategory] = useState('all')
  const [discountType, setDiscountType] = useState('all')
  

  const handleExportCSV = () => {
    // Simula l'esportazione CSV
    const csvData = dailyData.map(row => 
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
        return dailyData
      case 'weekly':
        return weeklyData
      default:
        return dailyData
    }
  }

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

      {/* Filtri */}
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

      {/* Metriche principali */}
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

      {/* Grafici principali */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Andamento Riscatti</CardTitle>
            <CardDescription>
              Riscatti e clienti nel tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getCurrentData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={timeRange === 'weekly' ? 'week' : 'date'} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="redemptions" stackId="1" stroke="#8884d8" fill="#8884d8" name="Riscatti" />
                <Area type="monotone" dataKey="customers" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Clienti" />
              </AreaChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grafici secondari */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Riscatti per Ora</CardTitle>
            <CardDescription>
              Distribuzione oraria dei riscatti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="redemptions" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={discountTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {discountTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {discountTypeData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
