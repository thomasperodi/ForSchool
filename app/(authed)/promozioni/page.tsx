"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FilterSection } from "@/components/Promozioni/FilterSection";
import { PromoGrid } from "@/components/Promozioni/PromoGrid";
import { GetLocaliWithPromozioni } from "@/lib/database-functions";
import { LocaliWithPromo } from "@/types/database";

const categories = ["Bar", "Ristorante", "Pizzeria", "Caffè", "Discoteca", "Gelateria"];

const Promozioni = () => {
  const [distance, setDistance] = useState<number[]>([10]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [locali, setLocali] = useState<LocaliWithPromo | null>(null);

  useEffect(() => {
    const fetchLocali = async () => {
      const data = await GetLocaliWithPromozioni();
      setLocali(data);
    };

    fetchLocali();
  }, []);

  const filteredPromotions =
    locali?.flatMap((locale) =>
      locale.promozioni.map((promo) => ({
        id: promo.id,
        name: locale.name,
        category: locale.category,
        description: promo.description ?? "",
        discount: promo.discount ?? "",
        validUntil: promo.valid_until ?? "",
        image: locale.image_url ?? "https://source.unsplash.com/800x600/?bar",
        distance: 1.0, // TODO: calcolare distanza reale se hai posizione utente
      }))
    ).filter((promo) => {
      const withinDistance = promo.distance <= distance[0];
      const categoryMatch = selectedCategory === "all" || promo.category === selectedCategory;
      return withinDistance && categoryMatch;
    }) ?? [];

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

          <PromoGrid promotions={filteredPromotions} />
        </div>
      </main>
    </div>
  );
};

export default Promozioni;
