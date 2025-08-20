"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Importa AnimatePresence per animazioni di uscita
import { FilterSection } from "@/components/Promozioni/FilterSection";
import { PromoGrid } from "@/components/Promozioni/PromoGrid";
import { GetLocaliWithPromozioni } from "@/lib/database-functions";
import { LocaliWithPromo } from "@/types/database";
import { supabase } from "@/lib/supabaseClient";
import { Geolocation } from '@capacitor/geolocation';
/**
 * Componente per la visualizzazione di messaggi temporanei (successo, errore, info).
 * Sostituisce la funzione alert() nativa.
 * @param {Object} props - Proprietà del componente.
 * @param {string | null} props.message - Il messaggio da visualizzare.
 * @param {'success' | 'error' | 'info'} props.type - Il tipo di messaggio (determina lo stile).
 * @param {() => void} props.onClose - Funzione di callback per chiudere il messaggio.
 */
const MessageBox = ({ message, type, onClose }: { message: string | null; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  if (!message) return null;

  // Stili Tailwind per i diversi tipi di messaggio
  const bgColor = type === 'success' ? 'bg-green-100' : type === 'error' ? 'bg-red-100' : 'bg-blue-100';
  const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';
  const borderColor = type === 'success' ? 'border-green-400' : type === 'error' ? 'border-red-400' : 'border-blue-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }} // Animazione di uscita
      className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg flex items-center justify-between z-50 ${bgColor} ${textColor} border ${borderColor}`}
      style={{ minWidth: '300px' }}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-lg font-bold">
        &times;
      </button>
    </motion.div>
  );
};




// Categorie disponibili per il filtraggio
const categories = ["Bar", "Ristorante", "Pizzeria", "Caffè", "Discoteca", "Gelateria"];

const Promozioni = () => {
  // Stati per i filtri delle promozioni
  const [distance, setDistance] = useState<number[]>([10]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Stato per i dati dei locali con promozioni
  const [locali, setLocali] = useState<LocaliWithPromo | null>(null);

  // Stato per gestire lo stato di caricamento del riscatto
  const [loadingRedeem, setLoadingRedeem] = useState(false);

  // Stato per l'ID dell'utente autenticato
  const [userId, setUserId] = useState<string | null>(null);

  // Stati per le informazioni sui riscatti e il countdown
  const [nextRedeemInSeconds, setNextRedeemInSeconds] = useState<number>(0);
  const [riscattiUsati, setRiscattiUsati] = useState<number>(0);
  const [countdown, setCountdown] = useState("0g 0h 0m 0s"); // Formato più completo
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Nuovi stati per il piano dell'utente e il numero massimo di riscatti consentiti
  const [userPlan, setUserPlan] = useState<string>("free");
  const [maxRiscattiAllowed, setMaxRiscattiAllowed] = useState<number>(4); // Default per 'free'

  // Stati per la MessageBox personalizzata
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');


  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  /**
   * Mostra un messaggio nella MessageBox personalizzata e lo nasconde dopo 5 secondi.
   * @param {string} msg - Il messaggio da visualizzare.
   * @param {'success' | 'error' | 'info'} type - Il tipo di messaggio.
   */
  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    // Nasconde automaticamente il messaggio dopo 5 secondi
    setTimeout(() => {
      setMessage(null);
    }, 5000);
  };


  function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raggio terrestre in km
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

  


async function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    // 1. Check current permission status
    const permissionStatus = await Geolocation.checkPermissions();

    if (permissionStatus.location === 'denied') {
      // If permission is denied, log an error or show a message to the user
      // so they can enable it manually from the app settings.
      showMessage("Permesso di geolocalizzazione negato. Abilitalo dalle impostazioni del dispositivo per trovare le promozioni vicine.", "error");
      return null;
    }

    // 2. Request permissions if not granted
    if (permissionStatus.location !== 'granted') {
      const requestResult = await Geolocation.requestPermissions();
      if (requestResult.location !== 'granted') {
        showMessage("Permesso di geolocalizzazione non concesso.", "error");
        return null;
      }
    }

    // 3. Get the current position
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
  } catch (error) {
    console.error("Errore nel recupero della geolocalizzazione:", error);
    showMessage("Impossibile recuperare la tua posizione. Controlla le impostazioni di geolocalizzazione.", "error");
    return null;
  }
}

useEffect(() => {
    getUserLocation().then(setUserLocation).catch(console.error);
  }, []);

  // Effetto per recuperare i dati iniziali (utente e locali con promozioni)
  useEffect(() => {
    const fetchData = async () => {
      // Recupera l'utente autenticato da Supabase
      const { data: userData } = await supabase.auth.getUser();
      const utenteId = userData?.user?.id || "";
      setUserId(utenteId);

      // Recupera i locali con promozioni
      const data = await GetLocaliWithPromozioni();
      console.log("Locali con promozioni:", data);
      setLocali(data);
    };

    fetchData();
  }, []); // Eseguito solo al mount del componente

  // Effetto per recuperare le informazioni sui riscatti dell'utente
  // Dipende da userId e loadingRedeem per aggiornare lo stato dopo un riscatto o un countdown.
  useEffect(() => {
    if (!userId) return; // Non procedere se l'ID utente non è disponibile

    const fetchRedeemInfo = async () => {
      try {
        // Chiama l'API per verificare la possibilità di riscatto
        const res = await fetch(`/api/promozioni/can-redeem?utente_id=${userId}`);
        const data = await res.json();

        // Aggiorna gli stati con le informazioni ricevute
        setNextRedeemInSeconds(data.nextRedeemInSeconds ?? 0);
        setRiscattiUsati(typeof data.riscattiQuestoMese === "number" ? data.riscattiQuestoMese : 0);

        // Determina il piano dell'utente e i riscatti massimi consentiti
        // Utilizza direttamente il campo 'piano' dall'API
        const detectedPlan = (data.piano || "free").toLowerCase(); // Assicurati che sia sempre lowercase
        let detectedMaxRiscatti: number | typeof Infinity = 4; // Default per 'free'
        console.log("Piano rilevato:", detectedPlan);
        switch (detectedPlan) {
          case "elitè":
            detectedMaxRiscatti = Infinity; // Illimitati
            break;
          case "plus":
            detectedMaxRiscatti = 15;
            break;
          case "free":
          default:
            detectedMaxRiscatti = 4;
            break;
        }

        setUserPlan(detectedPlan);
        setMaxRiscattiAllowed(detectedMaxRiscatti);

      } catch (error) {
        console.error("Errore nel recupero delle informazioni sui riscatti:", error);
        // Resetta gli stati in caso di errore
        setNextRedeemInSeconds(0);
        setRiscattiUsati(0);
        setUserPlan("free");
        setMaxRiscattiAllowed(4);
        showMessage("Impossibile recuperare le informazioni sui riscatti. Riprova.", "error");
      }
    };

    fetchRedeemInfo();
  }, [userId, loadingRedeem]); // Dipendenze: si ricarica quando userId cambia o loadingRedeem viene toggled

  // Effetto per gestire il countdown del prossimo riscatto
  useEffect(() => {
    if (nextRedeemInSeconds > 0) {
      let remaining = nextRedeemInSeconds;

      const tick = () => {
        if (remaining <= 0) {
          setCountdown("0g 0h 0m 0s");
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Quando il countdown finisce, forza un nuovo recupero delle info per aggiornare lo stato di riscatto
          if (userId) {
            setLoadingRedeem(prev => !prev); // Toggla lo stato per triggerare l'useEffect precedente
          }
          return;
        }

        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);

        // Formatta il countdown mostrando solo le unità necessarie
        const formattedParts = [];
        if (days > 0) formattedParts.push(`${days}g`);
        if (hours > 0 || (days > 0 && minutes > 0) || (days === 0 && hours > 0) || (days === 0 && hours === 0 && minutes > 0)) formattedParts.push(`${hours}h`);
        if (minutes > 0 || (hours > 0 && seconds > 0) || (days === 0 && hours === 0 && minutes > 0)) formattedParts.push(`${minutes}m`);
        if (seconds > 0 || formattedParts.length === 0) formattedParts.push(`${seconds}s`); // Mostra sempre i secondi se non ci sono altre unità o se è l'ultima

        setCountdown(formattedParts.join(" "));
        remaining -= 1;
      };

      tick(); // Chiamata iniziale per impostare il countdown immediatamente
      intervalRef.current = setInterval(tick, 1000); // Aggiorna ogni secondo

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current); // Pulisce l'intervallo al cleanup
      };
    } else {
      // Resetta il countdown e pulisce l'intervallo se non ci sono secondi rimanenti
      setCountdown("0g 0h 0m 0s");
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [nextRedeemInSeconds, userId]); // Dipendenze: si ricarica quando i secondi cambiano o userId cambia

  // Filtra le promozioni in base a distanza e categoria
// Filtra le promozioni in base a distanza e categoria
const filteredPromotions =
  locali && userLocation
    ? locali
        .flatMap((locale) => {
          const distanza = haversineDistance(
            userLocation.lat,
            userLocation.lng,
            locale.latitudine || 0,
            locale.longitudine || 0
          );

          return locale.promozioni.map((promo) => ({
            id: promo.id,
            name: locale.name,
            category: locale.category,
            description: promo.description ?? "",
            discount: promo.discount ?? "",
            validUntil: promo.valid_until ?? "",
            image: locale.image_url ?? "https://source.unsplash.com/800x600/?bar",
            distance: distanza,
            locale_id: locale.id,
            images: locale.immagini_locali ?? [],
          }));
        })
        .filter((promo) => {
          const withinDistance = promo.distance <= distance[0];
          const categoryMatch =
            selectedCategory === "all" || promo.category === selectedCategory;
          return withinDistance && categoryMatch;
        })
        .sort((a, b) => a.distance - b.distance) // ordina per distanza crescente
    : [];



  /**
   * Gestisce il processo di riscatto di una promozione.
   * @param {string} promoId - L'ID della promozione da riscattare.
   */
  async function handleRedeem(promoId: string) {
    if (loadingRedeem) return; // Evita clic multipli mentre un riscatto è in corso
    setLoadingRedeem(true); // Imposta lo stato di caricamento

    try {
      // 1. Prima verifica l'eligibilità al riscatto tramite l'API
      const res = await fetch(`/api/promozioni/can-redeem?utente_id=${userId}`);
      const data = await res.json();

      if (!data.canRedeem) {
        // Se non è possibile riscattare, mostra il motivo e ferma l'operazione
        showMessage(`Non puoi riscattare la promozione: ${data.reason}`, "error");
        setLoadingRedeem(false);
        return;
      }

      // 2. Se l'utente è idoneo, procede con la richiesta di riscatto effettiva
      const redeemRes = await fetch(`/api/promozioni/redeem-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utente_id: userId, promozione_id: promoId }),
      });

      if (!redeemRes.ok) {
        // Se la richiesta di riscatto non va a buon fine, mostra un errore
        const errorData = await redeemRes.json();
        showMessage(`Errore nel riscattare la promozione: ${errorData.reason || 'Riprova.'}`, "error");
        setLoadingRedeem(false);
        return;
      }

      // 3. Se il riscatto ha successo, mostra un messaggio di successo
      showMessage("Promozione riscattata con successo!", "success");
      setLoadingRedeem(false);
      // Forza un aggiornamento delle informazioni sui riscatti per riflettere il nuovo stato
      setLoadingRedeem(prev => !prev); // Toggla lo stato per triggerare l'useEffect di recupero info
    } catch (error) {
      console.error("Errore durante il riscatto:", error);
      showMessage("Errore di rete, riprova più tardi.", "error");
      setLoadingRedeem(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* MessageBox per le notifiche */}
      <AnimatePresence>
        <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />
      </AnimatePresence>

      <header className="h-16 flex items-center justify-center px-6 border-border backdrop-blur-sm sticky top-0 z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-bold text-center bg-clip-text">Promozioni</h1>
          <p className="text-center mt-2 bg-clip-text">Scopri le fantastiche promozioni vicino a te!</p>
        </motion.div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Sezione per i filtri */}
          <FilterSection
            distance={distance}
            onDistanceChange={setDistance}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categories}
          />

          {/* Informazioni sui riscatti e countdown */}
          <div className="mb-6 p-5 bg-yellow-50 border border-yellow-300 rounded-lg text-center text-sm max-w-md mx-auto">
            {userPlan !== "elitè" ? (
              // Visualizza i riscatti usati e il limite per i piani Free e Plus
              <p className="mb-2 font-medium">
                Riscatti effettuati questo mese: <strong>{riscattiUsati} / {maxRiscattiAllowed !== Infinity ? maxRiscattiAllowed : 'Illimitati'}</strong>
              </p>
            ) : (
              // Messaggio specifico per il piano Elite
              <p className="mb-2 font-medium text-purple-700">
                Hai il piano **Elitè**: Riscatti **illimitati** questo mese! 🎉
              </p>
            )}

            {/* Messaggi condizionali basati sul piano e sullo stato di riscatto */}
            {userPlan === "elitè" ? (
              <p className="mb-3 text-green-700 font-semibold">
                Non hai limiti di tempo o di riscatti.
              </p>
            ) : userPlan === "plus" ? (
              riscattiUsati < maxRiscattiAllowed ? (
                <p className="mb-3 text-green-700 font-semibold">
                  Puoi riscattare una nuova promozione ora!
                </p>
              ) : (
                <p className="mb-3 text-red-700 font-semibold">
                  Hai raggiunto il limite di riscatti per il piano Plus.
                </p>
              )
            ) : ( // Piano Free (default)
              riscattiUsati < maxRiscattiAllowed ? (
                nextRedeemInSeconds > 0 ? (
                  <p className="mb-3 text-yellow-700">
                    Prossimo riscatto possibile tra: <strong>{countdown}</strong>
                  </p>
                ) : (
                  <p className="mb-3 text-green-700 font-semibold">
                    Puoi riscattare una nuova promozione ora!
                  </p>
                )
              ) : (
                <p className="mb-3 text-red-700 font-semibold">
                  Hai raggiunto il limite mensile di riscatti per il piano Free.
                </p>
              )
            )}

            {/* Bottone "Abbonati per più riscatti" visibile solo se il piano non è Elite */}
            {userPlan !== "elitè" && (
              <div className="mt-4 pt-4 border-t border-yellow-300">
                <p className="mb-3 text-gray-700 font-medium">
                  Non vuoi aspettare o vuoi più riscatti mensili?
                </p>
                <button
                  className="px-5 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
                  onClick={() => window.location.href = "/#promo"}
                  aria-label="Abbonati per più riscatti"
                >
                  Abbonati per più riscatti
                </button>
              </div>
            )}
          </div>

          {/* Griglia delle promozioni */}
          <PromoGrid promotions={filteredPromotions} onRedeem={handleRedeem} redeeming={loadingRedeem}  />
        </div>
      </main>
    </div>
  );
};

export default Promozioni;