"use client";

import { PromoCard } from "./PromoCard";
import { motion } from "framer-motion";
import { StaticImageData } from "next/image";

interface Promotion {
  id: string;
  name: string;
  category: string;
  distance: number;
  description: string;
  image: string | StaticImageData;
  discount: string;
  validUntil: string;
  images: (string | StaticImageData)[];
}

interface PromoGridProps {
  promotions: Promotion[];
  redeeming?: boolean;
}

export const PromoGrid = ({ promotions, redeeming }: PromoGridProps) => {
  if (!promotions || promotions.length === 0) {
    return (
      <div className="flex justify-center mt-12">
        <p className="text-gray-500 text-lg">Nessuna promozione trovata nelle vicinanze.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {promotions.map((promo) => (
        <PromoCard
          key={promo.id}
          id={promo.id}
          name={promo.name}
          category={promo.category}
          description={promo.description}
          discount={promo.discount || "Promo"}
          validUntil={
            promo.validUntil
              ? new Date(promo.validUntil).toLocaleDateString("it-IT")
              : "Data non disponibile"
          }
          images={promo.images && promo.images.length > 0 ? promo.images : [promo.image]}
          distance={promo.distance}
        />
      ))}
    </motion.div>
  );
};
