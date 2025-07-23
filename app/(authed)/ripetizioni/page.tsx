
  // Stato per prenotazioni esistenti
"use client";
  
import dynamic from "next/dynamic";
// Leaflet map component (dynamic import, SSR off)

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import toast from "react-hot-toast";
import Link from "next/link";

// Stato per disponibilità: array di { giorno_settimana, ora_inizio, ora_fine }
type Disponibilita = { giorno_settimana: number; ora_inizio: string; ora_fine: string };

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
  disponibilita?: Disponibilita[];
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



// Definisci il tipo Prenotazione

export default function RipetizioniPage() {
  // Filtri aggiuntivi per disponibilità
  // Stato per mostrare/nascondere filtri avanzati
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtroGiorno, setFiltroGiorno] = useState<string>(""); // formato: 0-6 (giorno settimana)
  const [filtroOrario, setFiltroOrario] = useState<string>(""); // formato: "HH:mm"
  const [ripetizioni, setRipetizioni] = useState<Ripetizione[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [materia, setMateria] = useState("");
  const [inPresenza, setInPresenza] = useState(false);
  const [online, setOnline] = useState(false);
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
  // Stato per disponibilità: array di { giorno_settimana, ora_inizio, ora_fine }
  type Disponibilita = { giorno_settimana: number; ora_inizio: string; ora_fine: string };
  const [disponibilita, setDisponibilita] = useState<Disponibilita[]>([
    // Default: vuoto, l'utente aggiunge
  ]);
  const [saving, setSaving] = useState(false);

  // Stato per la prenotazione e pagamento
  const [showPagamento, setShowPagamento] = useState<Ripetizione | null>(null);
  const [orarioRichiesto, setOrarioRichiesto] = useState("");
  const [pagando, setPagando] = useState(false);

  // Stato per coordinate GPS
  const [coords, setCoords] = useState<{ lat: number, lon: number } | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number, lon: number } | null>(null);


  const [prenotazioni, setPrenotazioni] = useState<{ ripetizione_id: string; data_ora: string }[]>([]);
  // Stato per prenotazioni filtrate della ripetizione selezionata
  const [prenotazioniRipetizione, setPrenotazioniRipetizione] = useState<{ ripetizione_id: string; data_ora: string }[]>([]);


  const MapSelector = dynamic(() => import("@/components/MapSelector"), { ssr: false });
  // Stato per mostrare la mappa
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetchRipetizioni();
    fetchMieRipetizioni();
    fetchPrenotazioni();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggiorna le prenotazioni della ripetizione selezionata
  useEffect(() => {
    if (showPagamento) {
      const filtered = prenotazioni.filter(p => p.ripetizione_id === showPagamento.id);
      setPrenotazioniRipetizione(filtered);
    } else {
      setPrenotazioniRipetizione([]);
    }
  }, [showPagamento, prenotazioni]);

  async function fetchRipetizioni() {
    setLoading(true);
    // Recupera anche i dati del tutor tramite join
    const { data, error } = await supabase
      .from("ripetizioni")
      .select("*,utenti:tutor_id(nome,email),disponibilita:disponibilita_ripetizioni(*)")
      .order("id", { ascending: false });
    if (!error && data) {
      // Mappa i dati per includere nome_offerente, email_offerente e disponibilità
      const ripetizioniConTutor = data.map((r: { utenti?: { nome?: string; email?: string }, disponibilita?: Disponibilita[] } & Omit<Ripetizione, "nome_offerente" | "email_offerente" | "disponibilita">) => ({
        ...r,
        nome_offerente: r.utenti?.nome || "",
        email_offerente: r.utenti?.email || "",
        disponibilita: r.disponibilita || [],
      }));
      setRipetizioni(ripetizioniConTutor);
    }
    setLoading(false);
  }

  // Funzione non più usata in questa pagina
  async function fetchMieRipetizioni() {}

  // Recupera tutte le prenotazioni per disabilitare slot già presi
  async function fetchPrenotazioni() {
    // Recupera solo le prenotazioni con stato 'pagato'
    const { data, error } = await supabase
      .from("prenotazioni_ripetizioni")
      .select("ripetizione_id, orario_richiesto, stato")
      .eq("stato", "pagato");
    if (!error && data) {
      // Adatta i nomi dei campi per compatibilità con la logica esistente
      const prenotazioniPagate = data.map((p: { ripetizione_id: string; orario_richiesto: string; stato: string }) => ({
        ripetizione_id: p.ripetizione_id,
        data_ora: p.orario_richiesto,
        stato: p.stato
      }));
      setPrenotazioni(prenotazioniPagate);
    }
  }

  function filtraRipetizioni(r: Ripetizione) {
    if (materia && r.materia !== materia) return false;
    if (inPresenza && !r.in_presenza) return false;
    if (online && !r.online) return false;
    if (citta && r.citta?.toLowerCase() !== citta.toLowerCase()) return false;
    if (prezzoMax !== "" && r.prezzo_ora !== undefined && r.prezzo_ora > Number(prezzoMax)) return false;
    if (search && !(
      r.materia.toLowerCase().includes(search.toLowerCase()) ||
      r.descrizione.toLowerCase().includes(search.toLowerCase()) ||
      r.nome_offerente.toLowerCase().includes(search.toLowerCase())
    )) return false;
    // Filtro disponibilità: giorno e orario
    if (filtroGiorno !== "" || filtroOrario !== "") {
      const match = r.disponibilita?.some(d => {
        // Se filtro giorno attivo, deve combaciare
        if (filtroGiorno !== "" && String(d.giorno_settimana) !== filtroGiorno) return false;
        // Se filtro orario attivo, deve essere compreso tra ora_inizio e ora_fine
        if (filtroOrario !== "") {
          // accetta "HH:mm" o "HH:mm:ss"
          const inizio = d.ora_inizio.slice(0,5);
          const fine = d.ora_fine.slice(0,5);
          return filtroOrario >= inizio && filtroOrario < fine;
        }
        return true;
      });
      if (!match) return false;
    }
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
    // 1. Verifica se l'utente ha già un account Stripe Express
    let stripeAccountId = null;
    const { data: utente, error: utenteErr } = await supabase
      .from('utenti')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();
    if (utenteErr) {
      toast.error("Errore nel recupero dati utente.");
      setSaving(false);
      return;
    }
    stripeAccountId = utente?.stripe_account_id || null;
    // 2. Se non esiste, crea account Stripe Express tramite API
    if (!stripeAccountId) {
      const res = await fetch('/api/stripe-create-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, email: user.email }) });
      const result = await res.json();
      if (result?.accountId) {
        stripeAccountId = result.accountId;
        // Salva l'accountId su Supabase
        await supabase.from('utenti').update({ stripe_account_id: stripeAccountId }).eq('id', user.id);
      } else {
        toast.error("Errore creazione account Stripe.");
        setSaving(false);
        return;
      }
      // Mostra link onboarding
      if (result?.onboardingUrl) {
        toast("Completa la configurazione dei pagamenti:", { icon: '💳' });
        window.open(result.onboardingUrl, '_blank');
      }
    }
    // 3. Procedi con la creazione della ripetizione
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
    // Inserisci la ripetizione
    const { data, error } = await supabase.from("ripetizioni").insert([nuovaRipetizione]).select();
    if (error || !data || !data[0]?.id) {
      setSaving(false);
      toast.error("Errore durante l'inserimento.");
      return;
    }
    // Inserisci disponibilità se presenti
    if (disponibilita.length > 0) {
      const disponibilitaRows = disponibilita.map(d => ({
        ripetizione_id: data[0].id,
        giorno_settimana: d.giorno_settimana,
        ora_inizio: d.ora_inizio,
        ora_fine: d.ora_fine,
      }));
      const { error: dispError } = await supabase.from("disponibilita_ripetizioni").insert(disponibilitaRows);
      if (dispError) {
        toast.error("Errore nell'inserimento delle disponibilità.");
      }
    }
    setSaving(false);
    setShowForm(false);
    setForm({ materia: "", descrizione: "", prezzo_ora: "", online: false, in_presenza: false, citta: "" });
    setCoords(null);
    setDisponibilita([]);
    fetchRipetizioni();
  }

  // Funzione pagamento Stripe
  async function handlePagamentoStripe(e: React.FormEvent) {
    e.preventDefault();
    setPagando(true);
    try {
      // Recupera l'utente corrente da Supabase
      const { data: { user } } = await supabase.auth.getUser();
      // Calcola il totale con commissione di 1 euro
      const prezzoRipetizione = showPagamento?.prezzo_ora ?? 0;
      const totaleConCommissione = prezzoRipetizione + 1;
      // Chiamata API per creare sessione Stripe
      console.log('Dati inviati a checkout:', {
  ripetizione_id: showPagamento?.id,
  studente_id: user?.id,
  orario_richiesto: orarioRichiesto,
  importo: totaleConCommissione,
  commissione: 1,
});

      const res = await fetch("/api/checkout-ripetizione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ripetizione_id: showPagamento?.id,
          studente_id: user?.id,  // usa l'id dell'utente corrente
          orario_richiesto: orarioRichiesto,
          importo: totaleConCommissione,
          commissione: 1,
        })
      });
      const data = await res.json();
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error("Errore nella creazione della sessione di pagamento.");
        setPagando(false);
      }
    } catch {
      toast.error("Errore di pagamento.");
      setPagando(false);
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

  // Ordina le ripetizioni per distanza se userCoords è presente
  const ripetizioniFiltrate = userCoords
    ? [...ripetizioni].sort((a, b) => {
        // Solo in presenza e con coordinate
        const aHasCoords = a.in_presenza && typeof a.latitudine === "number" && typeof a.longitudine === "number";
        const bHasCoords = b.in_presenza && typeof b.latitudine === "number" && typeof b.longitudine === "number";
        if (!aHasCoords && !bHasCoords) return 0;
        if (!aHasCoords) return 1;
        if (!bHasCoords) return -1;
        const da = getDistanceKm(userCoords.lat, userCoords.lon, a.latitudine!, a.longitudine!);
        const db = getDistanceKm(userCoords.lat, userCoords.lon, b.latitudine!, b.longitudine!);
        return da - db;
      })
    : ripetizioni;

  return (
      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-[#1e293b] mb-4 text-center">Ripetizioni</h1>
        <p className="text-center mb-6 text-[#334155]">
          Cerca ripetizioni per materia, livello, modalità e altro. Oppure
          <button className="text-[#f83878] underline font-semibold ml-1" onClick={() => setShowForm(true)}>offri una ripetizione</button>.
          <Link href="/ripetizioni/gestione" className="ml-4 inline-block bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold">Gestisci le tue ripetizioni</Link>
        </p>

        {/* Bottone filtri avanzati */}
        {/* <div className="flex justify-end mb-2">
          <button
            type="button"
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition border ${showAdvancedFilters ? 'bg-[#38bdf8] text-white border-[#38bdf8]' : 'bg-white text-[#1e293b] border-[#e0e7ef]'}`}
            onClick={() => setShowAdvancedFilters(v => !v)}
            aria-label={showAdvancedFilters ? "Nascondi filtri avanzati" : "Mostra filtri avanzati"}
          >
            <span className="material-icons" style={{ fontSize: 20 }}>
              filter_list
            </span>
            {showAdvancedFilters ? "Filtri avanzati" : "Filtri base"}
          </button>
        </div> */}

        {/* Filtri */}
        <div className="bg-white/80 rounded-xl shadow p-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Materia e cerca sempre visibili */}
            <div>
              <label className="block text-sm font-medium text-[#1e293b]">Materia</label>
              <select className="mt-1 border rounded px-2 py-1 w-full" value={materia} onChange={e => setMateria(e.target.value)}>
                <option value="">Tutte</option>
                {MATERIE.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-sm font-medium text-[#1e293b]">Cerca</label>
              <input type="text" className="mt-1 border rounded px-2 py-1 w-full" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome, materia..." />
            </div>
            {/* Filtro posizione sempre visibile */}
            <div className="sm:col-span-2 md:col-span-3 flex items-center mt-2">
              <button
                className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold w-full md:w-auto"
                onClick={() => getLocation(setUserCoords)}
                type="button"
              >
                Trova ripetizioni vicine a me
              </button>
              {userCoords && (
                <span className="ml-4 text-sm text-[#64748b]">Le ripetizioni più vicine sono mostrate per prime</span>
              )}
            </div>
          </div>

          {/* Bottone filtri avanzati sotto i filtri base */}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition border ${showAdvancedFilters ? 'bg-[#38bdf8] text-white border-[#38bdf8]' : 'bg-white text-[#1e293b] border-[#e0e7ef]'}`}
              onClick={() => setShowAdvancedFilters(v => !v)}
              aria-label={showAdvancedFilters ? "Nascondi filtri avanzati" : "Mostra filtri avanzati"}
            >
              {/* Funnel SVG icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6l-5.6 7.47V19a1 1 0 0 1-1.45.89l-4-2A1 1 0 0 1 9 17v-4.93L3.2 6.6A1 1 0 0 1 3 5Zm3.52 2 5.48 7.3V17.4l2 1V14.3l5.48-7.3H6.52Z"/></svg>
              {showAdvancedFilters ? "Filtri base" : "Filtri Avanzati"}
            </button>
          </div>

          {/* Filtri avanzati, visibili solo se showAdvancedFilters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-[#1e293b]">Giorno richiesto</label>
                <select className="mt-1 border rounded px-2 py-1 w-full" value={filtroGiorno} onChange={e => setFiltroGiorno(e.target.value)}>
                  <option value="">Tutti</option>
                  {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"].map((g, i) => (
                    <option key={i} value={String(i)}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e293b]">Orario richiesto</label>
                <input type="time" className="mt-1 border rounded px-2 py-1 w-full" value={filtroOrario} onChange={e => setFiltroOrario(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={inPresenza} onChange={e => setInPresenza(e.target.checked)} />
                <label className="text-sm font-medium text-[#1e293b]">In presenza</label>
                
                <input type="checkbox" checked={online} onChange={e => setOnline(e.target.checked)} />
                <label className="text-sm font-medium text-[#1e293b]">Online</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e293b]">Città</label>
                <input type="text" className="mt-1 border rounded px-2 py-1 w-full" value={citta} onChange={e => setCitta(e.target.value)} placeholder="Es. Milano" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1e293b]">Prezzo max (€)</label>
                <input type="number" min={0} className="mt-1 border rounded px-2 py-1 w-full" value={prezzoMax} onChange={e => setPrezzoMax(e.target.value ? Number(e.target.value) : "")} />
              </div>
            </div>
          )}
          </div>




        {/* Lista ripetizioni */}
        {/* Lista ripetizioni */}
        {loading ? (
          <div className="text-center text-lg py-12">Caricamento...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ripetizioniFiltrate.filter(filtraRipetizioni).length === 0 ? (
              <div className="col-span-2 text-center text-[#64748b]">Nessuna ripetizione trovata con questi filtri.</div>
            ) : (
              ripetizioniFiltrate.filter(filtraRipetizioni).map(r => (
                <div key={r.id} className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 border border-[#e0e7ef] h-full min-h-[320px]">
                  <div className="text-lg font-bold text-[#38bdf8] flex items-center gap-2">
                    <span>{materiaIcone[r.materia] || "❓"}</span>
                    <span>{r.materia}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#1e293b]">{r.nome_offerente}</span>
                  </div>
                  <div className="text-[#64748b]">{r.descrizione}</div>
                  {/* Visualizza turni di disponibilità */}
                  {r.disponibilita && r.disponibilita.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-[#1e293b] mb-1">Disponibilità:</div>
                      <ul className="text-xs text-[#334155]">
                        {r.disponibilita.map((d, i) => {
                          function formatTime(t: string) {
                            return t.length >= 5 ? t.slice(0,5) : t;
                          }
                          return (
                            <li key={i}>
                              {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"][d.giorno_settimana]}: {formatTime(d.ora_inizio)} - {formatTime(d.ora_fine)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.online && <span className="bg-[#38bdf8]/20 text-[#0369a1] px-2 py-1 rounded text-xs">Online</span>}
                    {r.in_presenza && <span className="bg-[#fbbf24]/30 text-[#b45309] px-2 py-1 rounded text-xs">In presenza{r.citta ? ` (${r.citta})` : ""}
                      {userCoords && typeof r.latitudine === "number" && typeof r.longitudine === "number" && (
                        <span className="ml-2 text-xs text-[#64748b]">{getDistanceKm(userCoords.lat, userCoords.lon, r.latitudine, r.longitudine).toFixed(1)} km</span>
                      )}
                    </span>}
                  </div>
                  <div className="flex-1" />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-semibold text-[#16a34a]">{r.prezzo_ora}€ / ora</span>
                    <button
                      className="bg-[#f83878] text-white px-3 py-1 rounded hover:bg-[#0ea5e9] transition text-sm font-medium"
                      onClick={() => setShowPagamento(r)}
                    >
                      Prenota e paga
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
                  <select required className="mt-1 border rounded px-2 py-1 w-full" value={form.materia} onChange={e => setForm(f => ({ ...f, materia: e.target.value }))}>
                    <option value="">Seleziona materia...</option>
                    {MATERIE.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
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
                    <div className="flex flex-col gap-2 mb-2">
                      <button type="button" onClick={() => getLocation(setCoords)} className="text-[#38bdf8] underline">Usa la mia posizione</button>
                      <button type="button" onClick={() => setShowMap(true)} className="text-[#38bdf8] underline">Seleziona sulla mappa</button>
                      <button type="button" onClick={() => setCoords(null)} className="text-[#64748b] underline">Rimuovi coordinate</button>
                    </div>
                    {coords && <div className="text-xs mb-2">Coordinate selezionate: Lat: {coords.lat}, Lon: {coords.lon}</div>}
                    <div>
                      <label className="block text-sm font-medium text-[#1e293b]">Città</label>
                      <input type="text" className="mt-1 border rounded px-2 py-1 w-full" value={form.citta} onChange={e => setForm(f => ({ ...f, citta: e.target.value }))} required={form.in_presenza} />
                    </div>
                    {/* Mappa interattiva per selezione punto */}
                    {showMap && (
                      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative">
                          <button className="absolute top-2 right-3 text-2xl text-[#64748b] hover:text-[#fb7185]" onClick={() => setShowMap(false)}>&times;</button>
                          <h3 className="text-lg font-bold mb-2 text-[#1e293b]">Seleziona posizione sulla mappa</h3>
                          <MapSelector
                            coords={coords}
                            onSelect={point => {
                              setCoords({ lat: point.lat, lon: point.lon });
                              setForm(f => ({ ...f, citta: point.citta ?? "" }));
                              setShowMap(false);
                            }}
                          />
                          <div className="mt-2 text-xs text-[#64748b]">Clicca sulla mappa per selezionare il punto. Le coordinate verranno salvate.</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* Disponibilità: giorni e fasce orarie */}
                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-2">Disponibilità settimanale</label>
                  {disponibilita.map((d, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                      <select
                        value={d.giorno_settimana}
                        onChange={e => setDisponibilita(arr => arr.map((el, i) => i === idx ? { ...el, giorno_settimana: Number(e.target.value) } : el))}
                        className="border rounded px-2 py-1"
                      >
                        {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"].map((g, i) => (
                          <option key={i} value={i}>{g}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={d.ora_inizio}
                        onChange={e => setDisponibilita(arr => arr.map((el, i) => i === idx ? { ...el, ora_inizio: e.target.value } : el))}
                        className="border rounded px-2 py-1"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={d.ora_fine}
                        onChange={e => setDisponibilita(arr => arr.map((el, i) => i === idx ? { ...el, ora_fine: e.target.value } : el))}
                        className="border rounded px-2 py-1"
                      />
                      <button type="button" className="text-[#fb7185] ml-2" onClick={() => setDisponibilita(arr => arr.filter((_, i) => i !== idx))}>Rimuovi</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="bg-[#38bdf8] text-white px-2 py-1 rounded hover:bg-[#0ea5e9] transition text-sm mt-2"
                    onClick={() => setDisponibilita(arr => [...arr, { giorno_settimana: 1, ora_inizio: "", ora_fine: "" }])}
                  >
                    + Aggiungi disponibilità
                  </button>
                </div>
                <button type="submit" className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition font-semibold" disabled={saving}>
                  {saving ? "Salvataggio..." : "Aggiungi ripetizione"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal pagamento */}
        {showPagamento && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
              <button className="absolute top-2 right-3 text-2xl text-[#64748b] hover:text-[#fb7185]" onClick={() => setShowPagamento(null)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-[#1e293b]">Pagamento ripetizione</h2>
              <div className="mb-4">
                <div className="font-semibold text-[#38bdf8] flex items-center gap-2">
                  <span>{materiaIcone[showPagamento.materia] || "❓"}</span>
                  <span>{showPagamento.materia}</span>
                </div>
                <div className="text-sm text-[#334155]">Tutor: {showPagamento.nome_offerente}</div>
                <div className="text-sm text-[#334155]">Prezzo: <span className="font-bold text-[#16a34a]">{showPagamento.prezzo_ora}€ / ora</span></div>
                {/* Resoconto carrello con commissione */}
                <div className="mt-4 p-3 rounded bg-[#f1f5f9] text-[#334155]">
                  <div className="flex justify-between items-center mb-1">
                    <span>Prezzo ripetizione</span>
                    <span>{showPagamento.prezzo_ora}€</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span>Commissione sito</span>
                    <span>1€</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-[#0ea5e9] mt-2">
                    <span>Totale</span>
                    <span>{showPagamento.prezzo_ora + 1}€</span>
                  </div>
                  
                </div>
              </div>
              <form className="flex flex-col gap-4" onSubmit={handlePagamentoStripe}>
                {/* Selezione giorno */}
                <div>
                  <label className="block text-sm font-medium text-[#1e293b]">Giorno disponibile</label>
                  <select
                    className="mt-1 border rounded px-2 py-1 w-full"
                    value={orarioRichiesto ? orarioRichiesto.split("T")[0] : ""}
                    onChange={e => {
                      // resetta orario se cambi giorno
                      setOrarioRichiesto(e.target.value ? e.target.value : "");
                    }}
                    required
                  >
                    <option value="">Seleziona giorno...</option>
                    {showPagamento.disponibilita?.map((d, i) => {
                      const today = new Date();
                      const dayDiff = (d.giorno_settimana - today.getDay() + 7) % 7;
                      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayDiff);
                      const dateStr = date.toISOString().slice(0,10);
                      return (
                        <option key={i} value={dateStr}>
                          {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"][d.giorno_settimana]} ({dateStr})
                        </option>
                      );
                    })}
                  </select>
                </div>
                {/* Selezione slot orario da 1 ora */}
                {orarioRichiesto && (
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b]">Orario disponibile</label>
                    <select
                      className="mt-1 border rounded px-2 py-1 w-full"
                      value={orarioRichiesto}
                      onChange={e => setOrarioRichiesto(e.target.value)}
                      required
                    >
                      <option value="">Seleziona orario...</option>
                      {/* Trova la disponibilità selezionata per il giorno scelto */}
                      {showPagamento.disponibilita?.filter(d => {
                        const today = new Date();
                        const dayDiff = (d.giorno_settimana - today.getDay() + 7) % 7;
                        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayDiff);
                        const dateStr = date.toISOString().slice(0,10);
                        return dateStr === orarioRichiesto.split("T")[0];
                      }).flatMap((d) => {
                        // Genera slot da 1 ora tra ora_inizio e ora_fine
                        const slots = [];
                        const [hStart, mStart] = d.ora_inizio.slice(0,5).split(":").map(Number);
                        const [hEnd, mEnd] = d.ora_fine.slice(0,5).split(":").map(Number);
                        let start = new Date(0,0,0,hStart,mStart);
                        const end = new Date(0,0,0,hEnd,mEnd);
                        // Funzione normalize fuori dal ciclo
                        const normalize = (dt: string) => {
                          if (!dt) return "";
                          const [datePart, timePart] = dt.split(/[T ]/);
                          if (!timePart) return dt;
                          const [hh, mm] = timePart.split(":");
                          return `${datePart}T${hh}:${mm}`;
                        };
                        while (start.getTime() + 60*60*1000 <= end.getTime()) {
                          const slotStart = `${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}`;
                          const slotEndDate = new Date(start.getTime() + 60*60*1000);
                          const slotEnd = `${String(slotEndDate.getHours()).padStart(2,"0")}:${String(slotEndDate.getMinutes()).padStart(2,"0")}`;
                          // Costruisci valore: YYYY-MM-DDTHH:mm
                          const slotDate = orarioRichiesto.split("T")[0];
                          const value = `${slotDate}T${slotStart}`;
                          // Verifica se lo slot è già prenotato per la ripetizione selezionata
                          const isBooked = prenotazioniRipetizione.some(p => normalize(p.data_ora) === value);
                          slots.push({ value, label: `${slotStart} - ${slotEnd}`, disabled: isBooked });
                          
                          start = slotEndDate;
                        }
                        return slots.map((s, i) => (
                          <option key={i} value={s.value} disabled={s.disabled ? true : undefined}>{s.label}{s.disabled ? " (prenotato)" : ""}</option>
                        ));
                      })}
                    </select>
                  </div>
                )}
                {/* Totale checkout visibile sotto il form */}
                
                <button type="submit" className="bg-[#f83878] text-white px-4 py-2 rounded hover:bg-[#fb7185] transition font-semibold" disabled={pagando}>
                  {pagando ? "Pagamento..." : "Procedi al pagamento con Stripe"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
  );
}
