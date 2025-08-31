"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "react-hot-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Ambassador = {
  id: string
  nome: string
  email: string
  ambassador_code: string | null
  vendite_totali: number
}

type User = {
  id: string
  nome: string
  email: string
}

export default function AmbassadorManager() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedUserId, setSelectedUserId] = useState("")
  const [codice, setCodice] = useState("")
  const [scontoPercentuale, setScontoPercentuale] = useState("")
  const [scontoImporto, setScontoImporto] = useState("")

  useEffect(() => {
    fetchAmbassadors()
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const { data, error } = await supabase.from("utenti").select("id, nome, email").not("is_ambassador", "eq", true)
    if (error) return console.error(error)
    setUsers(data || [])
  }

  async function fetchAmbassadors() {
    setLoading(true);
  
    try {
      // prendo tutti gli utenti ambassador con i loro codici
      const { data: utenti, error: utentiError } = await supabase
        .from("utenti")
        .select(`
          id,
          nome,
          email,
          codici_ambassador(codice)
        `)
        .eq("is_ambassador", true);
  
      if (utentiError) throw utentiError;
  
      const results: Ambassador[] = [];
  
      for (const u of utenti) {
        const codice = u.codici_ambassador?.[0]?.codice;
        if (!codice) continue;
  
        // prendo gli abbonamenti che hanno usato il codice dell'ambassador
        const { data: abbonamenti, error: abbonamentiError } = await supabase
          .from("abbonamenti")
          .select("id, piani_abbonamento(prezzo)")
          .eq("ambassador_code", codice);
  
        if (abbonamentiError) {
          console.error(abbonamentiError);
          continue;
        }
  
        if (!abbonamenti || abbonamenti.length === 0) {
          results.push({
            id: u.id,
            nome: u.nome,
            email: u.email,
            ambassador_code: codice,
            vendite_totali: 0,
          });
          continue;
        }
  
        // calcolo la commissione totale in base al prezzo di ogni piano
        function commissionFromPrice(prezzo: number) {
          if (prezzo === 4.99) return 1.25; // Plus scontato
          if (prezzo === 7.99) return 2.00; // Elite scontato
          return 0;
        }
  
        const totale = abbonamenti.reduce((sum, abbonamento) => {
          const piani = abbonamento.piani_abbonamento as { prezzo: number } | { prezzo: number }[] | null;

      
          if (!piani) return sum;
  
          if (Array.isArray(piani)) {
            return sum + piani.reduce((s, p) => s + commissionFromPrice(p.prezzo), 0);
          }
          return sum + commissionFromPrice(piani.prezzo);
        }, 0);
      
  
        results.push({
          id: u.id,
          nome: u.nome,
          email: u.email,
          ambassador_code: codice,
          vendite_totali: totale,
        });
      }
  
      setAmbassadors(results);
    } catch (err) {
      console.error("Errore fetchAmbassadors:", err);
    } finally {
      setLoading(false);
    }
  }
  

  async function addAmbassador() {
    if (!selectedUserId || !codice) {
      toast.error("Seleziona utente e inserisci codice")
      return
    }

    try {
      const selectedUser = users.find(u => u.id === selectedUserId)
      if (!selectedUser) throw new Error("Utente non trovato")

      const res = await fetch("/api/admin/ambassador/promocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedUser.email,
          codice,
          sconto_percentuale: scontoPercentuale || null,
          sconto_importo: scontoImporto || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore API")

      toast.success("Nuovo ambassador aggiunto")
      setSelectedUserId("")
      setCodice("")
      setScontoPercentuale("")
      setScontoImporto("")
      fetchAmbassadors()
      fetchUsers() // aggiorna lista utenti non ambassador
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
      else toast.error("Errore sconosciuto")
    }
  }

  async function deleteAmbassador(id: string, codice: string) {
    try {
      await supabase.from("codici_ambassador").delete().eq("codice", codice)
      await supabase.from("utenti").update({ is_ambassador: false }).eq("id", id)
      toast.success("Ambassador eliminato")
      fetchAmbassadors()
      fetchUsers()
    } catch  {
      toast.error("Errore eliminazione")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ambassador</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Caricamento...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Codice</TableHead>
                  <TableHead>Guadagni Totali (€)</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ambassadors.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.nome}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.ambassador_code || "-"}</TableCell>
                    <TableCell>{a.vendite_totali.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAmbassador(a.id, a.ambassador_code!)}
                      >
                        Elimina
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button>Aggiungi Ambassador</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Ambassador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleziona utente</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona utente" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} - {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Codice sconto</Label>
              <Input value={codice} onChange={(e) => setCodice(e.target.value)} />
            </div>
            <div>
              <Label>Sconto %</Label>
              <Input
                type="number"
                value={scontoPercentuale}
                onChange={(e) => setScontoPercentuale(e.target.value)}
              />
            </div>
            <div>
              <Label>Sconto importo (€)</Label>
              <Input
                type="number"
                value={scontoImporto}
                onChange={(e) => setScontoImporto(e.target.value)}
              />
            </div>
            <Button onClick={addAmbassador}>Conferma</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
