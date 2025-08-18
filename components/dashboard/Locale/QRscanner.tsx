"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { QrCode, Scan } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from "@capacitor/barcode-scanner";

// Per il web
import { Html5Qrcode } from "html5-qrcode";

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
  // Rimosso lo stato `html5Qrcode` perché non è più necessario
  // gestirlo direttamente tramite useState per la logica di cleanup.

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    const platform = Capacitor.getPlatform();

    const startWebScanner = async () => {
      const qrRegionId = "qr-scanner-region";
      scanner = new Html5Qrcode(qrRegionId);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          setIsScanning(false);
          handleQRScan(decodedText);
        },
        (error) => {
          console.warn("QR Web scan error:", error);
        }
      );
    };

    const stopWebScanner = () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };

    const startCapacitorScanner = async () => {
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
    };

    if (isScanning) {
      if (platform === "web") {
        startWebScanner();
      } else {
        startCapacitorScanner();
      }
    }

    // La funzione di cleanup viene eseguita quando il componente si smonta
    // o quando isScanning cambia da true a false
    return () => {
      if (platform === "web") {
        stopWebScanner();
      }
    };
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {Capacitor.getPlatform() === "web" ? (
            <div id="qr-scanner-region" className="w-full h-full" />
          ) : (
            <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
              <Scan className="h-8 w-8 text-white animate-pulse" />
            </div>
          )}
        </div>
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