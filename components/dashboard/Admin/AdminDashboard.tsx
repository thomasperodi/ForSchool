"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import DiscoManager from "./DiscoManager"
import TransactionsManager from "./TransactionsManager"
import { AnalyticsManager } from "./AnalyticsManager"
import AmbassadorManager from "./AmbassadorManager"
import NotificheManager from "./NotificheManager"
import toast from "react-hot-toast"


// Aggiungi questo import dinamico. Il componente verrà caricato solo nel browser.
const MapSelector = dynamic(() => import("@/components/MapSelector"), {
  ssr: false,
})

// import { Separator } from "@/components/ui/separator"
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Role = "studente" | "rappresentante" | "tutor" | "merch" | "admin" | "locale"

type AdminUser = {
  scuola: {
    id: string
    nome: string | null
  }
  id: string
  nome: string
  email: string
  ruolo: Role
  isActive: boolean
}

type AdminEvent = {
  id: string
  titolo: string
  data: string
  luogo: string
  iscritti: number
}

type TutoringLesson = {
  id: string
  tutor: string
  materia: string
  orario: string
  approvata: boolean
  pagata: boolean
}

type Product = {
  id: string
  nome: string
  prezzo: number
  varianti: number
  ordini: number
}

type Promotion = {
  id: string
  nome: string
  scansioni: number
  attiva: boolean
}

type Thread = {
  id: string
  titolo: string
  messaggi: number
  segnalato: boolean
}

// Aggiungi un nuovo tipo per le discoteche
type Disco = {
  id: string
  name: string
  category: "discoteca"
  address?: string | null
  image_url?: string | null
  latitudine?: number | null
  longitudine?: number | null
  user: { id: string; nome: string; email: string } | null
  // Altre proprietà specifiche per le discoteche, ad esempio:
  serateSpeciali: string[]
  capienza: number
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("utenti")

  const tabs = [
    { value: "utenti", label: "Utenti" },
    { value: "eventi", label: "Eventi" },
    { value: "discoteche", label: "Discoteche" },
    { value: "transazioni", label: "Transazioni & Pagamenti" },
    { value: "analytics", label: "Analytics" },
    { value: "ambassador", label: "Ambassador" },
    { value: "merch", label: "Merchandising" },
    { value: "locali", label: "Locali" },
    { value: "promozioni", label: "Promozioni" },
    { value: "notifiche", label: "Notifiche" },
    { value: "impostazioni", label: "Impostazioni" },
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Dashboard Amministratore
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gestisci utenti, eventi, ripetizioni, merchandising, promozioni, notifiche e impostazioni
        </p>
      </div>

      {/* Dropdown su mobile */}
      <div className="sm:hidden">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona sezione" />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs su desktop */}
      <div className="hidden sm:block">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Contenuti */}
      <div className="mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="utenti">
            <UsersManager />
          </TabsContent>

          <TabsContent value="eventi">
            <EventsManager />
          </TabsContent>

          <TabsContent value="discoteche">
            <DiscoManager />
          </TabsContent>

          <TabsContent value="transazioni">
            <TransactionsManager />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsManager />
          </TabsContent>

          <TabsContent value="ambassador">
            <AmbassadorManager />
          </TabsContent>

          <TabsContent value="merch">
            <MerchManager />
          </TabsContent>

          <TabsContent value="promozioni">
            <PromotionsManager />
          </TabsContent>

          <TabsContent value="notifiche">
            <NotificheManager />
          </TabsContent>

          <TabsContent value="impostazioni">
            <SettingsManager />
          </TabsContent>

          <TabsContent value="locali">
            <LocaliManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


function UsersManager() {
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all")
  const [query, setQuery] = useState("")
  const [data, setData] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(10) // 10 utenti per pagina
  const [totalCount, setTotalCount] = useState(0)

  // Funzione per caricare utenti con paginazione
  const fetchUsers = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, { cache: "no-store" })
      const json = await res.json()
      setData(json.utenti || [])
      setTotalCount(json.totalCount || 0) // <-- attenzione al campo totalCount
    } catch (err) {
      console.error("Errore caricamento utenti", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(page)
  }, [page])

  // Filtri lato client
  const filtered = useMemo(() => {
    return data.filter(u =>
      (roleFilter === "all" || u.ruolo === roleFilter) &&
      (u.nome.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
    )
  }, [data, roleFilter, query])

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Utenti</CardTitle>
        <CardDescription>CRUD completo e filtri per ruolo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input placeholder="Cerca per nome o email" value={query} onChange={e => setQuery(e.target.value)} />
          <Select value={roleFilter} onValueChange={(v: Role | "all") => setRoleFilter(v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Ruolo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="studente">Studente</SelectItem>
              <SelectItem value="rappresentante">Rappresentante</SelectItem>
              <SelectItem value="tutor">Tutor</SelectItem>
              <SelectItem value="merch">Merch</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="locale">Locale</SelectItem>
            </SelectContent>
          </Select>
          <CreateUserDialog onCreated={(u) => setData(prev => [u, ...prev])} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Scuola</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6}>Caricamento…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6}>Nessun utente</TableCell></TableRow>
              ) : (
                filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.scuola?.nome}</TableCell>
                    <TableCell><Badge variant="secondary">{u.ruolo}</Badge></TableCell>
                    <TableCell>{u.isActive ? <Badge>Attivo</Badge> : <Badge variant="outline">Disattivo</Badge>}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <EditUserDialog user={u} onSaved={(nu) => setData(prev => prev.map(x => x.id === nu.id ? nu : x))} />
                      <Button variant="destructive" size="sm" onClick={async () => {
                        await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" })
                        setData(prev => prev.filter(x => x.id !== u.id))
                      }}>Elimina</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginazione */}
        <div className="flex justify-between mt-4">
          <Button disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>Precedente</Button>
          <span>Pagina {page} di {totalPages}</span>
          <Button disabled={page >= totalPages} onClick={() => setPage(prev => prev + 1)}>Successiva</Button>
        </div>
      </CardContent>
    </Card>
  )
}




