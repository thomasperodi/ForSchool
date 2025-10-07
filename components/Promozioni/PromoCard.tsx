"use client";

import { useState } from "react";
import Image, { StaticImageData } from "next/image";
import { Dialog, DialogContent, DialogTrigger, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useSession } from "@supabase/auth-helpers-react";
import toast from "react-hot-toast";

export type PromoCardProps = {
  id: string;
  name: string;
  category: string;
  description: string;
  discount: string;
  validUntil: string;
  images: (string | StaticImageData)[];
  distance: number;
  index?: number;
};

export const PromoCard = ({
  id,
  name,
  category,
  description,
  discount,
  validUntil,
  images,
}: PromoCardProps) => {
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  const session = useSession();
  const userId = session?.user?.id;

  const mainImage =
    images && images.length > 0
      ? images[mainImageIndex]
      : "https://source.unsplash.com/800x600/?bar";
  const imageUrl = typeof mainImage === "string" ? mainImage : mainImage.src;
  const qrValue = `${id}|${userId ?? "anon"}`;

  const handleRedeem = async () => {
    if (!userId) {
      toast.error("Devi essere autenticato per riscattare la promozione.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/redeem-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoId: id, userId }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsRedeemed(true);
        toast.success("Promozione riscattata con successo!");
      } else {
        toast.error(data.error || "Errore nel riscatto della promozione.");
      }
    } catch (error) {
      console.error("Errore di rete:", error);
      toast.error("Si è verificato un errore, riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative border border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-white">
      <div className="relative">
        <Image
          src={imageUrl}
          alt={name}
          width={500}
          height={300}
          className="w-full h-48 object-cover"
        />

        {/* Miniature */}
        {images.length > 1 && (
          <div className="flex space-x-2 p-3 overflow-x-auto bg-white/70">
            {images.map((img, i) => {
              const imgSrc = typeof img === "string" ? img : img.src;
              return (
                <button
                  key={i}
                  onClick={() => setMainImageIndex(i)}
                  className={`w-14 h-14 rounded border-2 ${
                    i === mainImageIndex ? "border-blue-600" : "border-transparent"
                  }`}
                >
                  <Image
                    src={imgSrc}
                    alt={`${name} immagine ${i + 1}`}
                    width={56}
                    height={56}
                    className="object-cover rounded"
                  />
                </button>
              );
            })}
          </div>
        )}

      
      </div>

      <div className="p-6 flex flex-col justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">
            {category}
          </Badge>

          <h3 className="text-xl font-bold text-gray-900 mb-1">{name}</h3>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>
        </div>

        <div className="flex items-center text-sm text-gray-500 mt-2">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>Valida fino al {validUntil}</span>
        </div>

        <div className="mt-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTitle />
            <DialogTrigger asChild>
              <Button
                className="w-full text-base font-semibold py-3"
                disabled={!userId}
              >
                {isRedeemed
                  ? "Riscatto Effettuato"
                  : userId
                  ? "Riscatta Offerta"
                  : "Accedi per riscattare"}
              </Button>
            </DialogTrigger>

            <DialogContent className="flex flex-col items-center text-center p-6">
              {isRedeemed ? (
                <>
                  <h2 className="text-xl font-bold mb-4">
                    Mostra questo QR al titolare
                  </h2>
                  <QRCodeCanvas
                    value={qrValue}
                    size={220}
                    className="rounded-lg shadow-md"
                  />
                  <p className="text-sm text-muted-foreground mt-4">
                    Scansiona per confermare il riscatto.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-md text-gray-700 mb-4">
                    Cliccando su “Conferma Riscatto”, la promozione verrà
                    attivata. Sei sicuro di voler procedere?
                  </p>
                  <DialogFooter className="mt-4 w-full">
                    <Button
                      onClick={handleRedeem}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "In corso..." : "Conferma Riscatto"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};
