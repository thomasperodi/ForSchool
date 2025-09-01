"use client"
import { motion } from "framer-motion";
import { PromoCard } from "./PromoCard";
import Image, { StaticImageData } from "next/image";

interface Promotion {
  id: string;
  name: string;
  category: string;
  distance: number;
  description: string;
  image: string | StaticImageData;
  discount: string;
  validUntil: string;
  images: (string | StaticImageData)[]; // <-- This is the key addition
}

interface PromoGridProps {
  promotions: Promotion[];
   
  redeeming?: boolean;
}

export const PromoGrid = ({ promotions, redeeming }: PromoGridProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
    {promotions.map((promo) => (
      // Use PromoCard component instead of hardcoded div
      <PromoCard
        key={promo.id}
        id={promo.id}
        name={promo.name}
        category={promo.category}
        description={promo.description}
        discount={promo.discount}
        validUntil={promo.validUntil}
        images={promo.images} // Pass the images array
        distance={promo.distance}
      />
    ))}
  </div>
);