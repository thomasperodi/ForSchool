"use client";

import { Dialog, DialogContent, DialogTrigger, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { StaticImageData } from "next/image";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";

export type PromoCardProps = {
  id: string;
  name: string;
  category: string;
  description: string;
  discount: string;
  validUntil: string;
  image: string | StaticImageData;
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
  image,
}: PromoCardProps) => {
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const session  = useSession();
  const userId = session?.user.id;

  const imageUrl = typeof image === "string" ? image : image.src;
  const qrValue = `${id}|${userId ?? "anon"}`;

  const handleRedeem = async () => {
    if (!userId) {
      alert("Devi essere autenticato per riscattare la promozione.");
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
      } else {
        alert(data.error || "Errore nel riscatto della promozione.");
      }
    } catch (error) {
      console.error("Errore di rete:", error);
      alert("Si è verificato un errore, riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative border border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white">
      <div className="relative">
        <Image
          src={imageUrl}
          alt={name}
          className="w-full h-48 object-cover"
          width={500}
          height={300}
        />
        <Badge className="absolute top-4 left-4 bg-primary-500 text-white font-bold text-lg px-3 py-1 rounded-full shadow-md">
          {discount}
        </Badge>
      </div>

      <div className="p-6 flex flex-col justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">
            {category}
          </Badge>

          <h3 className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{name}</h3>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>
        </div>

        <div className="flex items-center text-sm text-gray-500 mt-4">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>Valida fino al {validUntil}</span>
        </div>

        <div className="mt-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTitle></DialogTitle>
            <DialogTrigger asChild>
              <Button className="w-full text-base font-semibold py-3" disabled={!userId}>
                {isRedeemed ? "Riscatto Effettuato" : userId ? "Riscatta Offerta" : "Accedi per riscattare"}
              </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col items-center text-center p-6">
              {isRedeemed ? (
                <>
                  <h2 className="text-xl font-bold mb-4">Mostra questo QR al titolare</h2>
                  <QRCodeCanvas value={qrValue} size={250} className="rounded-lg shadow-xl" />
                  <p className="text-sm text-muted-foreground mt-4">Scansiona per confermare il riscatto.</p>
                  <p className="text-lg text-green-500 font-semibold">Promozione riscattata con successo!</p>
                  <p className="text-sm text-muted-foreground mt-2">Grazie per aver utilizzato la nostra app.</p>
                </>
              ) : (
                <>
                  <p className="text-md text-gray-700 mb-4">
                    Cliccando su &quot;Conferma Riscatto&quot;, la promozione verrà attivata. Sei sicuro di voler procedere?
                  </p>
                  <DialogFooter className="mt-4 w-full">
                    <Button onClick={handleRedeem} disabled={loading} className="w-full">
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
