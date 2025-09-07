"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Ticket, Calendar, Filter, DollarSign, Clock, Users, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { useSession } from "@supabase/auth-helpers-react";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";
import { Stripe, PaymentSheetEventsEnum } from '@capacitor-community/stripe';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Aggiunto import per il campo di input
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  stripe_product_id?: string;
  stripe_price_id?: string;
  discoteche: {
    nome: string;
    indirizzo: string;
  };
};

export default function EventiClient() {
  const [eventi, setEventi] = useState<EventoAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [acquistoInCorso, setAcquistoInCorso] = useState<string | null>(null);
  const [quantita, setQuantita] = useState<Record<string, number>>({});
  const [filtroData, setFiltroData] = useState("tutti");
  const [filtroNome, setFiltroNome] = useState(""); // Nuovo stato per il filtro nome

  const session = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    const fetchEventi = async () => {
      setLoading(true);
      setErrore(null);
      try {
        const res = await fetch("/api/evento");
        if (!res.ok) throw new Error("Errore nel recupero degli eventi");
        const data: EventoAPI[] = await res.json();
        setEventi(data);
        const iniziale: Record<string, number> = {};
        data.forEach((e) => (iniziale[e.id] = 1));
        setQuantita(iniziale);
      } catch (err) {
        setErrore("Impossibile caricare gli eventi. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    };
    fetchEventi();
  }, []);

  const eventiFiltrati = useMemo(() => {
    const eventiOrdinati = eventi.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    return eventiOrdinati.filter((evento) => {
      const dataEvento = new Date(evento.data);
      const oggi = new Date();
      let passaFiltroData = true;
      let passaFiltroNome = true;

      // Logica per il filtro della data
      if (filtroData === "settimana") {
        const settimanaProssima = new Date();
        settimanaProssima.setDate(oggi.getDate() + 7);
        passaFiltroData = dataEvento >= oggi && dataEvento <= settimanaProssima;
      } else if (filtroData === "mese") {
        const meseProssimo = new Date();
        meseProssimo.setMonth(oggi.getMonth() + 1);
        passaFiltroData = dataEvento >= oggi && dataEvento <= meseProssimo;
      }
      
      // Logica per il filtro del nome (insensibile alle maiuscole/minuscole)
      if (filtroNome) {
        passaFiltroNome = evento.nome.toLowerCase().includes(filtroNome.toLowerCase());
      }
      
      return passaFiltroData && passaFiltroNome;
    });
  }, [eventi, filtroData, filtroNome]);

  const handleAcquista = async (eventoId: string) => {
    const qty = quantita[eventoId] || 1;
    setAcquistoInCorso(eventoId);

    try {
      const res = await fetch("/api/checkout-biglietti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          quantity: qty,
          userId,
          platform: Capacitor.isNativePlatform() ? "mobile" : "web",
        }),
      });

      const data = await res.json();
      if (!res.ok || (!data.url && !data.clientSecret)) {
        throw new Error(data.error || "Errore durante l'acquisto");
      }

      if (Capacitor.isNativePlatform() && data.clientSecret) {
        await Stripe.initialize({ publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "" });
        await Stripe.createPaymentSheet({
          paymentIntentClientSecret: data.clientSecret,
          merchantDisplayName: "Nome del tuo locale",
        });
        const result = await Stripe.presentPaymentSheet();
        if (result.paymentResult === PaymentSheetEventsEnum.Completed) {
          toast.success("Pagamento completato!");
        } else {
          toast.error("Pagamento non completato o annullato");
          throw new Error("Pagamento non completato o annullato");
        }
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      let messaggio = "Errore durante l'acquisto";
      if (err instanceof Error) messaggio = err.message;
      toast.error(messaggio);
    } finally {
      setAcquistoInCorso(null);
    }
  };

  const getFomoMessage = (posti: number | null | undefined) => {
    if (posti === null || posti === undefined || posti <= 0) return null;
    if (posti < 10) {
      return { text: `Solo ${posti} posti rimasti!`, className: "bg-red-500 text-white" };
    }
    if (posti < 50) {
      return { text: `${posti} posti disponibili`, className: "bg-yellow-500 text-black" };
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          La Tua Notte, I Tuoi Biglietti
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Scopri e acquista i biglietti per i prossimi eventi in discoteca. Non perdere le serate più cool!
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 items-start justify-between">
        <div className="flex items-center gap-2">
          <Filter className="text-primary" />
          <p className="font-semibold text-lg">Filtra per:</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Nuovo campo di ricerca per il nome */}
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cerca per nome evento..."
              className="pl-9 w-full"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
            />
          </div>
          <Select value={filtroData} onValueChange={setFiltroData}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti gli eventi</SelectItem>
              <SelectItem value="settimana">Prossima settimana</SelectItem>
              <SelectItem value="mese">Questo mese</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <hr className="my-6" />

      {loading ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="flex flex-col animate-pulse">
              <Skeleton className="w-full h-96 rounded-t-md" />
              <CardContent className="flex-1 flex flex-col p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-1" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : errore ? (
        <div className="text-center text-red-500 py-10">{errore}</div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {eventiFiltrati.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-10">
              Nessun evento trovato con questi filtri. Prova a modificarli!
            </div>
          ) : (
            eventiFiltrati.map((evento) => {
              const fomo = getFomoMessage(evento.max_partecipanti);
              return (
                <Card
                  key={evento.id}
                  className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden py-0 gap-0"
                >
                  <div className="relative">
                    <Image
                      src={evento.locandina_url || "/placeholder.jpg"}
                      alt={evento.nome}
                      className="w-full h-96 object-cover rounded-t-md"
                      loading="lazy"
                      width={500}
                      height={250}
                    />
                    {fomo && (
                      <Badge className={`absolute top-3 left-3 text-xs font-semibold ${fomo.className}`}>
                        {fomo.text}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="flex-1 flex flex-col p-4">
                    <CardTitle className="text-xl font-bold mb-1">
                      {evento.nome}
                    </CardTitle>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        {evento.discoteche.nome}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        {evento.discoteche.indirizzo}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        {formatData(evento.data)}
                      </div>
                    </div>
                    <p className="text-sm mb-3 line-clamp-3 text-muted-foreground">{evento.descrizione}</p>
                    
                    <div className="flex items-center justify-between mt-auto mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {evento.prezzo != null ? `${evento.prezzo}€` : "Gratuito"}
                        </span>
                      </div>
                      {fomo && (
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <Users size={14} />
                          <span>{evento.max_partecipanti}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-auto justify-between">
                      <div className="flex items-center gap-2">
                          <span className="text-m font-medium">Qty:</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-10 h-10"
                            disabled={quantita[evento.id] <= 1}
                            onClick={() =>
                              setQuantita((prev) => ({ ...prev, [evento.id]: prev[evento.id] - 1 }))
                            }
                          >
                            -
                          </Button>
                          <span className="w-5 text-center text-m font-semibold">{quantita[evento.id]}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-10 h-10"
                            onClick={() =>
                              setQuantita((prev) => ({
                                ...prev,
                                [evento.id]:
                                  evento.max_partecipanti != null
                                    ? Math.min(prev[evento.id] + 1, evento.max_partecipanti)
                                    : prev[evento.id] + 1,
                              }))
                            }
                          >
                            +
                          </Button>
                      </div>
                      <Button
                        className="w-full max-w-[120px] text-sm"
                        disabled={
                          (evento.max_partecipanti != null && evento.max_partecipanti <= 0) ||
                          acquistoInCorso === evento.id
                        }
                        onClick={() => handleAcquista(evento.id)}
                      >
                        {acquistoInCorso === evento.id ? "Acquisto..." : "Acquista"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}