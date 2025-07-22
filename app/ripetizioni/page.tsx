"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import NavbarAuth from "@/components/NavbarAuth";
import toast from "react-hot-toast";
import Link from "next/link";

type Ripetizione = {
  id: string;
  materia: string;
  descrizione: string;
  prezzo_ora: number;
  in_presenza: boolean;
  distanza_km?: number;
  citta?: string;
  nome_offerente: string;
  email_offerente: string;
  livello: string;
  online: boolean;
  latitudine?: number;
  longitudine?: number;
  utenti?: { nome?: string; email?: string };
};

// Mappa materia -> icona (emoji, si può sostituire con SVG se preferito)
const materiaIcone: Record<string, string> = {
  "Matematica": "📐",
  "Fisica": "🧲",
  "Inglese": "🇬🇧",
  "Italiano": "🇮🇹",
  "Storia": "📜",
  "Filosofia": "🤔",
  "Chimica": "⚗️",
  "Biologia": "🧬",
  "Informatica": "💻",
  "Latino": "🏛️",
  "Greco": "🏺",
  "Francese": "🇫🇷",
  "Spagnolo": "🇪🇸",
  "Altro": "❓"
};

const MATERIE = [
  "Matematica",
  "Fisica",
  "Inglese",
  "Italiano",
  "Storia",
  "Filosofia",
  "Chimica",
  "Biologia",
  "Informatica",
  "Latino",
  "Greco",
  "Francese",
  "Spagnolo",
  "Altro",
];

const LIVELLI = [
  "Elementari",
  "Medie",
  "Superiori",
  "Università",
];

// Definisci il tipo Prenotazione

