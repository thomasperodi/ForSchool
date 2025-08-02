"use client"
import { useState } from "react";
import { motion } from "framer-motion";
import { FilterSection } from "@/components/Promozioni/FilterSection";
import { PromoGrid } from "@/components/Promozioni/PromoGrid";

// Import delle immagini

import { SidebarTrigger } from "@/components/ui/sidebar";

const mockPromotions = [
  {
    id: "1",
    name: "Ristorante La Tavola",
    category: "Ristorante",
    distance: 2.5,
    description: "Menu degustazione di 5 portate con vini locali abbinati",
    image: "https://source.unsplash.com/800x600/?restaurant,food",
    discount: "-30%",
    validUntil: "31/12/2024",
  },
  {
    id: "2",
    name: "Bar Neon",
    category: "Bar",
    distance: 1.2,
    description: "Aperitivo con buffet illimitato e cocktail della casa",
    image: "https://source.unsplash.com/800x600/?bar,drinks",
    discount: "2x1",
    validUntil: "15/12/2024",
  },
  {
    id: "3",
    name: "Pizzeria Napoli",
    category: "Pizzeria",
    distance: 3.1,
    description: "Pizza + birra media + dolce della casa a prezzo fisso",
    image: "https://source.unsplash.com/800x600/?pizza",
    discount: "-25%",
    validUntil: "20/12/2024",
  },
  {
    id: "4",
    name: "Caffè Centrale",
    category: "Caffè",
    distance: 0.8,
    description: "Colazione completa con cappuccino e cornetto fresco",
    image: "https://source.unsplash.com/800x600/?coffee",
    discount: "-20%",
    validUntil: "28/12/2024",
  },
  {
    id: "5",
    name: "Club Mirage",
    category: "Discoteca",
    distance: 4.2,
    description: "Ingresso gratuito + consumazione inclusa ogni venerdì",
    image: "https://source.unsplash.com/800x600/?club,party",
    discount: "FREE",
    validUntil: "31/01/2025",
  },
  {
    id: "6",
    name: "Gelateria Dolce Vita",
    category: "Gelateria",
    distance: 1.5,
    description: "Coppetta con 3 gusti + panna montata e granella",
    image: "https://source.unsplash.com/800x600/?icecream",
    discount: "-15%",
    validUntil: "10/01/2025",
  },
];


const categories = ["Bar", "Ristorante", "Pizzeria", "Caffè", "Discoteca", "Gelateria"];

const Promozioni = () => {
  const [distance, setDistance] = useState<number[]>([10]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filtro promozioni
  const filteredPromotions = mockPromotions.filter((promo) => {
    const withinDistance = promo.distance <= distance[0];
    const categoryMatch = selectedCategory === "all" || promo.category === selectedCategory;
    return withinDistance && categoryMatch;
  });

  return (
        <div className="flex-1 flex flex-col">
          {/* Header con trigger sidebar */}
          <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4">

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Promozioni
                </h1>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-muted-foreground"
            >
              {filteredPromotions.length} risultati trovati
            </motion.div>
          </header>

          {/* Contenuto principale */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Sezione filtri */}
              <FilterSection
                distance={distance}
                onDistanceChange={setDistance}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
              />

              {/* Griglia promozioni */}
              <PromoGrid promotions={filteredPromotions} />
            </div>
          </main>
        </div>
  );
};

export default Promozioni;