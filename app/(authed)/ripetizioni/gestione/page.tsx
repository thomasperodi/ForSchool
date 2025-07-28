

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Ripetizione = {
  id: string;
  materia: string;
  data: string;
  ora: string;
  stato: string;
  studente_id: string;
  docente_id: string;
  prenotato_da?: string;
  descrizione?: string;
  prezzo_ora: number;
  disponibile: boolean;

};
type FiltroPrenotazione = 'attive' | 'tutte' | 'completate' | 'annullate';

type Utente = {
  id: string;
  nome: string;
  ruolo: string;
  email: string;
};

// Nuovi tipi
interface Prenotazione {
  id: string;
  ripetizione_id: string;
  studente_id: string;
  orario_richiesto: string;
  stato: string;
  messaggio?: string;
  data_prenotazione?: string;
  studente?: { nome?: string; email?: string };
  ripetizione?: { materia: string; tutor_id: string };
}
interface RipetizioneGestita {
  id: string;
  materia: string;
  descrizione?: string;
  prezzo_ora?: number;
  disponibile?: boolean;
  data_pubblicazione?: string;
}

const statiDisponibili = [
  { label: "Tutte", value: "tutte" },
  { label: "In attesa", value: "in attesa" },
  { label: "Accettate", value: "accettata" },
  { label: "Annullate", value: "annullata" },
  { label: "Rifiutate", value: "rifiutata" },
  { label: "Completate", value: "completata" },
  { label: "Pagate", value: "pagata" },
];

export default function GestioneRipetizioni() {
  const [user, setUser] = useState<Utente | null>(null);
  const [loading, setLoading] = useState(true);
  // const [ripetizioniCreate, setRipetizioniCreate] = useState<Ripetizione[]>([]);
  // const [ripetizioniPrenotate, setRipetizioniPrenotate] = useState<Ripetizione[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Ripetizione>>({});
  const [mieRipetizioni, setMieRipetizioni] = useState<RipetizioneGestita[]>([]);
  const [prenotazioniRicevute, setPrenotazioniRicevute] = useState<Record<string, Prenotazione[]>>({});
  const [miePrenotazioni, setMiePrenotazioni] = useState<Prenotazione[]>([]);
  // Stato filtro prenotazioni
  const [filtroPren, setFiltroPren] = useState<FiltroPrenotazione>('attive');
  // Stato per dialog di modifica
  const [showEditDialog, setShowEditDialog] = useState(false);
  // Stato per dialog di cancellazione
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [CancelId, setCancelId] = useState<string | null>(null);

  const router = useRouter();

const [prenotazioniPage, setPrenotazioniPage] = useState(1);
const prenotazioniPageSize = 5;
const [hasMorePrenotazioni, setHasMorePrenotazioni] = useState(true);
const [filtroStato, setFiltroStato] = useState("tutte");


const prenotazioniFiltrate = miePrenotazioni.filter(p => {
    if (filtroStato === "tutte") return true;

    // mappa semplificata per mappare "in_attesa" al valore corretto nello stato prenotazione
    if (filtroStato === "in_attesa") return p.stato === "in_attesa";

    return p.stato === filtroStato;
  });
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      // Recupera utente loggato
      const { data: { user: supaUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !supaUser) {
        toast.error("Utente non autenticato");
        router.push("/login");
        return;
      }
      // Recupera dati utente dal DB
      const { data: utente, error: utenteError } = await supabase
        .from("utenti")
        .select("id, nome, ruolo, email")
        .eq("id", supaUser.id)
        .single();
      if (utenteError || !utente) {
        toast.error("Errore nel recupero dati utente");
        router.push("/login");
        return;
      }
      setUser(utente);
      // Ripetizioni create da me
      const { data: ripCreate } = await supabase
        .from("ripetizioni")
        .select("*")
        .eq("tutor_id", utente.id)
        .order("data_pubblicazione", { ascending: false });
      setMieRipetizioni(ripCreate || []);
      // Prenotazioni ricevute per ogni ripetizione
      const prenotazioniObj: Record<string, Prenotazione[]> = {};
      for (const r of ripCreate || []) {
        const { data: pren } = await supabase
          .from("prenotazioni_ripetizioni")
          .select("*, studente:studente_id(nome, email)")
          .eq("ripetizione_id", r.id)
          .order("data_prenotazione", { ascending: false });
        prenotazioniObj[r.id] = pren || [];
      }
      setPrenotazioniRicevute(prenotazioniObj);
      // Prenotazioni fatte da me
      await loadMiePrenotazioni(utente.id, 1); // carica la prima pagina
      setLoading(false);
    };
    fetchAll();
  }, [router]);