function CreateUserDialog({ onCreated }: { onCreated: (u: AdminUser) => void }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [ruolo, setRuolo] = useState<Role>("studente")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Crea Utente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo Utente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Select value={ruolo} onValueChange={(v: Role) => setRuolo(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="studente">Studente</SelectItem>
              <SelectItem value="rappresentante">Rappresentante</SelectItem>
              <SelectItem value="tutor">Tutor</SelectItem>
              <SelectItem value="merch">Merch</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            const body = { nome, email, ruolo }
            const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const created: AdminUser = await res.json()
            onCreated(created)
            setOpen(false)
            setNome(''); setEmail('')
          }}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({ user, onSaved }: { user: AdminUser, onSaved: (u: AdminUser) => void }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState(user.nome)
  const [ruolo, setRuolo] = useState<Role>(user.ruolo)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Modifica</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica Utente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <Input value={user.email} disabled />
          <Select value={ruolo} onValueChange={(v: Role) => setRuolo(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="studente">Studente</SelectItem>
              <SelectItem value="rappresentante">Rappresentante</SelectItem>
              <SelectItem value="tutor">Tutor</SelectItem>
              <SelectItem value="merch">Merch</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="locale">Locale</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            const body = { nome, ruolo }
            const res = await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const updated: AdminUser = await res.json()
            onSaved(updated)
            setOpen(false)
          }}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EventsManager() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let ignore = false
    setLoading(true)
    fetch('/api/admin/events', { cache: 'no-store' }).then(r => r.json()).then((json: AdminEvent[]) => { if (!ignore) setEvents(json) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventi</CardTitle>
        <CardDescription>Crea, modifica, elimina e gestisci gli iscritti</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-3">
          <CreateEventDialog onCreated={(e) => setEvents(prev => [e, ...prev])} />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Luogo</TableHead>
                <TableHead>Iscritti</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5}>Caricamento…</TableCell></TableRow>
              ) : events.length === 0 ? (
                <TableRow><TableCell colSpan={5}>Nessun evento</TableCell></TableRow>
              ) : events.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell>{ev.titolo}</TableCell>
                  <TableCell>{ev.data}</TableCell>
                  <TableCell>{ev.luogo}</TableCell>
                  <TableCell>{ev.iscritti}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => toast.error('Visualizza iscritti (implementa modale)')}>Iscritti</Button>
                    <Button variant="outline" size="sm" onClick={() => toast.error('Check-in/out (implementa)')}>Check-in</Button>
                    <Button variant="destructive" size="sm" onClick={async () => {
                      await fetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' })
                      setEvents(prev => prev.filter(x => x.id !== ev.id))
                    }}>Elimina</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateEventDialog({ onCreated }: { onCreated: (e: AdminEvent) => void }) {
  const [open, setOpen] = useState(false)
  const [titolo, setTitolo] = useState("")
  const [data, setData] = useState("")
  const [luogo, setLuogo] = useState("")
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Crea Evento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuovo Evento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Titolo" value={titolo} onChange={e => setTitolo(e.target.value)} />
          <Input placeholder="Data" value={data} onChange={e => setData(e.target.value)} />
          <Input placeholder="Luogo" value={luogo} onChange={e => setLuogo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            const body = { titolo, data, luogo }
            const res = await fetch('/api/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const created: AdminEvent = await res.json()
            onCreated(created)
            setOpen(false)
            setTitolo(''); setData(''); setLuogo('')
          }}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TutoringManager() {
  const [rows, setRows] = useState<TutoringLesson[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let ignore = false
    fetch('/api/admin/tutoring', { cache: 'no-store' }).then(r => r.json()).then((json: TutoringLesson[]) => { if (!ignore) setRows(json) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])
  return (
    <Card>
      <CardHeader><CardTitle>Ripetizioni</CardTitle><CardDescription>Approva o rimuovi lezioni. Monitor pagamenti Stripe</CardDescription></CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tutor</TableHead>
                <TableHead>Materia</TableHead>
                <TableHead>Orario</TableHead>
                <TableHead>Approvata</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6}>Caricamento…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={6}>Nessuna lezione</TableCell></TableRow> : rows.map(l => (
                <TableRow key={l.id}>
                  <TableCell>{l.tutor}</TableCell>
                  <TableCell>{l.materia}</TableCell>
                  <TableCell>{l.orario}</TableCell>
                  <TableCell>{l.approvata ? <Badge>Ok</Badge> : <Badge variant="outline">In attesa</Badge>}</TableCell>
                  <TableCell>{l.pagata ? <Badge>Pagata</Badge> : <Badge variant="secondary">Pendente</Badge>}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      await fetch(`/api/admin/tutoring/${l.id}`, { method: 'PATCH', body: JSON.stringify({ approvata: !l.approvata }) })
                      setRows(prev => prev.map(x => x.id === l.id ? { ...x, approvata: !x.approvata } : x))
                    }}>{l.approvata ? 'Revoca' : 'Approva'}</Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      await fetch(`/api/admin/tutoring/${l.id}`, { method: 'DELETE' })
                      setRows(prev => prev.filter(x => x.id !== l.id))
                    }}>Rimuovi</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function MerchManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let ignore = false
    fetch('/api/admin/merch', { cache: 'no-store' }).then(r => r.json()).then((json: Product[]) => { if (!ignore) setProducts(json) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])
  return (
    <Card>
      <CardHeader><CardTitle>Merchandising</CardTitle><CardDescription>Prodotti, varianti, ordini e spedizioni</CardDescription></CardHeader>
      <CardContent>
        <div className="flex justify-between mb-3">
          <Button onClick={() => toast.error('Crea prodotto (implementa dialog)')}>Aggiungi Prodotto</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Varianti</TableHead>
                <TableHead>Ordini</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5}>Caricamento…</TableCell></TableRow> : products.length === 0 ? <TableRow><TableCell colSpan={5}>Nessun prodotto</TableCell></TableRow> : products.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell>€ {p.prezzo.toFixed(2)}</TableCell>
                  <TableCell>{p.varianti}</TableCell>
                  <TableCell>{p.ordini}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm">Varianti</Button>
                    <Button variant="outline" size="sm">Immagini</Button>
                    <Button variant="destructive" size="sm" onClick={async () => {
                      await fetch(`/api/admin/merch/${p.id}`, { method: 'DELETE' })
                      setProducts(prev => prev.filter(x => x.id !== p.id))
                    }}>Elimina</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function PromotionsManager() {
  const [rows, setRows] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let ignore = false
    fetch('/api/admin/promotions', { cache: 'no-store' }).then(r => r.json()).then((json: Promotion[]) => { if (!ignore) setRows(json) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])
  return (
    <Card>
      <CardHeader><CardTitle>Promozioni con QR</CardTitle><CardDescription>Crea promozioni, monitora scansioni e utenti</CardDescription></CardHeader>
      <CardContent>
        <div className="flex justify-between mb-3">
          <Button onClick={() => toast.error('Crea promozione (implementa dialog)')}>Nuova Promozione</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Scansioni</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4}>Caricamento…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={4}>Nessuna promozione</TableCell></TableRow> : rows.map(pr => (
                <TableRow key={pr.id}>
                  <TableCell>{pr.nome}</TableCell>
                  <TableCell>{pr.scansioni}</TableCell>
                  <TableCell>{pr.attiva ? <Badge>Attiva</Badge> : <Badge variant="outline">Disattiva</Badge>}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => toast.error('Statistica scansioni (link/implementa)')}>Statistiche</Button>
                    <Button variant="outline" size="sm" onClick={() => toast.error('Utenti che hanno scansionato (implementa)')}>Utenti</Button>
                    <Button variant="destructive" size="sm" onClick={async () => {
                      await fetch(`/api/admin/promotions/${pr.id}`, { method: 'DELETE' })
                      setRows(prev => prev.filter(x => x.id !== pr.id))
                    }}>Elimina</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function ForumManager() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [broadcast, setBroadcast] = useState("")
  useEffect(() => {
    let ignore = false
    fetch('/api/admin/forum', { cache: 'no-store' }).then(r => r.json()).then((json: Thread[]) => { if (!ignore) setThreads(json) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])
  return (
    <Card>
      <CardHeader><CardTitle>Forum & Comunicazioni</CardTitle><CardDescription>Moderazione e messaggi broadcast</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Messaggio broadcast" value={broadcast} onChange={e => setBroadcast(e.target.value)} />
          <Button onClick={async () => { await fetch('/api/admin/forum/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: broadcast }) }); setBroadcast('') }}>Invia</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Messaggi</TableHead>
                <TableHead>Segnalato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4}>Caricamento…</TableCell></TableRow> : threads.length === 0 ? <TableRow><TableCell colSpan={4}>Nessun thread</TableCell></TableRow> : threads.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.titolo}</TableCell>
                  <TableCell>{t.messaggi}</TableCell>
                  <TableCell>{t.segnalato ? <Badge variant="destructive">Segnalato</Badge> : <Badge>OK</Badge>}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={async () => { await fetch(`/api/admin/forum/${t.id}/moderate`, { method: 'POST' }); setThreads(prev => prev.map(x => x.id === t.id ? { ...x, segnalato: false } : x)) }}>Approva</Button>
                    <Button size="sm" variant="destructive" onClick={async () => { await fetch(`/api/admin/forum/${t.id}`, { method: 'DELETE' }); setThreads(prev => prev.filter(x => x.id !== t.id)) }}>Elimina</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SettingsManager() {
  const [commissione, setCommissione] = useState("10")
  const [domini, setDomini] = useState("scuola.it; liceo.edu")
  const [brand, setBrand] = useState("Skoolly")
  return (
    <Card>
      <CardHeader><CardTitle>Impostazioni Piattaforma</CardTitle><CardDescription>Commissioni Stripe, domini email scuole, brand</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <p className="text-sm font-medium mb-2">Commissione Stripe (%)</p>
            <Input value={commissione} onChange={e => setCommissione(e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Domini Email consentiti</p>
            <Input value={domini} onChange={e => setDomini(e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Brand</p>
            <Input value={brand} onChange={e => setBrand(e.target.value)} />
          </div>
        </div>
        <Button onClick={async () => { await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commissione: Number(commissione), domini: domini.split(';').map(s => s.trim()), brand }) }) }}>Salva Impostazioni</Button>
      </CardContent>
    </Card>
  )
}

function LocaliManager() {
  const [rows, setRows] = useState<Array<{
    id: string; name: string; category: string; address?: string | null; image_url?: string | null; latitudine?: number | null; longitudine?: number | null; user: { id: string; nome: string; email: string } | null
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setLoading(true)
      const res = await fetch('/api/admin/locali', { cache: 'no-store' })
      const json = await res.json()
      if (!ignore) setRows(json)
      if (!ignore) setLoading(false)
    }
    load()
    return () => { ignore = true }
  }, [])

  return (
    <Card>
      <CardHeader><CardTitle>Locali</CardTitle><CardDescription>Crea un locale e assegna un utente proprietario</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <CreateLocaleDialog onCreated={(r) => setRows(prev => [r, ...prev])} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead>Utente</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5}>Caricamento…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={5}>Nessun locale</TableCell></TableRow> : rows.map(l => (
                <TableRow key={l.id}>
                  <TableCell>{l.name}</TableCell>
                  <TableCell><Badge variant="secondary">{l.category}</Badge></TableCell>
                  <TableCell>{l.address ?? '-'}</TableCell>
                  <TableCell>{l.user ? `${l.user.nome} (${l.user.email})` : '-'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <AssignUserDialog localeId={l.id} currentUser={l.user} onAssigned={(u) => setRows(prev => prev.map(x => x.id === l.id ? { ...x, user: u } : x))} />
                    <Button size="sm" variant="destructive" onClick={async () => { await fetch(`/api/admin/locali/${l.id}`, { method: 'DELETE' }); setRows(prev => prev.filter(x => x.id !== l.id)) }}>Elimina</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

type LocaleRow = {
  id: string
  name: string
  category: string
  address?: string | null
  image_url?: string | null
  latitudine?: number | null
  longitudine?: number | null
  user: { id: string; nome: string; email: string } | null
}

function CreateLocaleDialog({ onCreated }: { onCreated: (row: LocaleRow) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [address, setAddress] = useState("")
  const [userId, setUserId] = useState<string>("")
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; nome: string; email: string }>>([])
  const [userQuery, setUserQuery] = useState("")
  const [files, setFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!address) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await res.json();
        if (data && data.length > 0) {
          setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        }
      } catch (err) {
        console.error("Errore geocoding:", err);
      }
    }, 500); // debounce di 500ms
    return () => clearTimeout(timer);
  }, [address]);
useEffect(() => {
  if (!open) return
  let ignore = false
  fetch('/api/admin/users', { cache: 'no-store' })
    .then(r => r.json())
    .then((res) => {
      if (!ignore) {
        // estrai correttamente l'array utenti
        setUsers(Array.isArray(res.utenti) ? res.utenti : [])
      }
    })
    .catch(() => {
      if (!ignore) setUsers([])
    })
  return () => { ignore = true }
}, [open])


  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, userQuery])

async function filesToBase64(files: File[]): Promise<string[]> {
  return Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject('Errore conversione base64')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })))
}
  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1) Creo il locale
      const res = await fetch('/api/admin/locali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          address,
          user_id: userId,
          latitudine: coords?.lat ?? null,
          longitudine: coords?.lon ?? null,
        }),
      })
      if (!res.ok) throw new Error('Errore nella creazione del locale')
      const created: LocaleRow = await res.json()

      // 2) Se ci sono immagini da caricare, le carico
      if (files && files.length > 0) {
       const base64Images = await filesToBase64(Array.from(files))
      const uploadRes = await fetch('/api/admin/locali/upload-immagini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale_id: created.id,
          images: base64Images,
        }),
      })
        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json()
          throw new Error(uploadError?.error || 'Errore nell\'upload delle immagini')
        }
      }

      onCreated(created)
      setOpen(false)

      // Reset campi
      setName('')
      setCategory('')
      setAddress('')
      setUserId('')
      setCoords(null)
      setUserQuery('')
      setFiles(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuovo Locale</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Crea Locale</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Categoria" value={category} onChange={e => setCategory(e.target.value)} />
          <Input placeholder="Indirizzo" value={address} onChange={e => setAddress(e.target.value)} />
          <div className="space-y-2">
            <Input placeholder="Cerca utente (nome o email)" value={userQuery} onChange={e => setUserQuery(e.target.value)} />
            <Select value={userId} onValueChange={(v) => setUserId(v)}>
              <SelectTrigger><SelectValue placeholder="Assegna utente (obbligatorio)" /></SelectTrigger>
              <SelectContent>
                {filteredUsers.map(u => (<SelectItem key={u.id} value={u.id}>{u.nome} ({u.email})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Posizione sulla mappa (clicca per selezionare)</p>
            <MapSelector
  coords={coords}
  onSelect={async (p) => {
    setCoords({ lat: p.lat, lon: p.lon });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lon}`);
      const data = await res.json();
      if (data?.display_name) setAddress(data.display_name);
    } catch (err) {
      console.error("Errore reverse geocoding:", err);
    }
  }}
/>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Immagini (puoi selezionarne più di una)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => setFiles(e.target.files)}
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
        <DialogFooter>
          <Button disabled={!name || !category || !userId || loading} onClick={handleSave}>
            {loading ? "Caricamento..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AssignUserDialog({ localeId, currentUser, onAssigned }: { localeId: string; currentUser: { id: string; nome: string; email: string } | null; onAssigned: (u: { id: string; nome: string; email: string } | null) => void }) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string>(currentUser?.id ?? '')
  const [users, setUsers] = useState<Array<{ id: string; nome: string; email: string }>>([])
  const [userQuery, setUserQuery] = useState("")

useEffect(() => {
  if (!open) return
  let ignore = false
  fetch('/api/admin/users', { cache: 'no-store' })
    .then(r => r.json())
    .then((res) => {
      if (!ignore) {
        setUsers(Array.isArray(res.utenti) ? res.utenti : [])
      }
    })
    .catch(() => {
      if (!ignore) setUsers([])
    })
  return () => { ignore = true }
}, [open])


  useEffect(() => { setUserId(currentUser?.id ?? '') }, [currentUser])

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, userQuery])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Assegna Utente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assegna Utente al Locale</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Cerca utente (nome o email)" value={userQuery} onChange={e => setUserQuery(e.target.value)} />
          <Select value={userId} onValueChange={(v) => setUserId(v)}>
            <SelectTrigger><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
            <SelectContent>
              {filteredUsers.map(u => (<SelectItem key={u.id} value={u.id}>{u.nome} ({u.email})</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!userId} onClick={async () => {
            const payload: { user_id: string } = { user_id: userId }
            const res = await fetch(`/api/admin/locali/${localeId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const json = await res.json()
            onAssigned(json.user)
            setOpen(false)
          }}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


