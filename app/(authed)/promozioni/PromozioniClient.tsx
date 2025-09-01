"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilterSection } from "@/components/Promozioni/FilterSection";
import { PromoGrid } from "@/components/Promozioni/PromoGrid";
import { GetLocaliWithPromozioni } from "@/lib/database-functions";
import { LocaliWithPromo } from "@/types/database";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

/**
 * Componente per la visualizzazione di messaggi temporanei (successo, errore, info).
 */
const MessageBox = ({
  message,
  type,
  onClose,
}: {
  message: string | null;
  type: "success" | "error" | "info";
  onClose: () => void;
}) => {
  if (!message) return null;

  const bgColor =
    type === "success"
      ? "bg-green-100"
      : type === "error"
      ? "bg-red-100"
      : "bg-blue-100";
  const textColor =
    type === "success"
      ? "text-green-800"
      : type === "error"
      ? "text-red-800"
      : "text-blue-800";
  const borderColor =
    type === "success"
      ? "border-green-400"
      : type === "error"
      ? "border-red-400"
      : "border-blue-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg flex items-center justify-between z-50 ${bgColor} ${textColor} border ${borderColor}`}
      style={{ minWidth: "300px" }}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-lg font-bold">
        &times;
      </button>
    </motion.div>
  );
};

// Categorie disponibili per il filtraggio
const categories = [
  "Bar",
  "Ristorante",
  "Pizzeria",
  "Caffè",
  "Discoteca",
  "Gelateria",
];

const Promozioni = () => {
  const [distance, setDistance] = useState<number[]>([10]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [locali, setLocali] = useState<LocaliWithPromo | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const showMessage = (
    msg: string,
    type: "success" | "error" | "info"
  ) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      if (Capacitor.getPlatform() === "web") {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            showMessage("Geolocalizzazione non supportata.", "error");
            resolve(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {
              showMessage("Errore geolocalizzazione.", "error");
              resolve(null);
            },
            { enableHighAccuracy: true }
          );
        });
      } else {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
        });
        return { lat: position.coords.latitude, lng: position.coords.longitude };
      }
    } catch (err) {
      console.error("Errore geolocalizzazione:", err);
      showMessage("Impossibile recuperare la posizione.", "error");
      return null;
    }
  }

  useEffect(() => {
    getUserLocation().then(setUserLocation);
    GetLocaliWithPromozioni().then(setLocali);
  }, []);

  const filteredPromotions =
    locali && userLocation
      ? locali
          .flatMap((locale) => {
            const distanza = haversineDistance(
              userLocation.lat,
              userLocation.lng,
              locale.latitudine || 0,
              locale.longitudine || 0
            );

            return locale.promozioni.map((promo) => ({
              id: promo.id,
              name: locale.name,
              category: locale.category,
              description: promo.description ?? "",
              discount: promo.discount ?? "",
              validUntil: promo.valid_until ?? "",
              image:
                locale.image_url ??
                "https://source.unsplash.com/800x600/?bar",
              distance: distanza,
              locale_id: locale.id,
              images: locale.immagini_locali ?? [],
            }));
          })
          .filter((promo) => {
            const withinDistance = promo.distance <= distance[0];
            const categoryMatch =
              selectedCategory === "all" || promo.category === selectedCategory;
            return withinDistance && categoryMatch;
          })
          .sort((a, b) => a.distance - b.distance)
      : [];

  return (
    <div className="flex-1 flex flex-col">
      <AnimatePresence>
        <MessageBox
          message={message}
          type={messageType}
          onClose={() => setMessage(null)}
        />
      </AnimatePresence>

      <header className="h-16 flex items-center justify-center px-6 border-border backdrop-blur-sm sticky top-0 z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-bold text-center">Promozioni</h1>
          <p className="text-center mt-2">
            Scopri le fantastiche promozioni vicino a te!
          </p>
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

          <PromoGrid promotions={filteredPromotions} />
        </div>
      </main>
    </div>
  );
};

export default Promozioni;