const loadMiePrenotazioni = async (utenteId: string, page: number) => {
  const from = (page - 1) * prenotazioniPageSize;
  const to = from + prenotazioniPageSize - 1;

  const { data, count, error } = await supabase
    .from("prenotazioni_ripetizioni")
    .select("*, ripetizione:ripetizione_id(materia, tutor_id)", { count: "exact" })
    .eq("studente_id", utenteId)
    .order("data_prenotazione", { ascending: false })
    .range(from, to);

  if (!error && data) {
    setMiePrenotazioni(prev => {
      const ids = new Set(prev.map(p => p.id));
      const newItems = data.filter(p => !ids.has(p.id));
      return [...prev, ...newItems];
    });
    setHasMorePrenotazioni((page * prenotazioniPageSize) < (count ?? 0));
    setPrenotazioniPage(page + 1);  // incrementa la pagina **qui**
  }
};


  // Modifica ripetizione
  const handleEdit = (rip: Partial<Ripetizione>) => {
    setEditingId(rip.id!);
    setEditData({
      materia: rip.materia ?? "",
      descrizione: rip.descrizione ?? "",
      prezzo_ora: rip.prezzo_ora ?? 0,
      disponibile: rip.disponibile ?? true,
    });
    setShowEditDialog(true);
  };

  // const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  //   setEditData({ ...editData, [e.target.name]: e.target.value });
  // };

  // const handleEditSubmit = async (id: string) => {
  //   const { error } = await supabase
  //     .from("ripetizioni")
  //     .update({
  //       materia: editData.materia,
  //       data: editData.data,
  //       ora: editData.ora,
  //       stato: editData.stato,
  //     })
  //     .eq("id", id);

  //   if (error) {
  //     toast.error("Errore durante la modifica");
  //   } else {
  //     toast.success("Ripetizione aggiornata");
  //     setEditingId(null);
  //     // Aggiorna lista
  //     const aggiorna = await supabase
  //       .from("ripetizioni")
  //       .select("*")
  //       .eq("docente_id", user?.id)
  //       .order("data", { ascending: false });
  //     setRipetizioniCreate(aggiorna.data || []);
  //   }
  // };

  // // Cancella ripetizione
  // const handleDelete = async (id: string) => {
  //   if (!confirm("Sei sicuro di voler cancellare questa ripetizio")) return;
  //   const { error } = await supabase
  //     .from("ripetizioni")
  //     .delete()
  //     .eq("id", id);

  //   if (error) {
  //     toast.error("Errore durante la cancellazione");
  //   } else {
  //     toast.success("Ripetizione cancellata");
  //     setRipetizioniCreate(ripetizioniCreate.filter(r => r.id !== id));
  //   }
  // };

  // // Aggiorna stato ripetizione (es: completata, annullata)
  // const handleStato = async (id: string, nuovoStato: string) => {
  //   const { error } = await supabase
  //     .from("ripetizioni")
  //     .update({ stato: nuovoStato })
  //     .eq("id", id);

  //   if (error) {
  //     toast.error("Errore nell'aggiornamento dello stato");
  //   } else {
  //     toast.success("Stato aggiornato");
  //     setRipetizioniCreate(ripetizioniCreate.map(r =>
  //       r.id === id ? { ...r, stato: nuovoStato } : r
  //     ));
  //   }
  // };

  // Annulla prenotazione (per studente)
  const handleCancelPrenotazione = async (id: string) => {
    const { error } = await supabase
      .from("prenotazioni_ripetizioni")
      .update({ stato: "annullata" })
      .eq("id", id);

    if (error) {
      toast.error("Errore durante l'annullamento");
    } else {
      toast.success("Prenotazione annullata");
      setMiePrenotazioni(miePrenotazioni.map(p => p.id === id ? { ...p, stato: "annullata" } : p));
    }
  };

  // Gestione stato prenotazione ricevuta
  async function aggiornaStatoPrenotazione(prenotazioneId: string, nuovoStato: string) {
    const { error } = await supabase
      .from("prenotazioni_ripetizioni")
      .update({ stato: nuovoStato })
      .eq("id", prenotazioneId);
    if (error) {
      toast.error("Errore durante l'aggiornamento dello stato.");
    } else {
      toast.success("Stato aggiornato");
      // Aggiorna lista
      setPrenotazioniRicevute({}); // forza refetch
      router.refresh?.();
    }
  }

  // Funzione per eliminare una ripetizione
  async function handleDeleteRipetizione(id: string) {
    
    const { error } = await supabase
      .from("ripetizioni")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Errore durante la cancellazione");
    } else {
      toast.success("Ripetizione cancellata");
      setMieRipetizioni(mieRipetizioni.filter(r => r.id !== id));
    }
  }

  async function handleEditSubmitDialog() {
    if (!editingId) return;
    const { error } = await supabase
      .from("ripetizioni")
      .update({
        materia: editData.materia,
        descrizione: editData.descrizione,
        prezzo_ora: editData.prezzo_ora,
        disponibile: editData.disponibile,
      })
      .eq("id", editingId);
    if (error) {
      toast.error("Errore durante la modifica");
    } else {
      toast.success("Ripetizione aggiornata");
      setShowEditDialog(false);
      setEditingId(null);
      setEditData({});
      // Aggiorna lista
      const aggiorna = await supabase
        .from("ripetizioni")
        .select("*")
        .eq("tutor_id", user?.id)
        .order("data_pubblicazione", { ascending: false });
      setMieRipetizioni(aggiorna.data || []);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Caricamento ripetizioni...
      </div>
    );
  }
  if (!user) return <div>Caricamento...</div>;


  return (
    <>
    <main className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1e293b] mb-6 text-center">
          Gestione ripetizioni
          
        </h1>
        <p className="text-center mb-6 text-[#334155]">
          <Link href="/ripetizioni" className="ml-4 inline-block bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold">Prenota una ripetizione</Link>
        </p>
        
        {/* Sezione 1: Le mie ripetizioni */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Le mie ripetizioni</h2>
          <div className="mb-2 flex gap-2 items-center">
            <span className="text-sm">Filtra prenotazioni:</span>
            <select className="border rounded px-2 py-1" value={filtroPren} onChange={e => setFiltroPren(e.target.value as FiltroPrenotazione )}>
              <option value="attive">Solo attive</option>
              <option value="tutte">Tutte</option>
              <option value="completate">Completate</option>
              <option value="annullate">Annullate</option>
            </select>
          </div>
            
          {mieRipetizioni.length === 0 ? (
            <div className="text-[#64748b]">Nessuna ripetizione creata.</div>
          ) : (
            <div className="space-y-4">
              {mieRipetizioni.map(rip => (
                <div key={rip.id} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold">{rip.materia}</div>
                    <div className="flex gap-2">
                      <button
                        title="Modifica"
                        onClick={() => handleEdit(rip)}
                        className="p-1 hover:bg-[#e0e7ef] rounded"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
  title="Elimina" 
  onClick={() => {
    setDeleteId(rip.id);
    setOpenDeleteDialog(true);
  }} 
  className="p-1 hover:bg-[#fee2e2] rounded"
>
  <Trash size={18} color="#ef4444" />
</button>
                    </div>
                  </div>
                  <div className="text-sm text-[#64748b]">{rip.descrizione}</div>
                  <div className="text-sm">Prezzo: {rip.prezzo_ora}€</div>
                  <div className="text-xs text-[#64748b]">Pubblicata il: {rip.data_pubblicazione ? new Date(rip.data_pubblicazione).toLocaleString() : "-"}</div>
                  {/* Prenotazioni ricevute */}
                  <div className="mt-2">
                    <div className="font-bold text-[#1e293b] mb-1">Prenotazioni ricevute</div>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {(prenotazioniRicevute[rip.id] || []).filter((p: Prenotazione) => {
                        if (filtroPren === 'attive') return p.stato !== 'completata' && p.stato !== 'annullata';
                        if (filtroPren === 'completate') return p.stato === 'completata';
                        if (filtroPren === 'annullate') return p.stato === 'annullata';
                        return true;
                      }).length === 0 ? (
                        <div className="text-[#64748b] text-sm">Nessuna prenotazione.</div>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {prenotazioniRicevute[rip.id]
                            .filter((p: Prenotazione) => {
                              if (filtroPren === 'attive') return p.stato !== 'completata' && p.stato !== 'annullata';
                              if (filtroPren === 'completate') return p.stato === 'completata';
                              if (filtroPren === 'annullate') return p.stato === 'annullata';
                              return true;
                            })
                            .map((p: Prenotazione) => (
                              <li key={p.id} className="border rounded p-2 flex flex-col gap-1 bg-[#f1f5f9]">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{p.studente?.nome || p.studente?.email || "Studente"}</span>
                                  <span className="text-xs text-[#64748b]">{new Date(p.orario_richiesto).toLocaleString()}</span>
                                </div>
                                <div className="text-sm">{p.messaggio}</div>
                                <div className="flex gap-2 items-center mt-1">
                                  <span className="text-xs px-2 py-1 rounded bg-[#e0e7ef]">{p.stato}</span>
                                  {p.stato === "in attesa" && (
                                    <>
                                      <Button className="bg-[#16a34a] text-white" onClick={() => aggiornaStatoPrenotazione(p.id, "accettata")}>Accetta</Button>
                                      <Button className="bg-[#fb7185] text-white" onClick={() => aggiornaStatoPrenotazione(p.id, "rifiutata")}>Rifiuta</Button>
                                    </>
                                  )}
                                  {p.stato === "accettata" && (
                                    <Button className="bg-[#fbbf24] text-[#1e293b]" onClick={() => aggiornaStatoPrenotazione(p.id, "completata")}>Completa</Button>
                                  )}
                                  {p.stato !== "annullata" && p.stato !== "completata" && (
                                    <Button className="bg-[#64748b] text-white" onClick={() => aggiornaStatoPrenotazione(p.id, "annullata")}>Annulla</Button>
                                  )}
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </section>
        {/* Sezione 2: Ripetizioni che ho prenotato */}
        <section>
      <h2 className="text-xl font-semibold mb-4">Ripetizioni che ho prenotato</h2>

      {/* Filtro */}
      <div className="mb-4">
        <label htmlFor="filtroStato" className="mr-2 font-medium">
          Filtra per stato:
        </label>
        <select
          id="filtroStato"
          value={filtroStato}
          onChange={(e) => setFiltroStato(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {statiDisponibili.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {prenotazioniFiltrate.length === 0 ? (
        <div className="text-[#64748b]">Nessuna ripetizione prenotata.</div>
      ) : (
        <div className="space-y-4">
          {prenotazioniFiltrate.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
              <div className="font-semibold">{p.ripetizione?.materia || "Materia"}</div>
              <div className="text-xs text-[#64748b]">
                Orario richiesto: {new Date(p.orario_richiesto).toLocaleString()}
              </div>
              <div className="text-sm">
                Stato: <span className="font-medium">{p.stato}</span>
              </div>
              <div className="flex gap-2 mt-2">
                {p.stato !== "annullata" && p.stato !== "completata" && (
                  <Button
                    variant={"destructive"}
                    title="Elimina"
                    onClick={() => {
                      setCancelId(p.id);
                      setOpenCancelDialog(true);
                    }}
                    className="p-1 hover:bg-[#fee2e2] rounded"
                  >
                    Annulla prenotazione
                  </Button>
                )}
              </div>
            </div>
          ))}

          {hasMorePrenotazioni && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => loadMiePrenotazioni(user.id, prenotazioniPage)}
              >
                Carica altre prenotazioni
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
      </main>
      {/* Dialog di modifica */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica ripetizione</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEditSubmitDialog(); }} className="flex flex-col gap-4 mt-2">
            <label className="text-[#1e293b] font-medium">
              Materia
              <input
                type="text"
                className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
                value={editData.materia || ""}
                onChange={e => setEditData(ed => ({ ...ed, materia: e.target.value }))}
                required
              />
            </label>
            <label className="text-[#1e293b] font-medium">
              Descrizione
              <textarea
                className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
                value={editData.descrizione || ""}
                onChange={e => setEditData(ed => ({ ...ed, descrizione: e.target.value }))}
              />
            </label>
            <label className="text-[#1e293b] font-medium">
              Prezzo (€ / ora)
              <input
                type="number"
                min={0}
                className="mt-1 px-3 py-2 rounded-md border bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] text-[#1e293b] w-full"
                value={editData.prezzo_ora ?? 0}
                onChange={e => setEditData(ed => ({ ...ed, prezzo_ora: Number(e.target.value) }))}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-[#1e293b] font-medium">
              <input
                type="checkbox"
                checked={editData.disponibile ?? true}
                onChange={e => setEditData(ed => ({ ...ed, disponibile: e.target.checked }))}
              />
              Disponibile
            </label>
            <DialogFooter>
              <button type="submit" className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold">Salva modifiche</button>
              <button type="button" className="bg-[#f87171] text-white px-4 py-2 rounded hover:bg-[#fb7185] transition font-semibold" onClick={() => setShowEditDialog(false)}>Annulla</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
      <AlertDialogDescription>
        Sei sicuro di voler eliminare questa ripetizione? Questa azione non può essere annullata.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setOpenDeleteDialog(false)}>Annulla</AlertDialogCancel>
      <AlertDialogAction
      className="bg-[#f02e2e] text-white"
        onClick={async () => {
          if (deleteId) {
            await handleDeleteRipetizione(deleteId);
            setOpenDeleteDialog(false);
            setDeleteId(null);
          }
        }}
      >
        Elimina
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

<ConfirmDialog
  open={openCancelDialog}
  onOpenChange={setOpenCancelDialog}
  title="Annulla Prenotazione"
  description="Sei sicuro di voler annullare questa prenotazione? Questa azione non può essere annullata."
  cancelText="Annulla"
  actionText="Elimina"
  actionClassName="bg-[#f02e2e] text-white"
  onConfirm={async () => {
    if (CancelId) {
      await handleCancelPrenotazione(CancelId)
      setCancelId(null)
    }
  }}
  onCancel={() => {
    setOpenCancelDialog(false)
    setCancelId(null)
  }}
/>
    </>
  );
}
