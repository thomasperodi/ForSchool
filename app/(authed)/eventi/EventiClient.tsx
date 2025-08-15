"use client";
import React, { useState, useEffect } from "react";
import { Ticket, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { useSession } from "@supabase/auth-helpers-react";

function formatData(data: string) {
  return new Date(data).toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type EventoAPI = {
  id: string;
  nome: string;
  descrizione: string | null;
  data: string;
  prezzo: number | null;
  locandina_url: string | null;
  max_partecipanti?: number | null;
};

export default function EventiClient() {
  const [eventi, setEventi] = useState<EventoAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [acquistoInCorso, setAcquistoInCorso] = useState<string | null>(null);

  const session = useSession();
  const userId = session?.user.id

  useEffect(() => {
    const fetchEventi = async () => {
      setLoading(true);
      setErrore(null);
      try {
        const res = await fetch("/api/evento");
        if (!res.ok) {
          throw new Error("Errore nel recupero degli eventi");
        }
        const data: EventoAPI[] = await res.json();
        setEventi(data);
      } catch (err) {
        setErrore("Impossibile caricare gli eventi. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    };
    fetchEventi();
  }, []);

  const handleAcquista = async (eventoId: string) => {
    setAcquistoInCorso(eventoId);
    
    try {
      const res = await fetch("/api/checkout-biglietti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventoId, quantity: 1, userId}), // 1 biglietto per esempio
      });
  
      const data: { url?: string; error?: string } = await res.json();
  
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Errore durante l'acquisto");
      }
  
      // Reindirizza l'utente al checkout Stripe
      window.location.href = data.url;
    } catch (err) {
      let messaggio = "Errore durante l'acquisto";
      if (err instanceof Error) messaggio = err.message;
      toast.error(messaggio);
    } finally {
      setAcquistoInCorso(null);
    }
  };
  

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-center">Eventi in Discoteca</h1>
      <p className="text-center text-muted-foreground mb-8">
        Acquista i biglietti per i prossimi eventi scolastici in discoteca. Vivi la notte con i tuoi amici!
      </p>
      {loading ? (
        <div className="text-center py-10">Caricamento eventi...</div>
      ) : errore ? (
        <div className="text-center text-red-500 py-10">{errore}</div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {eventi.length === 0 ? (
            <div className="col-span-2 text-center text-muted-foreground">
              Nessun evento disponibile al momento.
            </div>
          ) : (
            eventi.map((evento) => (
              <Card
                key={evento.id}
                className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200"
              >
                <CardHeader className="p-0">
                  <img
                    src={evento.locandina_url || "/placeholder.jpg"}
                    alt={evento.nome}
                    className="w-full h-48 object-cover rounded-t-md"
                    loading="lazy"
                  />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-5">
                  <CardTitle className="flex items-center gap-2 text-xl mb-2">
                    <Ticket className="text-primary" />
                    {evento.nome}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar />
                    {formatData(evento.data)}
                  </div>
                  <p className="mb-4 text-sm">{evento.descrizione}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-semibold text-lg">
                      {evento.prezzo != null ? evento.prezzo : "-"}€
                      <span className="text-xs text-muted-foreground ml-1">/ biglietto</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {evento.max_partecipanti != null
                        ? `${evento.max_partecipanti} posti disponibili`
                        : "Disponibilità non specificata"}
                    </span>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    disabled={
                      (evento.max_partecipanti != null && evento.max_partecipanti === 0) ||
                      acquistoInCorso === evento.id
                    }
                    onClick={() => handleAcquista(evento.id)}
                  >
                    {acquistoInCorso === evento.id ? "Acquisto in corso..." : "Acquista biglietto"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
