"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import MapSelector from "@/components/MapSelector"

type Disco = {
  id: string
  nome: string
  indirizzo?: string | null
  image_url?: string | null
  latitudine?: number | null
  longitudine?: number | null
  user: { id: string; nome: string; email: string } | null
}
type DiscoAPI = {
    id: string
    nome: string
    indirizzo?: string | null
    stripe_account_id?: string | null
    utenti_discoteche?: { utenti: { id: string; nome: string; email: string } }[]
  }
  
export default function DiscoManager() {
  const [rows, setRows] = useState<Disco[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setLoading(true)
      const res = await fetch('/api/admin/discoteca', { cache: 'no-store' })
      const json = await res.json()

      // mappiamo l'user direttamente
      const mapped = json.map((d: DiscoAPI) => ({
        id: d.id,
        nome: d.nome,
        indirizzo: d.indirizzo,
        user: d.utenti_discoteche?.[0]?.utenti ?? null,
      }))

      if (!ignore) setRows(mapped)
      if (!ignore) setLoading(false)
    }
    load()
    return () => { ignore = true }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Discoteche</CardTitle>
        <CardDescription>Crea un locale notturno e assegna un utente proprietario</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateDiscoDialog onCreated={(r) => setRows(prev => [r, ...prev])} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead>Utente</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4}>Caricamento…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4}>Nessuna discoteca</TableCell></TableRow>
              ) : (
                rows.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.nome}</TableCell>
                    <TableCell>{d.indirizzo ?? '-'}</TableCell>
                    <TableCell>{d.user ? `${d.user.nome} (${d.user.email})` : '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await fetch(`/api/admin/discoteche/${d.id}`, { method: 'DELETE' })
                          setRows(prev => prev.filter(x => x.id !== d.id))
                        }}
                      >
                        Elimina
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}


function CreateDiscoDialog({ onCreated }: { onCreated: (row: Disco) => void }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState("")
  const [indirizzo, setIndirizzo] = useState("")
  const [userId, setUserId] = useState<string>("")
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; nome: string; email: string }>>([])
  const [userQuery, setUserQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔹 Geocoding: se scrivo l’indirizzo, aggiorna la mappa
  useEffect(() => {
    if (!indirizzo) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}`
        )
        const data = await res.json()
        if (data && data.length > 0) {
          setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) })
        }
      } catch (err) {
        console.error("Errore geocoding:", err)
      }
    }, 500) // debounce
    return () => clearTimeout(timer)
  }, [indirizzo])

  // 🔹 Carico utenti dalla mia API
  useEffect(() => {
    if (!open) return
    let ignore = false
    fetch('/api/admin/users?page=1&limit=50', { cache: 'no-store' })
      .then(r => r.json())
      .then((data) => {
        if (!ignore) setUsers(data.utenti ?? [])
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

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/discoteca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          indirizzo,
          user_id: userId,
          latitudine: coords?.lat ?? null,
          longitudine: coords?.lon ?? null,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Errore nella creazione della discoteca')
      }

      const created: Disco = await res.json()
      onCreated(created)

      // Reset campi
      setOpen(false)
      setNome('')
      setIndirizzo('')
      setUserId('')
      setCoords(null)
      setUserQuery('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuova Discoteca</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Crea Discoteca</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <Input placeholder="Indirizzo" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} />

          <div className="space-y-2">
            <Input placeholder="Cerca utente (nome o email)" value={userQuery} onChange={e => setUserQuery(e.target.value)} />
            <Select value={userId} onValueChange={(v) => setUserId(v)}>
              <SelectTrigger><SelectValue placeholder="Assegna utente (obbligatorio)" /></SelectTrigger>
              <SelectContent>
                {filteredUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Posizione sulla mappa (clicca per selezionare)</p>
            <MapSelector
              coords={coords}
              onSelect={async (p) => {
                setCoords({ lat: p.lat, lon: p.lon })
                try {
                  // 🔹 Reverse geocoding: se clicco sulla mappa aggiorna l’indirizzo
                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lon}`
                  )
                  const data = await res.json()
                  if (data?.display_name) setIndirizzo(data.display_name)
                } catch (err) {
                  console.error("Errore reverse geocoding:", err)
                }
              }}
            />
          </div>

          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
        <DialogFooter>
          <Button disabled={!nome || !userId || loading} onClick={handleSave}>
            {loading ? "Caricamento..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

  