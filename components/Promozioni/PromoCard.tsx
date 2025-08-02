import { motion } from "framer-motion";
import { MapPin, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaticImageData } from "next/image";

interface PromoCardProps {
  id: string;
  name: string;
  category: string;
  distance: number;
  description: string;
  image: string | StaticImageData; // ✅ accetta entrambi
  discount: string;
  validUntil: string;
  index: number;
}

export function PromoCard({
  name,
  category,
  distance,
  description,
  image,
  discount,
  validUntil,
  index,
}: PromoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card rounded-2xl overflow-hidden border border-border card-hover"
    >
      <div className="relative h-48 overflow-hidden">
        <img
  src={typeof image === "string" ? image : image.src}
  alt={name}
  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
/>

        <div className="absolute top-4 left-4">
          <Badge
            variant="secondary"
            className="bg-primary text-primary-foreground font-semibold"
          >
            {discount}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="bg-card/90 backdrop-blur-sm">
            {category}
          </Badge>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-card-foreground line-clamp-1">
            {name}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {distance}km
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {description}
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Valida fino al {validUntil}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            Riscatta
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="px-4"
          >
            Dettagli
          </Button>
        </div>
      </div>
    </motion.div>
  );
}