"use client" // Indica che questo è un Client Component in Next.js

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card" // Importa i componenti Card di Shadcn UI
import { Badge } from "@/components/ui/badge" // Importa il componente Badge di Shadcn UI
import { Button } from "@/components/ui/button" // Importa il componente Button di Shadcn UI
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Importa i componenti Avatar di Shadcn UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Importa i componenti Tabs di Shadcn UI
import { Progress } from "@/components/ui/progress" // Importa il componente Progress di Shadcn UI
import {
  User,
  ShoppingBag,
  Store,
  Calendar,
  GraduationCap,
  TrendingUp,
  Users,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  Package, // Re-importato per coerenza con il design precedente
  BookOpen, // Re-importato per coerenza con il design precedente
  DollarSign, // Re-importato per coerenza con il design precedente
  Scan
} from "lucide-react" // Importa le icone Lucide React
import { useSession } from "@supabase/auth-helpers-react"
import { supabase } from "@/lib/supabaseClient"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Image from "next/image"
// Definisci le interfacce per la tipizzazione dei dati, utili per TypeScript
interface UserProfile {
  name: string;
  email: string;
  Scuola?: string;
  university?: string;
  course: string;
  year?: string;
  avatar: string;
}

interface Order {
  id: string;
  item: string;
  price: number;
  status: string;
  date: string;
}

interface MarketplacePost {
  id: string;
  name: string; // Cambiato da 'title' a 'name' per corrispondere all'API
  description: string;
  price: number;
  images: string[];
  dateCreated: string;
}

interface Session {
  id: string;
  subject: string;
  tutor?: string;
  student?: string;
  date: string;
  time: string;
  status: string;
  availability?: { giorno_name: string; start: string; end: string }[]; // Disponibilità per le ripetizioni offerte
}

interface AmbassadorStats {
  promoCode: string;
  totalReferrals: number;
  monthlyReferrals: number;
  totalEarnings: number;
  monthlyEarnings: number;
  conversionRate: number;
}

interface Promotion {
  id: string;
  name: string;
  description: string;
  validUntil: string;
  totalScans: number;
}

interface ScannedPromotion {
  scanId: string;
  date: string;
  promotion: Promotion;
}

interface StudentData {
  profile: UserProfile;
  orders: Order[];
  marketplacePosts: MarketplacePost[];
  bookedSessions: Session[];
  offeredSessions: Session[];
  ambassadorStats: AmbassadorStats | null;
  scannedPromotions: ScannedPromotion[]; // Nuovo campo per le scansioni
}


