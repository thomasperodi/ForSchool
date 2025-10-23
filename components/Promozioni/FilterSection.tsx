"use client";

import { motion } from "framer-motion";
import { Filter, MapPin } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface FilterSectionProps {
  distance: number[];                          // es. [25]
  onDistanceChange: (value: number[]) => void; // callback da parent
  selectedCategory: string;                    // es. "all" | "Bar" | ...
  onCategoryChange: (value: string) => void;   // callback da parent
  categories: string[];                        // elenco categorie
}

export function FilterSection({
  distance,
  onDistanceChange,
  selectedCategory,
  onCategoryChange,
  categories,
}: FilterSectionProps) {
  const dist = Array.isArray(distance) && distance.length > 0 ? distance[0] : 25;
  const cats = Array.isArray(categories) ? categories : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Filtri</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Filtro Distanza */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">
              Distanza massima: {dist} km
            </label>
          </div>

          <Slider
            value={[dist]}
            onValueChange={onDistanceChange}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>

        {/* Filtro Categoria */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Categoria</label>
          <Select
            value={selectedCategory || "all"}
            onValueChange={onCategoryChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tutte le categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {cats.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Badge filtri attivi */}
      <div className="flex flex-wrap gap-2 mt-4">
        {dist < 50 && (
          <Badge variant="secondary" className="gap-1">
            <MapPin className="w-3 h-3" />
            Entro {dist} km
          </Badge>
        )}
        {selectedCategory && selectedCategory !== "all" && (
          <Badge variant="secondary">{selectedCategory}</Badge>
        )}
      </div>
    </motion.div>
  );
}
