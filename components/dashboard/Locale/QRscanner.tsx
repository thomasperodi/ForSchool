"use client";

import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { QrCode, Scan } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from "@capacitor/barcode-scanner";

export interface ScannedPromotion {
  id: string;
  name: string;
  discount: string;
  discountType: "percentage" | "fixed";
  customerName?: string;
  timestamp: string;
  numero_scan?: number;
}

interface QRScannerProps {
  onScanSuccess: (promotion: ScannedPromotion) => void;
  onScanError: () => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  isScanning,
  setIsScanning,
}) => {
  useEffect(() => {
    if (!isScanning) return;

    const startScan = async () => {
      try {
        // Avvia la scansione nativa. Il plugin gestisce automaticamente i permessi della fotocamera.
        const result = await CapacitorBarcodeScanner.scanBarcode({
          hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        });

        setIsScanning(false);

        if (result.ScanResult) {
          handleQRScan(result.ScanResult);
        } else {
          toast.error("Nessun QR rilevato");
          onScanError();
        }
      } catch (error) {
        console.error("Errore scanner nativo", error);
        toast.error("Errore nella scansione");
        setIsScanning(false);
        onScanError();
      }
    };

    startScan();
  }, [isScanning, onScanError, setIsScanning]);

  const handleQRScan = async (qrContent: string) => {
    const [promotionId, userIdFromQR] = qrContent.trim().split("|");

    try {
      if (!promotionId || !userIdFromQR) throw new Error("QR non valido");

      const response = await fetch("/api/scan-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoId: promotionId, userId: userIdFromQR }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Errore durante la scansione");
      }

      const [{ data: promotion }, { data: user }] = await Promise.all([
        supabase.from("promozioni").select("*").eq("id", promotionId).single(),
        supabase.from("utenti").select("nome").eq("id", userIdFromQR).single(),
      ]);

      if (!promotion || !user) {
        throw new Error("Dati promozione o utente non trovati");
      }

      const scannedData: ScannedPromotion = {
        id: promotion.id,
        name: promotion.name,
        discount: promotion.discount,
        discountType: promotion.discount_type,
        customerName: user.nome,
        timestamp: new Date().toISOString(),
        numero_scan: (promotion.numero_scan || 0) + 1,
      };

      onScanSuccess(scannedData);
      toast.success(`Promozione "${promotion.name}" attivata da ${user.nome}!`);
    } catch (err) {
      console.error(err);
      toast.error("Errore nella scansione o QR non valido");
      onScanError();
    }
  };

  return (
    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
      {isScanning ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
              <Scan className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <QrCode className="h-16 w-16 mx-auto text-gray-400" />
            <p className="text-gray-500">Premi il pulsante per avviare la scansione</p>
          </div>
        </div>
      )}
    </div>
  );
};