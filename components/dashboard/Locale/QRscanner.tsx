"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { toast } from "react-hot-toast"
import { QrCode, Scan } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'
import { Capacitor } from "@capacitor/core"

export interface ScannedPromotion {
  id: string
  name: string
  discount: string
  discountType: "percentage" | "fixed"
  customerName?: string
  timestamp: string
  numero_scan?: number
}

interface QRScannerProps {
  onScanSuccess: (promotion: ScannedPromotion) => void
  onScanError: () => void
  isScanning: boolean
  setIsScanning: (value: boolean) => void
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  isScanning,
  setIsScanning,
}) => {
  const qrboxSize = 250
  const config = {
    fps: 10,
    qrbox: { width: qrboxSize, height: qrboxSize },
    supportedScanFormats: [Html5QrcodeSupportedFormats.QR_CODE],
    rememberLastUsedCamera: true,
  }
  const html5QrCode = useRef<Html5Qrcode | null>(null)
  const [usingNativeScanner, setUsingNativeScanner] = useState(false)

//   useEffect(() => {
//     const isNative = Capacitor.isNativePlatform()

//     if (!isScanning) {
//       stopScanner()
//       return
//     }

//     if (isNative) {
//       setUsingNativeScanner(true)
//       startNativeScanner()
//     } else {
//       setUsingNativeScanner(false)
//       startHtml5QrScanner()
//     }

//     async function startHtml5QrScanner() {
//       try {
//         html5QrCode.current = new Html5Qrcode("qr-reader")
//         await html5QrCode.current.start(
//           { facingMode: "environment" },
//           config,
//           async (decodedText) => {
//             await stopScanner()
//             setIsScanning(false)
//             handleQRScan(decodedText)
//           },
//           (error) => {
//             // ignora errori minori
//           }
//         )
//       } catch (err) {
//         console.error("Errore avvio scanner web", err)
//         toast.error("Errore nell’avvio della fotocamera")
//         setIsScanning(false)
//         onScanError()
//       }
//     }

//     async function startNativeScanner() {
//       try {
//         const status = await BarcodeScanner.checkPermission({ force: true })
//         if (!status.granted) {
//           // Prova a richiedere permesso
//           const requestStatus = await BarcodeScanner.checkPermission({ force: true });
//           if (!requestStatus.granted) {
//             toast.error("Permesso fotocamera negato")
//             setIsScanning(false)
//             onScanError()
//             return
//           }
//         }

//         await BarcodeScanner.hideBackground();

// const result = await BarcodeScanner.startScan();

// if (result.hasContent) {
//   await BarcodeScanner.stopScan();
//   handleQRScan(result.content);
// }

// await BarcodeScanner.showBackground();
// setIsScanning(false);

//       } catch (error) {
//         console.error("Errore scanner nativo", error)
//         toast.error("Errore nella scansione")
//         setIsScanning(false)
//         onScanError()
//         try {
//           await BarcodeScanner.showBackground()
//         } catch {}
//       }
//     }

//     async function stopScanner() {
//       if (html5QrCode.current && html5QrCode.current.isScanning) {
//         try {
//           await html5QrCode.current.stop()
//         } catch (e) {
//           console.warn("Errore nello stop scanner web", e)
//         }
//       }
//       try {
//         await BarcodeScanner.stopScan()
//         await BarcodeScanner.showBackground()
//       } catch {}
//     }

//     return () => {
//       stopScanner()
//     }
//   }, [isScanning, onScanError, setIsScanning])

useEffect(() => {
  const startScan = async () => {
    const status = await BarcodeScanner.checkPermission({ force: true });
    if (!status.granted) {
      alert("No permission");
      return;
    }

    await BarcodeScanner.hideBackground();
    const result = await BarcodeScanner.startScan();
    if (result.hasContent) {
      alert("Scanned: " + result.content);
      await BarcodeScanner.stopScan();
      await BarcodeScanner.showBackground();
    }
  };

  startScan();

  return () => {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
  };
}, []);

  const handleQRScan = async (qrContent: string) => {
    const [promotionId, userIdFromQR] = qrContent.trim().split("|")

    try {
      if (!promotionId || !userIdFromQR) throw new Error("QR non valido")

      const response = await fetch("/api/scan-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoId: promotionId, userId: userIdFromQR }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Errore durante la scansione")
      }

      const [{ data: promotion }, { data: user }] = await Promise.all([
        supabase.from("promozioni").select("*").eq("id", promotionId).single(),
        supabase.from("utenti").select("nome").eq("id", userIdFromQR).single(),
      ])

      if (!promotion || !user) {
        throw new Error("Dati promozione o utente non trovati")
      }

      const scannedData: ScannedPromotion = {
        id: promotion.id,
        name: promotion.name,
        discount: promotion.discount,
        discountType: promotion.discount_type,
        customerName: user.nome,
        timestamp: new Date().toISOString(),
        numero_scan: (promotion.numero_scan || 0) + 1,
      }

      onScanSuccess(scannedData)
      toast.success(`Promozione "${promotion.name}" attivata da ${user.nome}!`)
    } catch (err) {
      console.error(err)
      toast.error("Errore nella scansione o QR non valido")
      onScanError()
    }
  }

  return (
    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
      {isScanning ? (
        <>
          {!usingNativeScanner && <div id="qr-reader" className="w-full h-full" />}
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
  )
}