export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("overview"); // Stato per la scheda attiva
  const [studentData, setStudentData] = useState<StudentData | null>(null); // Stato per i dati dello studente
  const [loading, setLoading] = useState(true); // Stato di caricamento
  const [error, setError] = useState<string | null>(null); // Stato di errore
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMateria, setEditMateria] = useState("");
  const [editDisponibile, setEditDisponibile] = useState<boolean>(true);
  const [editDescrizione, setEditDescrizione] = useState("");
  const [editPrezzoOra, setEditPrezzoOra] = useState<number>(0);
  // Gestione disponibilità: array di slot giorno/ora
  type AvailabilitySlot = { id?: string; day: number; start: string; end: string };
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [originalSlotIds, setOriginalSlotIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const session = useSession();
  // ID dello studente, qui hardcodato per esempio.
  // In un'applicazione reale, questo dovrebbe provenire da un parametro URL,
  // un contesto utente autenticato o dalle props del componente.
  const studentId = session?.user.id;

  // Effetto per recuperare i dati dello studente all'avvio del componente o al cambio di studentId
  const fetchStudentData = async () => {
      try {
        const response = await fetch(`/api/student/${studentId}`); // Chiama la tua API
        if (!response.ok) {
          throw new Error(`Errore HTTP! Stato: ${response.status}`);
        }
        const data: StudentData = await response.json(); // Parsifica la risposta JSON
        setStudentData(data); // Aggiorna lo stato con i dati
      } catch (e) {
        const err = e as Error;
        setError(err.message); // Imposta il messaggio di errore
        console.error("Errore nel recupero dei dati dello studente:", err);
      } finally {
        setLoading(false); // Termina lo stato di caricamento
      }
    };
  useEffect(() => {
    if (!studentId) {
      // Se non c'è uno studente (es. logout), non facciamo nulla
      return;
    }
    

    fetchStudentData(); // Esegue la funzione di fetch
  }, [studentId]); // La dipendenza assicura che il fetch avvenga solo quando studentId cambia

  // Funzione per determinare il colore dello stato delle Badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "consegnato":
      case "confirmed":
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "pending":
      case "in_attesa":
      case "in attesa":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "sold":
      case "spedito":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "cancelled":
      case "annullata":
      case "annullato":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Funzione per determinare l'icona dello stato
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
      case "consegnato":
      case "confirmed":
      case "active":
        return <CheckCircle className="h-3 w-3" />; // Icone leggermente più piccole per le badge
      case "pending":
      case "in_attesa":
      case "in attesa":
        return <Clock className="h-3 w-3" />;
      case "cancelled":
      case "annullata":
      case "annullato":
      case "sold":
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const openEditSession = async (sessionId: string, currentSubject: string, currentStatus: string, _currentDate?: string, _currentTime?: string, _currentPrice?: number, _currentDesc?: string) => {
    setEditingId(sessionId);
    // Carica dati aggiornati della ripetizione (prezzo, descrizione, disponibile)
    const { data: rep, error: repErr } = await supabase
      .from("ripetizioni")
      .select("materia, descrizione, prezzo_ora, disponibile")
      .eq("id", sessionId)
      .single();
    if (!repErr && rep) {
      setEditMateria(rep.materia ?? currentSubject);
      setEditDescrizione(rep.descrizione ?? "");
      setEditPrezzoOra(Number(rep.prezzo_ora ?? 0));
      setEditDisponibile(Boolean(rep.disponibile));
    } else {
      setEditMateria(currentSubject);
      setEditDescrizione(_currentDesc ?? "");
      setEditPrezzoOra(Number(_currentPrice ?? 0));
      setEditDisponibile(currentStatus === "disponibile");
    }
    // Carica disponibilità esistenti
    const { data: disp, error: dispErr } = await supabase
      .from("disponibilita_ripetizioni")
      .select("id, giorno_settimana, ora_inizio, ora_fine")
      .eq("ripetizione_id", sessionId)
      .order("giorno_settimana");
    if (!dispErr && disp) {
      type Disp = { id: string; giorno_settimana: number; ora_inizio: string; ora_fine: string };
      const list = (disp as Disp[]).map((d) => ({ id: d.id, day: Number(d.giorno_settimana), start: d.ora_inizio, end: d.ora_fine }));
      setAvailabilitySlots(list);
      setOriginalSlotIds(list.map(d => d.id!));
    } else {
      setAvailabilitySlots([]);
      setOriginalSlotIds([]);
    }
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const updatePayload: Record<string, unknown> = {
      materia: editMateria,
      disponibile: editDisponibile,
      descrizione: editDescrizione,
      prezzo_ora: editPrezzoOra,
    };
    const { error: updErr } = await supabase
      .from("ripetizioni")
      .update(updatePayload)
      .eq("id", editingId);
    if (!updErr) {
      // Sincronizza disponibilità
      const currentIds = availabilitySlots.map(s => s.id).filter(Boolean) as string[];
      const toDelete = originalSlotIds.filter(id => !currentIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("disponibilita_ripetizioni").delete().in("id", toDelete);
      }
      // Upsert: aggiorna esistenti, inserisce nuove
      for (const slot of availabilitySlots) {
        if (slot.id) {
          await supabase
            .from("disponibilita_ripetizioni")
            .update({ giorno_settimana: slot.day, ora_inizio: slot.start, ora_fine: slot.end })
            .eq("id", slot.id);
        } else {
          await supabase
            .from("disponibilita_ripetizioni")
            .insert({ ripetizione_id: editingId, giorno_settimana: slot.day, ora_inizio: slot.start, ora_fine: slot.end });
        }
      }
      setStudentData(prev => {
        if (!prev) return prev;
        const updatedOffered = (prev.offeredSessions || []).map(s =>
          s.id === editingId ? { ...s, subject: editMateria, status: editDisponibile ? "disponibile" : "non_disponibile" } : s
        );
        return { ...prev, offeredSessions: updatedOffered };
      });
      setShowEdit(false);
      setEditingId(null);
      fetchStudentData(); // Ricarica i dati per assicurarsi che tutto sia aggiornato
    } else {
      console.error("Errore aggiornamento ripetizione:", updErr);
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteId) return;
    const { error: delErr } = await supabase
      .from("ripetizioni")
      .delete()
      .eq("id", deleteId);
    if (!delErr) {
      setStudentData(prev => {
        if (!prev) return prev;
        const updated = (prev.offeredSessions || []).filter(s => s.id !== deleteId);
        return { ...prev, offeredSessions: updated };
      });
      setOpenDeleteDialog(false);
      setDeleteId(null);
    } else {
      console.error("Errore eliminazione ripetizione:", delErr);
    }
  };

  // Visualizza lo stato di caricamento
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-gray-700">Caricamento dati...</p>
      </div>
    );
  }

  // Visualizza lo stato di errore
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 p-4 rounded-xl shadow-lg m-4">
        <XCircle className="h-16 w-16 text-red-600 mb-4" />
        <h2 className="text-2xl font-semibold text-red-800">Errore di Caricamento</h2>
        <p className="text-red-700 mt-2 text-center">Impossibile caricare i dati dello studente: {error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors"
        >
          Riprova
        </Button>
      </div>
    );
  }

  // Se i dati non sono disponibili dopo il caricamento e senza errori (es. ID studente non valido)
  if (!studentData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <p className="text-lg text-gray-700">Nessun dato studente disponibile. Verifica l&apos;ID dello studente.</p>
      </div>
    );
  }

  // Destruttura i dati dello studente per un accesso più semplice
  const { profile, orders, marketplacePosts, bookedSessions, offeredSessions, ambassadorStats, scannedPromotions } = studentData;


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans"> {/* Utilizzo di font-sans di Tailwind */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Edit Dialog globale */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifica Ripetizione</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Materia</label>
                <Input value={editMateria} onChange={(e) => setEditMateria(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Descrizione</label>
                <Input value={editDescrizione} onChange={(e) => setEditDescrizione(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Prezzo (€ / ora)</label>
                <Input type="number" min={0} value={editPrezzoOra} onChange={(e) => setEditPrezzoOra(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Disponibilità (giorni e orari)</label>
                <div className="space-y-2">
                  {availabilitySlots.map((slot, idx) => (
                    <div key={slot.id || idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <select
                        className="border rounded px-2 py-2"
                        value={slot.day}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setAvailabilitySlots(arr => arr.map((s, i) => i === idx ? { ...s, day: v } : s))
                        }}
                      >
                        <option value={1}>Lunedì</option>
                        <option value={2}>Martedì</option>
                        <option value={3}>Mercoledì</option>
                        <option value={4}>Giovedì</option>
                        <option value={5}>Venerdì</option>
                        <option value={6}>Sabato</option>
                        <option value={0}>Domenica</option>
                      </select>
                      <Input type="time" value={slot.start} onChange={e => setAvailabilitySlots(arr => arr.map((s, i) => i === idx ? { ...s, start: e.target.value } : s))} />
                      <Input type="time" value={slot.end} onChange={e => setAvailabilitySlots(arr => arr.map((s, i) => i === idx ? { ...s, end: e.target.value } : s))} />
                      <Button variant="destructive" onClick={() => setAvailabilitySlots(arr => arr.filter((_, i) => i !== idx))}>Rimuovi</Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={() => setAvailabilitySlots(arr => [...arr, { day: 1, start: "09:00", end: "10:00" }])}>Aggiungi fascia</Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="disp" checked={editDisponibile} onCheckedChange={(v) => setEditDisponibile(Boolean(v))} />
                <label htmlFor="disp" className="text-sm text-gray-700">Disponibile</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEdit(false)}>Annulla</Button>
              <Button onClick={handleSaveEdit}>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Delete confirm */}
        <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 text-white" onClick={handleDeleteLesson}>Elimina</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Header del profilo - Design migliorato con gradiente */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between rounded-t-xl">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <Avatar className="h-20 w-20 border-4 border-white shadow-md">
              <AvatarImage
                src={profile.avatar || "/placeholder.svg"} // Usa placeholder se avatar non disponibile
                alt={profile.name}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { const img = e.currentTarget; img.onerror = null; img.src = "https://placehold.co/80x80/cccccc/333333?text=AV" }} // Fallback per errore immagine
              />
              <AvatarFallback className="text-lg bg-blue-800 text-white">
                {profile.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="text-blue-100 text-sm">{profile.email}</p>
            </div>
          </div>
          <div className="text-right mt-4 sm:mt-0">
            <p className="text-lg font-medium">{profile.Scuola || profile.university || "N/A"}</p>
            <p className="text-blue-200 text-sm">{profile.course} - {new Date().getFullYear() ?? "N/A"}</p>
          </div>
        </div>

        {/* Navigation Tabs - Utilizza Shadcn Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-auto p-0 rounded-none border-b border-gray-200 flex gap-1 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="overview" className="flex items-center gap-2 py-3 px-4 min-w-max data-[state=active]:shadow-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profilo</span>
            </TabsTrigger>
            <TabsTrigger value="scansioni" className="flex items-center gap-2 py-3 px-4 min-w-max data-[state=active]:shadow-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Scansioni</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2 py-3 px-4 min-w-max data-[state=active]:shadow-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Marketplace</span>
            </TabsTrigger>
            {/* <TabsTrigger value="booked" className="flex items-center gap-2 py-3 px-4 min-w-max data-[state=active]:shadow-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Prenotate</span>
            </TabsTrigger> */}
            <TabsTrigger value="offered" className="flex items-center gap-2 py-3 px-4 min-w-max data-[state=active]:shadow-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Offerte</span>
            </TabsTrigger>
            {ambassadorStats && ( // Renderizza la tab Ambassador solo se l'utente è ambassador
              <TabsTrigger value="ambassador" className="flex items-center gap-2 py-3 px-4 min-w-max data-[state=active]:shadow-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Ambassador</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Contenuto delle schede */}
          <div className="p-6">
            {/* Overview Profile */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-lg shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <User className="h-6 w-6 text-blue-600" />
                      Informazioni Personali
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={profile.avatar || "/placeholder.svg"}
                          alt={profile.name}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { const img = e.currentTarget; img.onerror = null; img.src = "https://placehold.co/64x64/cccccc/333333?text=AV" }}
                        />
                        <AvatarFallback className="text-lg bg-gray-200 text-gray-800">
                          {profile.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{profile.name}</h3>
                        <p className="text-muted-foreground text-sm">{profile.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scuola:</span>
                        <span className="font-medium text-gray-800">{profile.Scuola || profile.university || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Classe:</span>
                        <span className="font-medium text-gray-800">{profile.course}</span>
                      </div>
                      
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-2xl font-bold">Statistiche Rapide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg shadow-sm">
                        <Scan className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-blue-700">{scannedPromotions.length}</div>
                        <div className="text-sm text-gray-600">Scan Totali</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg shadow-sm">
                        <Store className="h-8 w-8 text-purple-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-purple-700">{marketplacePosts.length}</div>
                        <div className="text-sm text-gray-600">Post Marketplace</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg shadow-sm">
                        <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-green-700">{bookedSessions.length}</div>
                        <div className="text-sm text-gray-600">Ripetizioni Prenotate</div>
                      </div>
                      {ambassadorStats && (<div className="text-center p-3 bg-orange-50 rounded-lg shadow-sm">
                        <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-orange-700">
                          {/* Correzione per gestire il caso in cui ambassadorStats è null */}
                          €{ambassadorStats ? ambassadorStats.totalEarnings.toFixed(2) : "0.00"}
                        </div>
                        <div className="text-sm text-gray-600">Guadagni (Ambassador)</div>
                      </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Scan Tab */}
            <TabsContent value="scansioni" className="space-y-6">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />Le mie Promo
                  </CardTitle>
                  <CardDescription>Storico delle promozioni scansionate.</CardDescription>
                </CardHeader>
                <CardContent>
                  {scannedPromotions.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">Nessuna promozione scannerizzata</p>
                  ) : (
                    <div className="space-y-3 sm:space-y-0 sm:overflow-x-auto sm:rounded-lg sm:border sm:border-gray-200">
                      {/* Lista a card su mobile, tabella su sm+ */}
                      <div className="grid gap-3 sm:hidden">
                        {scannedPromotions.map((scan) => (
                          <div key={scan.scanId} className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              {/* <div>
                                <div className="text-sm text-gray-500">ID</div>
                                <div className="text-sm font-medium text-gray-900 break-all">{scan.scanId}</div>
                              </div> */}
                              
                            </div>
                            <div className="mt-3">
                              <div className="text-sm text-gray-500">Nome</div>
                              <div className="text-base font-semibold text-gray-900">{scan.promotion.name}</div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <div className="text-gray-600">Descrizione</div>
                              <div className="font-semibold text-blue-700">€{scan.promotion.description}</div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-sm text-gray-600">
                              <div>Data</div>
                              <div>{new Date(scan.date).toLocaleDateString('it-IT')}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden sm:block">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Ordine</th>c */}
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {scannedPromotions.map((scan) => (
                              <tr key={scan.scanId} className="hover:bg-gray-50 transition-colors">
                                {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{scan.scanId}</td> */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{scan.promotion.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">€{scan.promotion.description}</td>
                                
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(scan.date).toLocaleDateString('it-IT')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Marketplace Posts Tab */}
            <TabsContent value="marketplace" className="space-y-6">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Store className="h-6 w-6 text-purple-600" />I Miei Annunci Marketplace
                  </CardTitle>
                  <CardDescription>Gestisci i tuoi prodotti in vendita sul marketplace.</CardDescription>
                </CardHeader>
                <CardContent>
                  {marketplacePosts.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">Nessun annuncio marketplace trovato.</p>
                  ) : (
                    <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 md:grid-cols-3">
                      {marketplacePosts.map((post) => (
                        <Card key={post.id} className="relative rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-3 sm:p-4">
                            <div className="aspect-[4/3] sm:aspect-video bg-muted rounded-lg mb-2 sm:mb-3 flex items-center justify-center overflow-hidden">
                              {post.images && post.images.length > 0 ? (
                                <Image
                                  width={300}
                                  height={168}
                                  src={post.images[0]}
                                  alt={post.name}
                                  className="w-full h-full object-cover"
                                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => { const img = e.currentTarget; img.onerror = null; img.src = "https://placehold.co/300x168/cccccc/333333?text=Nessuna%20Immagine" }}
                                  loading="lazy"
                                />
                              ) : (
                                <Store className="h-12 w-12 text-muted-foreground" />
                              )}
                            </div>
                            <h4 className="font-semibold text-base sm:text-lg mb-1 text-gray-900 line-clamp-1">{post.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.description}</p>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg sm:text-xl font-bold text-blue-700">€{post.price.toFixed(2)}</span>
                              <Badge className={`flex items-center gap-1 ${getStatusColor("active")}`}> {/* Lo stato per i prodotti del marketplace dall'API è implicito attivo */}
                                {getStatusIcon("active")}
                                <span>Attivo</span>
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Pubblicato il {new Date(post.dateCreated).toLocaleDateString('it-IT')}</span>
                            </div>
                            {/* <Button size="sm" variant="outline" className="w-full mt-3">Visualizza Dettagli</Button> */}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Booked Tab */}
            {/* <TabsContent value="booked" className="space-y-6">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Calendar className="h-6 w-6 text-green-600" />
                    Ripetizioni Prenotate
                  </CardTitle>
                  <CardDescription>Le tue prossime e passate sessioni di ripetizione con i tutor.</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookedSessions.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">Nessuna sessione prenotata.</p>
                  ) : (
                    <div className="space-y-3">
                      {bookedSessions.map((session) => (
                        <div key={session.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-50 rounded-full flex items-center justify-center">
                                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-base sm:text-lg text-gray-900">{session.subject}</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">con {session.tutor}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">{session.date} alle {session.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`flex items-center gap-1 ${getStatusColor(session.status)}`}>
                                {getStatusIcon(session.status)}
                                <span>
                                  {session.status === "confirmed" ? "Confermata" :
                                   session.status === "pending" || session.status === "in_attesa" || session.status === "in attesa" ? "In attesa" :
                                   session.status === "cancelled" || session.status === "annullata" || session.status === "annullato" ? "Annullata" :
                                   session.status}
                                </span>
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 sm:flex-none">Dettagli</Button>
                            <Button size="sm" className="flex-1 sm:flex-none">Riprenota</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent> */}

            {/* Offered Tab */}
            <TabsContent value="offered" className="space-y-6">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <GraduationCap className="h-6 w-6 text-orange-600" />
                    Ripetizioni che Offri (come Tutor)
                  </CardTitle>
                  <CardDescription>Gestisci le sessioni di tutoring che hai offerto ad altri studenti.</CardDescription>
                </CardHeader>
<CardContent>
  {offeredSessions.length === 0 ? (
    <p className="text-gray-600 text-center py-4">Non hai ancora offerto ripetizioni.</p>
  ) : (
    <div className="space-y-3">
      {offeredSessions.map((session) => (
        <div key={session.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-50 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-base sm:text-lg text-gray-900">{session.subject}</h4>
                
                {/* Studente se già prenotato */}
                {session.student && (
                  <p className="text-xs sm:text-sm text-muted-foreground">per {session.student}</p>
                )}

                {/* Data e ora se già prenotata */}
                {session.date && session.time && (
                  <p className="text-xs sm:text-sm text-muted-foreground">{session.date} alle {session.time}</p>
                )}

                {/* Mostra disponibilità generale */}
                {session.availability && session.availability.length > 0 && (
                  <div className="mt-1 text-xs sm:text-sm text-gray-600">
                    <span className="font-semibold">Disponibilità:</span>{" "}
                    {session.availability.map((d, i) => (
                      <span key={i} className="mr-2">
                        {d.giorno_name} ({d.start} - {d.end})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={`flex items-center gap-1 ${getStatusColor(session.status)}`}>
                {getStatusIcon(session.status)}
                <span>
                  {session.status === "confirmed" ? "Confermata" :
                   session.status === "pending" || session.status === "in_attesa" || session.status === "in attesa" ? "In attesa" :
                   session.status === "cancelled" || session.status === "annullata" || session.status === "annullato" ? "Annullata" :
                   session.status}
                </span>
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => openEditSession(session.id, session.subject, session.status, session.date, session.time)}
            >
              Modifica
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 sm:flex-none"
              onClick={() => { setDeleteId(session.id); setOpenDeleteDialog(true); }}
            >
              Elimina
            </Button>
          </div>
        </div>
      ))}
    </div>
  )}
</CardContent>


              </Card>
            </TabsContent>

            {/* Ambassador Statistics Tab */}
            {ambassadorStats && ( // Renderizza il contenuto Ambassador solo se ambassadorStats è disponibile
              <TabsContent value="ambassador" className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Programma Ambassador</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="rounded-lg shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                        Statistiche Ambassador
                      </CardTitle>
                      <CardDescription>
                        Il tuo codice promozionale:{" "}
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                          {ambassadorStats.promoCode}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg shadow-sm">
                          <Users className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                          <div className="text-3xl font-bold text-blue-700">
                            {ambassadorStats.totalReferrals}
                          </div>
                          <div className="text-sm text-gray-600">Referral Totali</div>
                        </div>
                        <div className="text-center p-4 bg-indigo-50 rounded-lg shadow-sm">
                          <Clock className="h-8 w-8 text-indigo-600 mx-auto mb-1" />
                          <div className="text-3xl font-bold text-indigo-700">
                            {ambassadorStats.monthlyReferrals}
                          </div>
                          <div className="text-sm text-gray-600">Referral Questo Mese</div>
                        </div>
                      </div>

                  
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                        <Euro className="h-6 w-6 text-green-600" />
                        Guadagni Ambassador
                      </CardTitle>
                      <CardDescription>I tuoi guadagni accumulati come ambassador.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg shadow-sm">
                          <div>
                            <div className="text-sm text-gray-600">Guadagni Totali</div>
                            <div className="text-3xl font-bold text-green-700">
                              €{ambassadorStats.totalEarnings.toFixed(2)}
                            </div>
                          </div>
                          <DollarSign className="h-10 w-10 text-green-600" />
                        </div>

                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg shadow-sm">
                          <div>
                            <div className="text-sm text-gray-600">Guadagni Questo Mese</div>
                            <div className="text-3xl font-bold text-blue-700">
                              €{ambassadorStats.monthlyEarnings.toFixed(2)}
                            </div>
                          </div>
                          <Euro className="h-10 w-10 text-blue-600" />
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
