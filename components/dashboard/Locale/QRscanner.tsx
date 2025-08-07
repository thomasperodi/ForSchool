// QRscanner.tsx

"use client"

import { useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { toast } from 'react-hot-toast'
import { QrCode, Scan } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

// Define the interface for the scanned promotion
export interface ScannedPromotion {
    id: string
    name: string
    discount: string
    discountType: 'percentage' | 'fixed'
    customerName?: string
    timestamp: string
    numero_scan?: number
}

interface QRScannerProps {
    onScanSuccess: (promotion: ScannedPromotion) => void;
    onScanError: () => void;
    isScanning: boolean;
    setIsScanning: (value: boolean) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError, isScanning, setIsScanning }) => {
    const qrboxSize = 250;
    const config = {
        fps: 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        supportedScanFormats: [Html5QrcodeSupportedFormats.QR_CODE],
        rememberLastUsedCamera: true
    };
    const html5QrCode = useRef<Html5Qrcode | null>(null);

    // This useEffect handles the full lifecycle of the scanner
    useEffect(() => {
        // Ensure the div exists and isScanning is true before attempting to start
        if (isScanning) {
            html5QrCode.current = new Html5Qrcode('qr-reader');
            html5QrCode.current.start(
                { facingMode: "environment" },
                config,
                async (decodedText) => {
                    if (html5QrCode.current && html5QrCode.current.isScanning) {
                        await html5QrCode.current.stop();
                        setIsScanning(false);
                        handleQRScan(decodedText);
                    }
                },
                (errorMessage) => {
                    // Ignora gli errori minori durante la scansione
                }
            ).catch((err) => {
                console.error('Errore durante l’avvio dello scanner', err);
                toast.error('Errore nell’avvio della fotocamera');
                setIsScanning(false);
                onScanError();
            });
        }

        return () => {
            // Cleanup function to stop the scanner when component unmounts or isScanning becomes false
            const stopScanner = async () => {
                if (html5QrCode.current && html5QrCode.current.isScanning) {
                    try {
                        await html5QrCode.current.stop();
                    } catch (err) {
                        console.error('Errore nello stop dello scanner', err);
                    }
                }
            };
            stopScanner();
        };
    }, [isScanning, onScanError, setIsScanning]); // Depend on isScanning to re-run the effect

    const handleQRScan = async (qrContent: string) => {
      
        const promotionId = qrContent.trim();
        console.log("promotionid ", promotionId)
        try {
            const { data: promotion, error } = await supabase
                .from('promozioni')
                .select('*')
                .eq('id', promotionId)
                .single();

            if (error || !promotion) {
                throw new Error('Promozione non trovata');
            }

            const newNumeroScan = (promotion.numero_scan || 0) + 1;
            const { error: updateError } = await supabase
                .from('promozioni')
                .update({ numero_scan: newNumeroScan })
                .eq('id', promotionId);

            if (updateError) {
                throw new Error('Errore aggiornamento contatore');
            }

            const scannedData: ScannedPromotion = {
                id: promotion.id,
                name: promotion.name,
                discount: promotion.discount,
                discountType: promotion.discount_type,
                customerName: 'Cliente generico', // Placeholder
                timestamp: new Date().toISOString(),
                numero_scan: newNumeroScan
            };

            onScanSuccess(scannedData);
            toast.success(`Promozione "${promotion.name}" attivata!`);

        } catch (err) {
            console.error(err);
            toast.error('Errore nella scansione o QR non valido');
            onScanError();
        }
    };

    return (
        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {isScanning ? (
                <div className="w-full h-full">
                    <div id="qr-reader" className="w-full h-full" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                            <Scan className="h-8 w-8 text-white animate-pulse" />
                        </div>
                    </div>
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