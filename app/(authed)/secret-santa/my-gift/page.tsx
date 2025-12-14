"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, ArrowLeft, Users, Euro, Sparkles, Mail, Calendar } from "lucide-react";
import toast from "react-hot-toast";

interface Match {
  id: string;
  group_id: string;
  group_name: string;
  group_budget: number;
  receiver_id: string;
  receiver_name: string;
  receiver_email: string;
  created_at: string;
}

export default function MyGiftPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");

  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [groupId]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const url = groupId
        ? `/api/secret-santa/my-gift?groupId=${groupId}`
        : "/api/secret-santa/my-gift";
      
      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 404) {
          // Nessun abbinamento trovato
          setMatches([]);
          setLoading(false);
          return;
        }
        throw new Error(error.error || "Errore nel caricamento");
      }

      const data = await res.json();
      const matchesArray = Array.isArray(data.matches) ? data.matches : [data.matches];
      setMatches(matchesArray.filter(Boolean));
      
      if (matchesArray.length > 0) {
        setCurrentMatch(matchesArray[0]);
      }
    } catch (error) {
      toast.error("Errore nel caricamento degli abbinamenti");
    } finally {
      setLoading(false);
    }
  };

  const revealMatch = (matchId: string) => {
    setRevealed((prev) => ({ ...prev, [matchId]: true }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mx-auto"
          >
            🎄
          </motion.div>
          <p className="text-xl font-medium">Caricamento abbinamenti...</p>
        </motion.div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-md mx-auto px-4"
        >
          <Gift className="w-16 h-16 mx-auto text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold mb-2">Nessun abbinamento trovato</h1>
            <p className="text-gray-300 mb-6">
              Non hai ancora abbinamenti assegnati. Gli abbinamenti verranno generati quando il proprietario del gruppo li creerà.
            </p>
            <button
              onClick={() => router.push("/secret-santa")}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition-colors"
            >
              Torna alla dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push("/secret-santa")}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Indietro</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-8 h-8 text-red-300" />
            <h1 className="text-4xl font-extrabold">I miei abbinamenti</h1>
          </div>
          <p className="text-gray-300">
            Scopri a chi devi fare il regalo! 🎁
          </p>
        </motion.div>

        {/* Lista abbinamenti se ce ne sono più di uno */}
        {matches.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4"
          >
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              I tuoi gruppi ({matches.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => setCurrentMatch(match)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    currentMatch?.id === match.id
                      ? "bg-red-600 text-white"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="font-semibold">{match.group_name}</p>
                  <p className="text-xs opacity-75">
                    Budget: {match.group_budget}€
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Card abbinamento principale */}
        {currentMatch && (
          <motion.div
            key={currentMatch.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
              {/* Overlay blur se non rivelato */}
              <AnimatePresence>
                {!revealed[currentMatch.id] && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-gradient-to-br from-red-900/90 to-black/90 backdrop-blur-md rounded-3xl flex items-center justify-center cursor-pointer z-10"
                    onClick={() => revealMatch(currentMatch.id)}
                  >
                    <div className="text-center space-y-4">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-6xl"
                      >
                        🎁
                      </motion.div>
                      <p className="text-2xl font-bold">Tocca per rivelare</p>
                      <p className="text-gray-300 text-sm">
                        Scopri a chi devi fare il regalo!
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contenuto rivelato */}
              <AnimatePresence>
                {revealed[currentMatch.id] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Info gruppo */}
                    <div className="text-center mb-6">
                      <div className="inline-block px-4 py-2 bg-white/10 rounded-full mb-4">
                        <p className="text-sm text-gray-300">{currentMatch.group_name}</p>
                      </div>
                      <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-300" />
                        Il tuo destinatario
                      </h2>
                    </div>

                    {/* Nome destinatario */}
                    <div className="text-center py-8">
                      <p className="text-lg text-gray-300 mb-4">Devi fare un regalo a:</p>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="inline-block"
                      >
                        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-red-300 to-red-500 bg-clip-text text-transparent">
                          {currentMatch.receiver_name}
                        </h1>
                      </motion.div>
                    </div>

                    {/* Info aggiuntive */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-white/10">
                      <div className="bg-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Euro className="w-5 h-5 text-green-300" />
                          <span className="text-sm text-gray-300">Budget</span>
                        </div>
                        <p className="text-2xl font-bold">{currentMatch.group_budget}€</p>
                      </div>

                      {currentMatch.receiver_email && (
                        <div className="bg-white/5 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className="w-5 h-5 text-blue-300" />
                            <span className="text-sm text-gray-300">Email</span>
                          </div>
                          <p className="text-sm font-medium break-all">
                            {currentMatch.receiver_email}
                          </p>
                        </div>
                      )}

                      {currentMatch.created_at && (
                        <div className="bg-white/5 rounded-xl p-4 md:col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5 text-purple-300" />
                            <span className="text-sm text-gray-300">Abbinamento creato il</span>
                          </div>
                          <p className="text-sm font-medium">
                            {new Date(currentMatch.created_at).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Messaggio */}
                    <div className="text-center pt-4">
                      <p className="text-gray-300 text-sm">
                        Buon divertimento con il tuo regalo! 🎄✨
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

