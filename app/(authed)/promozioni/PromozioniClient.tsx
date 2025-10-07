"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FilterSection } from "@/components/Promozioni/FilterSection";
import { PromoGrid } from "@/components/Promozioni/PromoGrid";
import { GetLocaliWithPromozioni } from "@/lib/database-functions";
import { LocaliWithPromo } from "@/types/database";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";

const categories = ["Bar", "Ristorante", "Pizzeria", "Caffè", "Discoteca", "Gelateria"];

const Promozioni = () => {
  const [distance, setDistance] = useState<number[]>([25]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [locali, setLocali] = useState<LocaliWithPromo | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Calcolo distanza in km
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Recupera posizione utente
  async function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      if (Capacitor.getPlatform() === "web") {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            toast.error("Geolocalizzazione non supportata.");
            resolve(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {
              toast.error("Errore geolocalizzazione.");
              resolve(null);
            },
            { enableHighAccuracy: true }
          );
        });
      } else {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        return { lat: position.coords.latitude, lng: position.coords.longitude };
      }
    } catch (err) {
      console.error("Errore geolocalizzazione:", err);
      toast.error("Impossibile recuperare la posizione.");
      return null;
    }
  }

  // Recupera i locali con promozioni dal DB
  useEffect(() => {
    getUserLocation().then(setUserLocation);

    GetLocaliWithPromozioni().then((data) => {
      if (!data) {
        setLocali([]);
        return;
      }

      // ✅ Filtra solo i locali che hanno almeno una promozione
      const localiConPromo = data.filter(
        (locale) => locale.promozioni && locale.promozioni.length > 0
      );

      setLocali(localiConPromo);
    });
  }, []);

  // 🔍 Mappa i locali e le promozioni in un array di oggetti da passare a PromoGrid
const filteredPromotions =
  locali
    ?.flatMap((locale) => {
      const distanza = userLocation
        ? haversineDistance(
            userLocation.lat,
            userLocation.lng,
            locale.latitudine || 0,
            locale.longitudine || 0
          )
        : 0;

      return locale.promozioni.map((promo) => ({
        id: promo.id,
        name: locale.name,
        category: locale.category,
        description: promo.description ?? "Offerta disponibile!",
        discount: promo.prezzo ? `${promo.prezzo} €` : promo.discount ?? "Promo",
        validUntil: promo.valid_until ?? "",
        image:
          locale.immagini_locali?.[0] ??
          locale.image_url ??
          "https://source.unsplash.com/800x600/?club",
        distance: distanza,
        locale_id: locale.id,
        images:
          locale.immagini_locali && locale.immagini_locali.length > 0
            ? locale.immagini_locali
            : [locale.image_url ?? "https://source.unsplash.com/800x600/?club"],
      }));
    })|| []; // ✅ sempre array


  // 🔎 Debug per vedere cosa arriva
  console.log("filteredPromotions:", filteredPromotions);
  console.log("Locali con promozioni:", locali);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center justify-center px-6 border-border backdrop-blur-sm sticky top-0 z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-bold text-center">Promozioni</h1>
          <p className="text-center mt-2">Scopri le fantastiche promozioni vicino a te!</p>
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

          {filteredPromotions.length > 0 ? (
            <PromoGrid promotions={filteredPromotions} />
          ) : (
            <p className="text-center text-gray-500 mt-10">
              Nessuna promozione attiva trovata nei locali vicini.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Promozioni;
