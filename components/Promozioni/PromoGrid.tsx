"use client";

import { motion } from "framer-motion";
import { StaticImageData } from "next/image";
import { PromoVenueCard } from "./PromoVenueCard";

export type Promotion = {
  id: string;                 // id promozione
  name: string;               // nome locale (fallback)
  category: string;
  distance: number;
  description: string;        // descrizione promo
  image: string | StaticImageData;
  discount: string;
  validUntil: string;
  images: (string | StaticImageData)[];
  locale_id?: string;         // id locale (preferito per grouping)
  venueName?: string;         // opzionale se vuoi separare nome locale da name
  promoTitle?: string;        // opzionale per titolo breve promo
};

interface PromoGridProps {
  promotions: Promotion[];
}

export const PromoGrid = ({ promotions }: PromoGridProps) => {
  if (!promotions || promotions.length === 0) {
    return (
      <div className="flex justify-center mt-12">
        <p className="text-gray-500 text-lg">Nessuna promozione trovata nelle vicinanze.</p>
      </div>
    );
  }

  // Raggruppo le promozioni per locale (preferisco locale_id, altrimenti name)
  const groups = promotions.reduce<Record<string, Promotion[]>>((acc, p) => {
    const key = p.locale_id ?? p.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const groupedList = Object.values(groups);

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {groupedList.map((venuePromos, idx) => (
        <PromoVenueCard key={idx} promotions={venuePromos} />
      ))}
    </motion.div>
  );
};
