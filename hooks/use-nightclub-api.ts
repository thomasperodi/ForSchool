"use client"

import { useState, useEffect, useCallback } from "react"
import type { Discoteca, EventoConStatistiche } from "@/types/database"

interface Statistiche {
  totale_eventi: number
  totale_biglietti: number
  ricavi_totali: number
  prezzo_medio_biglietto: number
  media_partecipanti: number
  tasso_riempimento_medio: number
  ricavo_medio_evento: number
}

interface DatiMensili {
  mese: string
  eventi_count: number
  partecipanti_count: number
  ricavi: number
}

interface NuovoEvento {
  nome: string
  data: string
  prezzo:number
  descrizione?: string
  locandina_url: string
  max_partecipanti:number
}

interface AggiornamentoEvento {
  nome?: string
  data?: string
  descrizione?: string
  locandina_url?: string
  prezzo: number
  max_partecipanti:number
}

export function useNightclubApi(utenteId: string) {
  const [discoteche, setDiscoteche] = useState<Discoteca[]>([])
  const [selectedDiscoteca, setSelectedDiscoteca] = useState<string>("")
  const [statistiche, setStatistiche] = useState<Statistiche | null>(null)
  const [eventi, setEventi] = useState<EventoConStatistiche[]>([])
  const [datiMensili, setDatiMensili] = useState<DatiMensili[]>([])
  const [error, setError] = useState<string | null>(null)

  // Carica discoteche all'inizio
  useEffect(() => {
    if (utenteId) {
      fetchDiscoteche()
    }
  }, [utenteId])

  // Carica dati dashboard quando cambia la discoteca
  useEffect(() => {
    if (selectedDiscoteca) {
      fetchDashboardData()
    }
  }, [selectedDiscoteca])

  const fetchDiscoteche = useCallback(async () => {
    try {
      const res = await fetch(`/api/discoteche?utente_id=${utenteId}`)
      if (!res.ok) throw new Error("Errore nel caricamento delle discoteche")

      const data: Discoteca[] = await res.json()
      setDiscoteche(data)

      if (data.length > 0 && !selectedDiscoteca) {
        setSelectedDiscoteca(data[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    }
  }, [utenteId, selectedDiscoteca])

  const fetchDashboardData = useCallback(async () => {
    if (!selectedDiscoteca) return

    try {
      const [statRes, eventiRes, mensiliRes] = await Promise.all([
        fetch(`/api/statistiche?discoteca_id=${selectedDiscoteca}`),
        fetch(`/api/eventi?discoteca_id=${selectedDiscoteca}`),
        fetch(`/api/dati-mensili?discoteca_id=${selectedDiscoteca}`),
      ])

      if (!statRes.ok || !eventiRes.ok || !mensiliRes.ok) {
        throw new Error("Errore nel caricamento dei dati")
      }

      const [statData, eventiData, mensiliData] = await Promise.all([
        statRes.json() as Promise<Statistiche>,
        eventiRes.json() as Promise<EventoConStatistiche[]>,
        mensiliRes.json() as Promise<DatiMensili[]>,
      ])

      setStatistiche(statData)
      setEventi(eventiData)
      setDatiMensili(mensiliData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento dati")
    }
  }, [selectedDiscoteca])

  const creaEvento = useCallback(async (nuovoEvento: NuovoEvento) => {
    try {
      console.log("nuovo evento hook api", nuovoEvento)
      const res = await fetch("/api/eventi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nuovoEvento, discoteca_id: selectedDiscoteca }),
      })
      if (!res.ok) throw new Error("Errore nella creazione dell'evento")

      await fetchDashboardData()
      return (await res.json()) as EventoConStatistiche
    } catch (err) {
      throw err
    }
  }, [selectedDiscoteca, fetchDashboardData])

  const aggiornaEvento = useCallback(async (eventoId: string, aggiornamenti: AggiornamentoEvento) => {
    try {
      const res = await fetch(`/api/eventi/${eventoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aggiornamenti),
      })
      if (!res.ok) throw new Error("Errore nell'aggiornamento dell'evento")

      await fetchDashboardData()
      return (await res.json()) as EventoConStatistiche
    } catch (err) {
      throw err
    }
  }, [fetchDashboardData])

  const eliminaEvento = useCallback(async (eventoId: string) => {
    try {
      const res = await fetch(`/api/eventi/${eventoId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Errore nell'eliminazione dell'evento")

      await fetchDashboardData()
    } catch (err) {
      throw err
    }
  }, [fetchDashboardData])

  return {
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
    refreshData: fetchDashboardData,
  }
}
