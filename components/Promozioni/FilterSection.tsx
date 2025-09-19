import { motion } from "framer-motion";
import { Filter, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  distance: number[];
  onDistanceChange: (value: number[]) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
}

export function FilterSection({
  distance,
  onDistanceChange,
  selectedCategory,
  onCategoryChange,
  categories,
}: FilterSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
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
              Distanza massima: {distance[0]}km
            </label>
          </div>
          <Slider
            value={distance}
            onValueChange={onDistanceChange}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1km</span>
            <span>50km</span>
          </div>
        </div>

        {/* Filtro Categoria */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Categoria</label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tutte le categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categories.map((category) => (
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
        {distance[0] < 20 && (
          <Badge variant="secondary" className="gap-1">
            <MapPin className="w-3 h-3" />
            Entro {distance[0]}km
          </Badge>
        )}
        {selectedCategory && selectedCategory !== "all" && (
          <Badge variant="secondary">{selectedCategory}</Badge>
        )}
      </div>
    </motion.div>
  );
}