export default function RipetizioniPage() {
  const [ripetizioni, setRipetizioni] = useState<Ripetizione[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [materia, setMateria] = useState("");
  const [livello, setLivello] = useState("");
  const [inPresenza, setInPresenza] = useState(false);
  const [online, setOnline] = useState(false);
  const [maxDistanza, setMaxDistanza] = useState<number | "">("");
  const [citta, setCitta] = useState("");
  const [prezzoMax, setPrezzoMax] = useState<number | "">("");
  const [search, setSearch] = useState("");

  // Per aggiungere una nuova ripetizione
  const [showForm, setShowForm] = useState(false);
  // Aggiorna il form di creazione ripetizione
  const [form, setForm] = useState({
    materia: "",
    descrizione: "",
    prezzo_ora: "",
    online: false,
    in_presenza: false,
    citta: "",
  });
  const [saving, setSaving] = useState(false);

  // Stato per la prenotazione
  const [showPrenota, setShowPrenota] = useState<string | null>(null); // id ripetizione
  const [orarioRichiesto, setOrarioRichiesto] = useState("");
  const [messaggioPrenota, setMessaggioPrenota] = useState("");
  const [prenotando, setPrenotando] = useState(false);

  // Stato per coordinate GPS
  const [coords, setCoords] = useState<{ lat: number, lon: number } | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number, lon: number } | null>(null);
  const [filtroVicino, setFiltroVicino] = useState(false);
  const [maxDistanzaKm, setMaxDistanzaKm] = useState(10);

  useEffect(() => {
    fetchRipetizioni();
    fetchMieRipetizioni();
  }, []);

  async function fetchRipetizioni() {
    setLoading(true);
    // Recupera anche i dati del tutor tramite join
    const { data, error } = await supabase
      .from("ripetizioni")
      .select("*,utenti:tutor_id(nome,email)")
      .order("id", { ascending: false });
    if (!error && data) {
      // Mappa i dati per includere nome_offerente ed email_offerente
      const ripetizioniConTutor = data.map((r: { utenti?: { nome?: string; email?: string } } & Omit<Ripetizione, "nome_offerente" | "email_offerente">) => ({
        ...r,
        nome_offerente: r.utenti?.nome || "",
        email_offerente: r.utenti?.email || ""
      }));
      setRipetizioni(ripetizioniConTutor);
    }
    setLoading(false);
  }

  // Funzione non più usata in questa pagina
  async function fetchMieRipetizioni() {}

  function filtraRipetizioni(r: Ripetizione) {
    if (materia && r.materia !== materia) return false;
    if (livello && r.livello !== livello) return false;
    if (inPresenza && !r.in_presenza) return false;
    if (online && !r.online) return false;
    if (citta && r.citta?.toLowerCase() !== citta.toLowerCase()) return false;
    if (maxDistanza !== "" && r.distanza_km !== undefined && r.distanza_km > Number(maxDistanza)) return false;
    if (prezzoMax !== "" && r.prezzo_ora !== undefined && r.prezzo_ora > Number(prezzoMax)) return false;
    if (search && !(
      r.materia.toLowerCase().includes(search.toLowerCase()) ||
      r.descrizione.toLowerCase().includes(search.toLowerCase()) ||
      r.nome_offerente.toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  }

  function getLocation(setter: (c: { lat: number, lon: number }) => void) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setter({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => toast.error("Autorizzazione posizione negata o errore."),
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocalizzazione non supportata dal browser");
    }
  }

  async function handleAggiungiRipetizione(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Devi essere loggato per offrire ripetizioni.");
      setSaving(false);
      return;
    }
    const nuovaRipetizione = {
      tutor_id: user.id,
      materia: form.materia,
      descrizione: form.descrizione,
      prezzo_ora: form.prezzo_ora ? Number(form.prezzo_ora) : null,
      disponibile: true,
      online: form.online,
      in_presenza: form.in_presenza,
      citta: form.in_presenza ? form.citta : null,
      latitudine: form.in_presenza ? coords?.lat ?? null : null,
      longitudine: form.in_presenza ? coords?.lon ?? null : null,
    };
    const { error } = await supabase.from("ripetizioni").insert([nuovaRipetizione]);
    setSaving(false);
    if (error) {
      toast.error("Errore durante l'inserimento.");
    } else {
      setShowForm(false);
      setForm({ materia: "", descrizione: "", prezzo_ora: "", online: false, in_presenza: false, citta: "" });
      setCoords(null);
      fetchRipetizioni();
    }
  }

  // Funzione per prenotare una ripetizione
  async function handlePrenotaRipetizione(e: React.FormEvent) {
    e.preventDefault();
    setPrenotando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Devi essere loggato per prenotare.");
      setPrenotando(false);
      return;
    }
    if (!orarioRichiesto) {
      toast.error("Scegli un orario richiesto.");
      setPrenotando(false);
      return;
    }
    const { error } = await supabase.from("prenotazioni_ripetizioni").insert([
      {
        ripetizione_id: showPrenota,
        studente_id: user.id,
        orario_richiesto: orarioRichiesto,
        stato: "in attesa",
        messaggio: messaggioPrenota,
      }
    ]);
    setPrenotando(false);
    if (error) {
      toast.error("Errore durante la prenotazione.");
    } else {
      setShowPrenota(null);
      setOrarioRichiesto("");
      setMessaggioPrenota("");
      toast.success("Prenotazione inviata!");
    }
  }



  // Funzione distanza Haversine
  function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Filtra le ripetizioni per distanza se filtroVicino attivo
  const ripetizioniFiltrate = filtroVicino && userCoords
    ? ripetizioni.filter(r =>
        r.in_presenza &&
        typeof r.latitudine === "number" && typeof r.longitudine === "number" &&
        getDistanceKm(userCoords.lat, userCoords.lon, r.latitudine, r.longitudine) <= maxDistanzaKm
      )
    : ripetizioni;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#f1f5f9] to-[#34d399]">
      <NavbarAuth    />
      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-[#1e293b] mb-4 text-center">Ripetizioni</h1>
        <p className="text-center mb-6 text-[#334155]">
          Cerca ripetizioni per materia, livello, modalità e altro. Oppure
          <button className="text-[#f83878] underline font-semibold ml-1" onClick={() => setShowForm(true)}>offri una ripetizione</button>.
          <Link href="/ripetizioni/gestione" className="ml-4 inline-block bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold">Gestisci le tue ripetizioni</Link>
        </p>

        {/* Filtri */}
<div className="bg-white/80 rounded-xl shadow p-4 mb-8">
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-[#1e293b]">Materia</label>
      <select className="mt-1 border rounded px-2 py-1 w-full" value={materia} onChange={e => setMateria(e.target.value)}>
        <option value="">Tutte</option>
        {MATERIE.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-[#1e293b]">Livello</label>
      <select className="mt-1 border rounded px-2 py-1 w-full" value={livello} onChange={e => setLivello(e.target.value)}>
        <option value="">Tutti</option>
        {LIVELLI.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
    </div>
    <div className="flex items-center gap-2 mt-6">
      <label className="text-sm font-medium text-[#1e293b]">In presenza</label>
      <input type="checkbox" checked={inPresenza} onChange={e => setInPresenza(e.target.checked)} />
    </div>
    <div className="flex items-center gap-2 mt-6">
      <label className="text-sm font-medium text-[#1e293b]">Online</label>
      <input type="checkbox" checked={online} onChange={e => setOnline(e.target.checked)} />
    </div>
    <div>
      <label className="block text-sm font-medium text-[#1e293b]">Città</label>
      <input type="text" className="mt-1 border rounded px-2 py-1 w-full" value={citta} onChange={e => setCitta(e.target.value)} placeholder="Es. Milano" />
    </div>
    <div>
      <label className="block text-sm font-medium text-[#1e293b]">Distanza max (km)</label>
      <input type="number" min={0} className="mt-1 border rounded px-2 py-1 w-full" value={maxDistanza} onChange={e => setMaxDistanza(e.target.value ? Number(e.target.value) : "")} />
    </div>
    <div>
      <label className="block text-sm font-medium text-[#1e293b]">Prezzo max (€)</label>
      <input type="number" min={0} className="mt-1 border rounded px-2 py-1 w-full" value={prezzoMax} onChange={e => setPrezzoMax(e.target.value ? Number(e.target.value) : "")} />
    </div>
    <div className="sm:col-span-2 md:col-span-3">
      <label className="block text-sm font-medium text-[#1e293b]">Cerca</label>
      <input type="text" className="mt-1 border rounded px-2 py-1 w-full" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome, materia..." />
    </div>
  </div>

  {/* Sezione posizione */}
  <div className="mt-6 border-t pt-4">
    <div className="flex flex-col md:flex-row md:items-end gap-4">
      <button
        className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold w-full md:w-auto"
        onClick={() => getLocation(setUserCoords)}
        type="button"
      >
        Trova ripetizioni vicine a me
      </button>

      {userCoords && (
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={maxDistanzaKm}
              onChange={e => setMaxDistanzaKm(Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
            <span className="text-sm">km</span>
          </div>
          <button
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              filtroVicino
                ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
                : "bg-[#16a34a] text-white hover:bg-[#0ea5e9]"
            }`}
            onClick={() => setFiltroVicino(v => !v)}
            type="button"
          >
            {filtroVicino ? "Mostra tutte" : "Filtra per distanza"}
          </button>
        </div>
      )}
    </div>
  </div>
</div>


        {/* Lista ripetizioni */}
        {loading ? (
          <div className="text-center text-lg py-12">Caricamento...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ripetizioniFiltrate.filter(filtraRipetizioni).length === 0 ? (
              <div className="col-span-2 text-center text-[#64748b]">Nessuna ripetizione trovata con questi filtri.</div>
            ) : (
              ripetizioniFiltrate.filter(filtraRipetizioni).map(r => (
                <div key={r.id} className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 border border-[#e0e7ef]">
                  
                  <div className="text-lg font-bold text-[#38bdf8] flex items-center gap-2">
                    <span>{materiaIcone[r.materia] || "❓"}</span>
                    <span>{r.materia}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#1e293b]">{r.nome_offerente}</span>
                  </div>
                  <div className="text-sm text-[#334155]">{r.livello}</div>
                  <div className="text-[#64748b]">{r.descrizione}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.online && <span className="bg-[#38bdf8]/20 text-[#0369a1] px-2 py-1 rounded text-xs">Online</span>}
                    {r.in_presenza && <span className="bg-[#fbbf24]/30 text-[#b45309] px-2 py-1 rounded text-xs">In presenza{r.citta ? ` (${r.citta})` : ""}
                      {userCoords && typeof r.latitudine === "number" && typeof r.longitudine === "number" && (
                        <span className="ml-2 text-xs text-[#64748b]">{getDistanceKm(userCoords.lat, userCoords.lon, r.latitudine, r.longitudine).toFixed(1)} km</span>
                      )}
                    </span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-semibold text-[#16a34a]">{r.prezzo_ora}€ / ora</span>
                    <button
                      className="bg-[#38bdf8] text-white px-3 py-1 rounded hover:bg-[#0ea5e9] transition text-sm font-medium"
                      onClick={() => setShowPrenota(r.id)}
                    >
                      Prenota
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Form per offrire ripetizione */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
              <button className="absolute top-2 right-3 text-2xl text-[#64748b] hover:text-[#fb7185]" onClick={() => setShowForm(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-[#1e293b]">Offri una ripetizione</h2>
              <form className="flex flex-col gap-4" onSubmit={handleAggiungiRipetizione}>
                <div>
                  <label className="block text-sm font-medium text-[#1e293b]">Materia</label>
                  <input required className="mt-1 border rounded px-2 py-1 w-full" value={form.materia} onChange={e => setForm(f => ({ ...f, materia: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1e293b]">Descrizione</label>
                  <textarea className="mt-1 border rounded px-2 py-1 w-full" value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1e293b]">Prezzo (€ / ora)</label>
                  <input required type="number" min={0} className="mt-1 border rounded px-2 py-1 w-full" value={form.prezzo_ora} onChange={e => setForm(f => ({ ...f, prezzo_ora: e.target.value }))} />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.online} onChange={e => setForm(f => ({ ...f, online: e.target.checked }))} />
                    Online
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.in_presenza} onChange={e => setForm(f => ({ ...f, in_presenza: e.target.checked }))} />
                    In presenza
                  </label>
                </div>
                {form.in_presenza && (
                  <>
                    <button type="button" onClick={() => getLocation(setCoords)} className="text-[#38bdf8] underline mb-2">Usa la mia posizione</button>
                    {coords && <div className="text-xs">Lat: {coords.lat}, Lon: {coords.lon}</div>}
                    <div>
                      <label className="block text-sm font-medium text-[#1e293b]">Città</label>
                      <input type="text" className="mt-1 border rounded px-2 py-1 w-full" value={form.citta} onChange={e => setForm(f => ({ ...f, citta: e.target.value }))} required={form.in_presenza} />
                    </div>
                  </>
                )}
                <button type="submit" className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold" disabled={saving}>
                  {saving ? "Salvataggio..." : "Aggiungi ripetizione"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal prenotazione */}
        {showPrenota && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
              <button className="absolute top-2 right-3 text-2xl text-[#64748b] hover:text-[#fb7185]" onClick={() => setShowPrenota(null)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-[#1e293b]">Prenota ripetizione</h2>
              <form className="flex flex-col gap-4" onSubmit={handlePrenotaRipetizione}>
                <div>
                  <label className="block text-sm font-medium text-[#1e293b]">Orario richiesto</label>
                  <input
                    type="datetime-local"
                    className="mt-1 border rounded px-2 py-1 w-full"
                    value={orarioRichiesto}
                    onChange={e => setOrarioRichiesto(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1e293b]">Messaggio (opzionale)</label>
                  <textarea
                    className="mt-1 border rounded px-2 py-1 w-full"
                    value={messaggioPrenota}
                    onChange={e => setMessaggioPrenota(e.target.value)}
                    placeholder="Scrivi un messaggio per il tutor..."
                  />
                </div>
                <button type="submit" className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold" disabled={prenotando}>
                  {prenotando ? "Prenotazione..." : "Invia prenotazione"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Rimuovi la sezione 'Le mie ripetizioni' e la gestione prenotazioni proprie dalla pagina principale */}
      </main>
    </div>
  );
}
