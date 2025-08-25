"use client"

import { useState } from "react"
import { useNightclubApi } from "@/hooks/use-nightclub-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Music,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Activity,
  MenuIcon,
  Loader2,
  ChevronDown,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { useSession } from "@supabase/auth-helpers-react"
import toast from "react-hot-toast"
import Image from "next/image"

interface EventFormData {
    nome: string
    descrizione: string
    data: string
    prezzo: number
    locandina_file?: File | null      // file scelto dall'utente (frontend)
    locandina_url?: string | null     // URL pubblico (dopo upload)
    max_partecipanti: number
  }
  

export function NightclubDashboard() {
  // Mock user ID - in real app this would come from auth
  const session = useSession()
  const utenteId = session?.user.id ?? null
    
  const {   
    discoteche,
    selectedDiscoteca,
    setSelectedDiscoteca,
    statistiche,
    eventi,
    datiMensili,
    error,
    creaEvento,
    aggiornaEvento,
    eliminaEvento,
  } = useNightclubApi(utenteId ?? "")

  const [isAddEventOpen, setIsAddEventOpen] = useState(false)
  const [isEditEventOpen, setIsEditEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<{ [key: string]: unknown } | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [eventForm, setEventForm] = useState<EventFormData>({
    nome: "",
    descrizione: "",
    data: "",
    prezzo: 0,
    locandina_url: "",
    max_partecipanti: 0,
  })

  const selectedNightclubData = discoteche.find((d) => d.id === selectedDiscoteca)
  const chartData = eventi.map((evento) => ({
    name: evento.nome.substring(0, 10) + "...",
    participants: evento.partecipanti_count,
    revenue: evento.ricavi,
    price: evento.prezzo,
  }))

  const pieData = eventi.map((evento, index) => ({
    name: evento.nome,
    value: evento.partecipanti_count,
    fill: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
  }))

  const uploadLocandina = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
  
    const res = await fetch("/api/eventi/upload-locandina", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Errore upload locandina");
    const data = await res.json();
    return data.url; // URL pubblico restituito dal backend
  };
  
  const handleAddEvent = async () => {

    if (!selectedNightclubData?.stripe_account_id) {
    toast.error("Devi collegare un account Stripe prima di poter creare un evento e incassare pagamenti.");
    return;
  }
    try {
      let locandina_url = eventForm.locandina_url || "";
      if (eventForm.locandina_file) {
        locandina_url = await uploadLocandina(eventForm.locandina_file);
      }
  
      await creaEvento({
        nome: eventForm.nome,
        descrizione: eventForm.descrizione,
        data: eventForm.data,
        prezzo: eventForm.prezzo,
        locandina_url,
        max_partecipanti: eventForm.max_partecipanti,
      });
  
      setEventForm({
        nome: "",
        descrizione: "",
        data: "",
        prezzo: 0,
        locandina_file: null,
        locandina_url: "",
        max_partecipanti: 0,
      });
      setIsAddEventOpen(false);
    } catch (error) {
      console.error("Errore nella creazione evento:", error);
    }
  };
  

  const handleEditEvent = async () => {
    if (!editingEvent) return

    try {
      await aggiornaEvento(String(editingEvent.id), {
        nome: eventForm.nome,
        descrizione: eventForm.descrizione,
        data: eventForm.data,
        locandina_url: eventForm.locandina_url || undefined,
        prezzo: eventForm.prezzo,
        max_partecipanti: eventForm.max_partecipanti
        // Rimuovo max_partecipanti perché non è una proprietà valida per AggiornamentoEvento
      })
      setEditingEvent(null)
      setEventForm({ nome: "", descrizione: "", data: "", prezzo: 0 , locandina_url: "", max_partecipanti: 0 })
      setIsEditEventOpen(false)
    } catch (error) {
      console.error("Errore nell'aggiornamento evento:", error)
    }
  }

  const handleDeleteEvent = async (eventoId: string) => {
    try {
      await eliminaEvento(eventoId)
    } catch (error) {
      console.error("Errore nell'eliminazione evento:", error)
    }
  }

  // Definiamo un tipo per l'evento per evitare l'uso di "any"
  type Evento = {
    id: string
    nome: string
    descrizione: string
    data: string
    prezzo: number
    locandina_url?: string | null
    max_partecipanti?: number | null
    partecipanti_count?: number
    stato?: string
  }

  const openEditModal = (evento: Evento) => {
    setEditingEvent(evento)
    setEventForm({
      nome: evento.nome,
      descrizione: evento.descrizione,
      data: evento.data.split("T")[0], // Format date for input
      prezzo: evento.prezzo || 0 ,
      locandina_url: evento.locandina_url || "",
      max_partecipanti: evento.max_partecipanti || 0,
    })
    setIsEditEventOpen(true)
  }

  const resetForm = () => {
    setEventForm({ nome: "", descrizione: "", data: "", prezzo: 0, locandina_url: "", max_partecipanti:0 })
    setEditingEvent(null)
  }

 

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Errore nel caricamento</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }
if(!statistiche) {
  
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  if(statistiche ) console.log(statistiche.numero_eventi_totali)

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 bg-transparent">
                      <MenuIcon className="h-4 w-4 mr-2" />
                      {selectedNightclubData?.nome || "Seleziona"}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[300px]">
                    <SheetHeader>
                      <SheetTitle>Le tue discoteche</SheetTitle>
                      <SheetDescription>Seleziona la discoteca da gestire</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-3">
                      {discoteche.map((discoteca) => (
                        <div
                          key={discoteca.id}
                          className={`p-4 rounded-lg cursor-pointer transition-colors ${
                            selectedDiscoteca === discoteca.id
                              ? "bg-primary/10 border border-primary/20"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                          onClick={() => setSelectedDiscoteca(discoteca.id)}
                        >
                          <h3 className="font-medium">{discoteca.nome}</h3>
                          <div className="flex items-center text-muted-foreground text-sm mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            {discoteca.indirizzo}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <div>
                <h1 className="text-lg font-semibold md:text-xl">Dashboard</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {selectedNightclubData?.nome || "Seleziona una discoteca"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-screen-2xl px-4 py-6">
        <div className="flex flex-col space-y-6">
          <div className="hidden md:block">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Le tue discoteche</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {discoteche.map((discoteca) => (
                    <div
                      key={discoteca.id}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedDiscoteca === discoteca.id
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => setSelectedDiscoteca(discoteca.id)}
                    >
                      <h3 className="font-medium">{discoteca.nome}</h3>
                      <div className="flex items-center text-muted-foreground text-sm mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {discoteca.indirizzo}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Eventi</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">{statistiche.numero_eventi_totali || 0}</div>
                <p className="text-xs text-muted-foreground">Totali</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Partecipanti</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">{statistiche.partecipanti_totali || 0}</div>
                <p className="text-xs text-muted-foreground">Totali</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Ricavi</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold">
                  €{(statistiche?.ricavi_totali || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Totali</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Prezzo Medio</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">
                  €{statistiche?.prezzo_medio_per_evento?.toFixed(0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Per biglietto</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-center mb-4">
              <div className="md:hidden w-full">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-transparent">
                      {activeTab === "overview" && "Panoramica"}
                      {activeTab === "events" && "Eventi"}
                      {activeTab === "analytics" && "Analytics"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem onClick={() => setActiveTab("overview")}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Panoramica
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab("events")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Eventi
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab("analytics")}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analytics
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <TabsList className="hidden md:grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="overview" className="text-sm">
                  Panoramica
                </TabsTrigger>
                <TabsTrigger value="events" className="text-sm">
                  Eventi
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-sm">
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Partecipanti per Evento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        participants: {
                          label: "Partecipanti",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-[250px] md:h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="participants" fill="hsl(var(--primary))" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Eventi Top</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {eventi.length > 0 ? (
                        eventi
                          .sort((a, b) => b.partecipanti_count - a.partecipanti_count)
                          .slice(0, 5)
                          .map((evento, index) => (
                            <div key={evento.id} className="flex items-center justify-between py-2">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs md:text-sm font-medium flex-shrink-0">
                                  {index + 1}
                                </div>
                                <span className="font-medium text-sm md:text-base truncate">{evento.nome}</span>
                              </div>
                              <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap ml-2">
                                {evento.partecipanti_count} partecipanti
                              </span>
                            </div>
                          ))
                      ) : (
                        <div className="text-center text-muted-foreground text-sm py-6">Nessun evento disponibile</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-bold">Gestione Eventi</h2>
                <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Aggiungi Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle>Aggiungi Nuovo Evento</DialogTitle>
                      <DialogDescription>Crea un nuovo evento per {selectedNightclubData?.nome}</DialogDescription>
                    </DialogHeader>
                    {!selectedNightclubData?.stripe_account_id && (
  <div className="p-4 bg-yellow-100 rounded-md text-yellow-800 mb-4">
    ⚠️ Devi collegare un account Stripe per poter creare eventi e ricevere pagamenti.

    { selectedNightclubData?.stripe_account_id}<br />
    <br />
    <button
      className="text-blue-600 underline mt-2 inline-block"
      onClick={async () => {
        try {
          
          const res = await fetch('/api/stripe-create-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              discoteca_id: selectedDiscoteca
            }),
          });

          const data = await res.json();

          if (data.onboardingUrl) {
            // Reindirizza all'onboarding Stripe
            window.location.href = data.onboardingUrl;
          } else {
            console.error('Errore creazione account Stripe:', data.error);
            alert('Errore durante la creazione dell’account Stripe.');
          }
        } catch (err) {
          console.error(err);
          alert('Errore durante la creazione dell’account Stripe.');
        }
      }}
    >
      Clicca qui per collegare Stripe
    </button>
  </div>
)}

                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nome Evento</Label>
                        <Input
                          id="name"
                          value={eventForm.nome}
                          onChange={(e) => setEventForm({ ...eventForm, nome: e.target.value })}
                          placeholder="Es. Saturday Night Fever"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Descrizione</Label>
                        <Textarea
                          id="description"
                          value={eventForm.descrizione}
                          onChange={(e) => setEventForm({ ...eventForm, descrizione: e.target.value })}
                          placeholder="Descrivi l'evento..."
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="date">Data</Label>
                          <Input
                            id="date"
                            type="date"
                            value={eventForm.data}
                            onChange={(e) => setEventForm({ ...eventForm, data: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="price">Prezzo (€)</Label>
                          <Input
                            id="price"
                            type="number"
                            value={eventForm.prezzo}
                            onChange={(e) => setEventForm({ ...eventForm, prezzo: parseInt(e.target.value) || 0 })}
                            placeholder="25"
                          />
                        </div>
                      </div>
                                              <div className="grid gap-2">
                          <Label htmlFor="max-participants">Max Partecipanti</Label>
                          <Input
                            id="max-participants"
                            type="number"
                            value={eventForm.max_partecipanti}
                            onChange={(e) => setEventForm({ ...eventForm, max_partecipanti: parseInt(e.target.value) || 0 })}
                            placeholder="500"
                          />
                        </div>
                        <div className="grid gap-2">
  <Label htmlFor="poster">Locandina (opzionale)</Label>
  <Input
    id="poster"
    type="file"
    accept="image/*"
    onChange={(e) => {
      if (!e.target.files || e.target.files.length === 0) return
      setEventForm({ ...eventForm, locandina_file: e.target.files[0] })
    }}
  />
</div>



                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddEventOpen(false)
                          resetForm()
                        }}
                      >
                        Annulla
                      </Button>
                      <Button onClick={handleAddEvent}>Crea Evento</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {eventi.map((evento) => (
                  <Card key={evento.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <Image
                        width={400}
                        height={200}
                        src={evento.locandina_url || "/placeholder.svg"}
                        alt={evento.nome}
                        className="w-full h-32 md:h-40 object-cover"
                        loading="lazy"
                      />
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 text-sm md:text-base">{evento.nome}</h3>
                        <p className="text-muted-foreground text-xs md:text-sm mb-3 line-clamp-2">
                          {evento.descrizione}
                        </p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-muted-foreground text-xs md:text-sm">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{new Date(evento.data).toLocaleDateString("it-IT")}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground text-xs md:text-sm">
                            <Users className="w-3 h-3 md:w-4 md:h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {evento.partecipanti_count} partecipanti
                              {evento.max_partecipanti && ` / ${evento.max_partecipanti}`}
                            </span>
                          </div>
                          <div className="flex items-center text-green-600 text-xs md:text-sm font-semibold">
                            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              €{evento.prezzo} - Ricavo: €{evento.ricavi?.toLocaleString() || 0}
                            </span>
                          </div>
                          {evento.tasso_riempimento > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Riempimento: {evento.tasso_riempimento.toFixed(1)}%
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(evento)}
                            className="flex-1 text-xs md:text-sm"
                          >
                            <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            Modifica
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteEvent(evento.id)}
                            className="flex-1 text-red-600 hover:text-red-700 text-xs md:text-sm"
                          >
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            Elimina
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {eventi.length === 0 && (
                <div className="text-center py-12">
                  <Music className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold mb-2">Nessun evento programmato</h3>
                  <p className="text-muted-foreground mb-4 text-sm md:text-base px-4">
                    Inizia creando il tuo primo evento per {selectedNightclubData?.nome}
                  </p>
                  <Button onClick={() => setIsAddEventOpen(true)} className="w-full sm:w-auto">
                    Crea Primo Evento
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold">Analytics</h2>

              <div className="grid gap-3 grid-cols-2 md:grid-cols-4 md:gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Media Partecipanti</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">
                      {statistiche.media_partecipanti_per_evento?.toFixed(0) || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Per evento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Tasso Riempimento</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">
                      {statistiche?.tasso_riempimento_medio?.toFixed(1) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Capacità utilizzata</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Ricavo Medio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">
                      €{(Number(statistiche.ricavi_totali?.toFixed(0)) / (statistiche.numero_eventi_totali || 1)).toFixed(0)}

                    </div>
                    <p className="text-xs text-muted-foreground">Per evento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Evento Top</CardTitle>
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">
                      {eventi.length > 0
                        ? eventi.reduce((prev, current) =>
                            prev.partecipanti_count > current.partecipanti_count ? prev : current,
                          ).partecipanti_count
                        : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Max partecipanti</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Trend Mensile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        events: {
                          label: "Eventi",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-[250px] md:h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={datiMensili}>
                          <XAxis dataKey="mese" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="eventi_count"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Distribuzione Partecipanti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        participants: {
                          label: "Partecipanti",
                          color: "hsl(var(--chart-4))",
                        },
                      }}
                      className="h-[250px] md:h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            fontSize={12}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Modifica Evento</DialogTitle>
            <DialogDescription className="text-sm">Modifica i dettagli dell&apos;evento</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-sm">
                Nome Evento
              </Label>
              <Input
                id="edit-name"
                value={eventForm.nome}
                onChange={(e) => setEventForm({ ...eventForm, nome: e.target.value })}
                className=""
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="text-sm">
                Descrizione
              </Label>
              <Textarea
                id="edit-description"
                value={eventForm.descrizione}
                onChange={(e) => setEventForm({ ...eventForm, descrizione: e.target.value })}
                className=""
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-date" className="text-sm">
                  Data
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={eventForm.data}
                  onChange={(e) => setEventForm({ ...eventForm, data: e.target.value })}
                  className=""
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-price" className="text-sm">
                  Prezzo (€)
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={eventForm.prezzo}
                  onChange={(e) => setEventForm({ ...eventForm, prezzo: parseInt(e.target.value) || 0 })}
                  className=""
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-max-participants" className="text-sm">
                Max Partecipanti
              </Label>
              <Input
                id="edit-max-participants"
                type="number"
                value={eventForm.max_partecipanti}
                onChange={(e) => setEventForm({ ...eventForm, max_partecipanti: parseInt(e.target.value) || 0 })}
                className=""
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-poster" className="text-sm">
                URL Poster
              </Label>
              <Input
                id="edit-poster"
                value={eventForm.locandina_url ?? ""}
                onChange={(e) => setEventForm({ ...eventForm, locandina_url: e.target.value })}
                className=""
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditEventOpen(false)
                resetForm()
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annulla
            </Button>
            <Button onClick={handleEditEvent} className="w-full sm:w-auto order-1 sm:order-2">
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
