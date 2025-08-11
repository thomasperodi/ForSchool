"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QrCode, Camera, CheckCircle, XCircle, Scan } from 'lucide-react'
import toast from 'react-hot-toast'
import { QRScanner } from "./QRscanner"

interface ScannedPromotion {
  id: string
  name: string
  discount: string
  discountType: 'percentage' | 'fixed'
  customerName?: string // Make customerName optional
  timestamp: string
}

export default function ScannerPage() {
    const [isScanning, setIsScanning] = useState(false)
    const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null)
    const [scannedPromotion, setScannedPromotion] = useState<ScannedPromotion | null>(null)
    const [recentScans, setRecentScans] = useState<ScannedPromotion[]>([])

    const handleScanSuccess = (promotion: ScannedPromotion) => {
        setScanResult('success');
        console.log(promotion)
        console.log(promotion.id)
        setScannedPromotion(promotion);
        setRecentScans(prev => [promotion, ...prev.slice(0, 4)]);
        setIsScanning(false);
    };

    const handleScanError = () => {
        setScanResult('error');
        setScannedPromotion(null);
        setIsScanning(false);
    };

    const startScanning = () => {
        setIsScanning(true);
        setScanResult(null);
        setScannedPromotion(null);
    };

    const stopScanning = () => {
        setIsScanning(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Scanner QR Code</h1>
                <p className="text-muted-foreground">
                    Scansiona i QR code dei clienti per attivare le promozioni
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Scanner */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            Scanner QR Code
                        </CardTitle>
                        <CardDescription>
                            Inquadra il QR code del cliente per attivare la promozione
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Area video per la fotocamera gestita dal QRScanner */}
                        <QRScanner
                            onScanSuccess={handleScanSuccess}
                            onScanError={handleScanError}
                            isScanning={isScanning}
                            setIsScanning={setIsScanning}
                        />
                        

                        {/* Controlli */}
                        <div className="flex gap-2">
                            {!isScanning ? (
                                <Button onClick={startScanning} className="flex-1">
                                    <Camera className="mr-2 h-4 w-4" />
                                    Avvia Scanner
                                </Button>
                            ) : (
                                <Button onClick={stopScanning} variant="outline" className="flex-1">
                                    Ferma Scanner
                                </Button>
                            )}
                        </div>

                        {/* Risultato scansione */}
                        {scanResult && (
                            <Alert className={scanResult === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                                {scanResult === 'success' ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <AlertDescription className={scanResult === 'success' ? 'text-green-800' : 'text-red-800'}>
                                    {scanResult === 'success'
                                        ? 'Scansione completata con successo!'
                                        : 'Errore nella scansione. Riprova.'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Dettagli promozione scansionata */}
                        {scannedPromotion && (
                            <Card className="border-green-200 bg-green-50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg text-green-800">Promozione Attivata</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Promozione:</span>
                                        <span>{scannedPromotion.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Sconto:</span>
                                        <Badge className="bg-green-100 text-green-800">
                                            {scannedPromotion.discount}{scannedPromotion.discountType === 'percentage' ? '%' : '€'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Cliente:</span>
                                        <span>{scannedPromotion.customerName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Orario:</span>
                                        <span>{new Date(scannedPromotion.timestamp).toLocaleTimeString('it-IT')}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>

                {/* Scansioni recenti */}
                <Card>
                    <CardHeader>
                        <CardTitle>Scansioni Recenti</CardTitle>
                        <CardDescription>
                            Ultime promozioni attivate tramite scanner
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentScans.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Nessuna scansione recente</p>
                                <p className="text-sm">Le scansioni appariranno qui</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentScans.map((scan, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="space-y-1">
                                            <div className="font-medium">{scan.name}</div>
                                            <div className="text-sm text-gray-500">{scan.customerName}</div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <Badge variant="outline">
                                                {scan.discount}{scan.discountType === 'percentage' ? '%' : '€'}
                                            </Badge>
                                            <div className="text-xs text-gray-500">
                                                {new Date(scan.timestamp).toLocaleTimeString('it-IT')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
