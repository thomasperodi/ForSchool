"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { FilterSection } from "@/components/Promozioni/FilterSection";
import { PromoGrid } from "@/components/Promozioni/PromoGrid";
import { GetLocaliWithPromozioni } from "@/lib/database-functions";
import { LocaliWithPromo } from "@/types/database";
import { supabase } from "@/lib/supabaseClient";

const categories = ["Bar", "Ristorante", "Pizzeria", "Caffè", "Discoteca", "Gelateria"];

const Promozioni = () => {
  const [distance, setDistance] = useState<number[]>([10]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [locali, setLocali] = useState<LocaliWithPromo | null>(null);
  const [loadingRedeem, setLoadingRedeem] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Stati per riscatti e countdown
  const [nextRedeemInSeconds, setNextRedeemInSeconds] = useState<number>(0);
  const [riscattiUsati, setRiscattiUsati] = useState<number>(0);
  const [countdown, setCountdown] = useState("00:00");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const utenteId = userData?.user?.id || "";
      setUserId(utenteId);

      const data = await GetLocaliWithPromozioni();
      console.log("Locali con promozioni:", data);
      setLocali(data);
    };

    fetchData();
  }, []);

  // Aggiorna info riscatti e countdown quando userId o loadingRedeem cambiano
  useEffect(() => {
    if (!userId) return;

    const fetchRedeemInfo = async () => {
      try {
        const res = await fetch(`/api/promozioni/can-redeem?utente_id=${userId}`);
        const data = await res.json();

        setNextRedeemInSeconds(data.nextRedeemInSeconds ?? 0);
        setRiscattiUsati(typeof data.riscattiQuestoMese === "number" ? data.riscattiQuestoMese : 0);
      } catch {
        setNextRedeemInSeconds(0);
        setRiscattiUsati(0);
      }
    };

    fetchRedeemInfo();
  }, [userId, loadingRedeem]);

  // Gestione countdown
useEffect(() => {
  if (nextRedeemInSeconds > 0) {
    let remaining = nextRedeemInSeconds;

    const tick = () => {
      if (remaining <= 0) {
        setCountdown("0g 0h 0m");
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);

      const formatted = `${days}g ${hours}h ${minutes}m`;

      setCountdown(formatted);
      remaining -= 1;
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  } else {
    setCountdown("0g 0h 0m");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }
}, [nextRedeemInSeconds]);


const filteredPromotions =
  locali
    ?.flatMap((locale) =>
      locale.promozioni.map((promo) => ({
        id: promo.id,
        name: locale.name,
        category: locale.category,
        description: promo.description ?? "",
        discount: promo.discount ?? "",
        validUntil: promo.valid_until ?? "",
        image: locale.image_url ?? "https://source.unsplash.com/800x600/?bar",
        distance: 1.0, // TODO: calcolare distanza reale
        locale_id: locale.id,
        images: locale.immagini_locali ?? [],  // <-- This is the key addition
      }))
    )
    .filter((promo) => {
      const withinDistance = promo.distance <= distance[0];
      const categoryMatch = selectedCategory === "all" || promo.category === selectedCategory;
      return withinDistance && categoryMatch;
    }) ?? [];


  async function handleRedeem(promoId: string) {
    if (loadingRedeem) return;
    setLoadingRedeem(true);

    try {
      const res = await fetch(`/api/promozioni/can-redeem?utente_id=${userId}`);
      const data = await res.json();

      if (!data.canRedeem) {
        if (data.nextRedeemDate) {
          const nextDate = new Date(data.nextRedeemDate);
          alert(
            `Non puoi riscattare la promozione: ${data.reason}\n` +
              `Potrai riscattare nuovamente il: ${nextDate.toLocaleString()}`
          );
        } else {
          alert(`Non puoi riscattare la promozione: ${data.reason}`);
        }
        setLoadingRedeem(false);
        return;
      }

      const redeemRes = await fetch(`/api/promozioni/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utente_id: userId, promozione_id: promoId }),
      });

      if (!redeemRes.ok) {
        alert("Errore nel riscattare la promozione, riprova.");
        setLoadingRedeem(false);
        return;
      }

      alert("Promozione riscattata con successo!");
      setLoadingRedeem(false);
      // Ricarica info riscatti
    } catch (error) {
      alert("Errore di rete, riprova più tardi.");
      setLoadingRedeem(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center justify-center px-6 border-border backdrop-blur-sm sticky top-0 z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-bold text-center bg-clip-text">Promozioni</h1>
          <p className="text-center mt-2 bg-clip-text">Scopri le fantastiche promozioni vicino a te!</p>
        </motion.div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <FilterSection
            distance={distance}
            onDistanceChange={setDistance}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categories}
          />

          {/* Informazioni riscatti e countdown */}
          <div className="mb-6 p-5 bg-yellow-50 border border-yellow-300 rounded-lg text-center text-sm max-w-md mx-auto">
  <p className="mb-2 font-medium">
    Riscatti effettuati questo mese: <strong>{riscattiUsati} / 4</strong>
  </p>

  {riscattiUsati < 4 ? (
    nextRedeemInSeconds > 0 ? (
      <p className="mb-3 text-yellow-700">
        Prossimo riscatto possibile tra: <strong>{countdown}</strong>
      </p>
    ) : (
      <p className="mb-3 text-green-700 font-semibold">
        Puoi riscattare una nuova promozione ora!
      </p>
    )
  ) : (
    <p className="mb-3 text-red-700 font-semibold">
      Hai raggiunto il limite mensile di riscatti.
    </p>
  )}

  <div className="mt-4 pt-4 border-t border-yellow-300">
    <p className="mb-3 text-gray-700 font-medium">
      Non vuoi aspettare o vuoi più riscatti mensili?
    </p>
    <button
      className="px-5 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
      onClick={() => window.location.href = "/#promo"}
      aria-label="Abbonati per più riscatti"
    >
      Abbonati per più riscatti
    </button>
  </div>
</div>


          <PromoGrid promotions={filteredPromotions} onRedeem={handleRedeem} redeeming={loadingRedeem}  />
        </div>
      </main>
    </div>
  );
};

export default Promozioni;