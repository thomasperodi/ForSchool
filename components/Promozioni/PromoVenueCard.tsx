"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image, { StaticImageData } from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useSession } from "@supabase/auth-helpers-react";
import toast from "react-hot-toast";
import type { Promotion } from "./PromoGrid";

export function PromoVenueCard({ promotions }: { promotions: Promotion[] }) {
  // Dati del locale dalla prima promo
  const first = promotions[0];
  const venueName = first.venueName ?? first.name;
  const category = first.category;
  const distance = first.distance;

  // Slider state
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = promotions[index % promotions.length];

  // Redeem state
  const session = useSession();
  const userId = session?.user?.id ?? null;
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Autoplay: ogni 5s, pausa su hover
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (paused || promotions.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % promotions.length);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, promotions.length]);

const mainImage = useMemo(() => {
  const imgs: (string | StaticImageData)[] =
    current.images?.length ? current.images : [current.image];

  const first = imgs[0];
  if (typeof first === "string") return first;
  return first.src; // StaticImageData ha sempre la proprietà .src
}, [current]);

  const formattedValidUntil = useMemo(() => {
    if (!current.validUntil) return "Data non disponibile";
    const d = new Date(current.validUntil);
    if (isNaN(d.getTime())) return current.validUntil;
    return d.toLocaleDateString("it-IT");
  }, [current.validUntil]);

  const onPrev = () => setIndex((i) => (i - 1 + promotions.length) % promotions.length);
  const onNext = () => setIndex((i) => (i + 1) % promotions.length);

  const handleRedeem = async () => {
    if (!userId) {
      toast.error("Devi essere autenticato per riscattare la promozione.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/redeem-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoId: current.id, userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsRedeemed(true);
        toast.success("Promozione riscattata con successo!");
      } else {
        toast.error(data.error || "Errore nel riscatto della promozione.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Si è verificato un errore, riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative border border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Immagine + controlli */}
      <div className="relative">
        <Image
          src={mainImage}
          alt={venueName}
          width={800}
          height={450}
          className="w-full h-48 object-cover"
          priority={false}
        />

        {promotions.length > 1 && (
          <>
            <button
              aria-label="precedente"
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur p-1 shadow"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="successiva"
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur p-1 shadow"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
              {promotions.map((_, i) => (
                <button
                  key={i}
                  aria-label={`vai alla promo ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    i === index ? "bg-white w-6" : "bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contenuto */}
      <div className="p-6 flex flex-col justify-between">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{category}</Badge>
            <span className="text-xs text-muted-foreground">
              {Number.isFinite(distance) ? `${distance.toFixed(1)} km` : ""}
            </span>
          </div>

          <h3 className="text-xl font-bold text-gray-900 leading-tight">{venueName}</h3>

          {current.promoTitle && (
            <p className="text-sm font-semibold text-blue-600 mt-1">{current.promoTitle}</p>
          )}

          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{current.description}</p>

          <div className="flex items-center justify-between mt-3">
            <span className="text-base font-semibold">{current.discount || "Promo"}</span>
            <div className="flex items-center text-sm text-gray-500">
              <CalendarDays className="mr-2 h-4 w-4" />
              <span>Valida fino al {formattedValidUntil}</span>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTitle />
            <DialogTrigger asChild>
              <Button className="w-full text-base font-semibold py-3" disabled={!userId}>
                {isRedeemed ? "Riscatto Effettuato" : userId ? "Riscatta Offerta" : "Accedi per riscattare"}
              </Button>
            </DialogTrigger>

            <DialogContent className="flex flex-col items-center text-center p-6">
              {isRedeemed ? (
                <>
                  <h2 className="text-xl font-bold mb-4">Mostra questo QR al titolare</h2>
                  <QRCodeCanvas value={`${current.id}|${userId ?? "anon"}`} size={220} className="rounded-lg shadow-md" />
                  <p className="text-sm text-muted-foreground mt-4">Scansiona per confermare il riscatto.</p>
                </>
              ) : (
                <>
                  <p className="text-md text-gray-700 mb-4">
                    Cliccando su “Conferma Riscatto”, la promozione corrente verrà attivata. Sei sicuro di voler procedere?
                  </p>
                  <DialogFooter className="mt-4 w-full">
                    <Button onClick={handleRedeem} disabled={loading} className="w-full">
                      {loading ? "In corso..." : "Conferma Riscatto"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
