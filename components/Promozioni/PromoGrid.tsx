"use client"
import { motion } from "framer-motion";
import { PromoCard } from "./PromoCard";
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
}

interface PromoGridProps {
  promotions: Promotion[];
}

export function PromoGrid({ promotions }: PromoGridProps) {

  


  

  if (promotions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold mb-2">Nessuna promozione trovata</h3>
        <p className="text-muted-foreground">
          Prova a modificare i filtri per vedere più risultati
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {promotions.map((promo, index) => (
        <PromoCard key={promo.id} {...promo} index={index}  />
      ))}
    </div>
  );
}