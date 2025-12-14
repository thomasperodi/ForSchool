"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gift, Euro, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export default function CreateGroupPage() {
  const router = useRouter();
  
  const [nome, setNome] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const createGroup = async () => {
    if (!nome.trim()) {
      toast.error("Inserisci un nome per il gruppo");
      return;
    }

    if (!budget || budget <= 0) {
      toast.error("Inserisci un budget valido");
      return;
    }

    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const creatorId = auth?.user?.id;

      if (!creatorId) {
        toast.error("Non sei autenticato");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/secret-santa/create-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          budget,
          creatorId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Errore nella creazione del gruppo");
        setLoading(false);
        return;
      }

      const data = await res.json();
      toast.success("Gruppo creato con successo! 🎉");
      router.push(`/secret-santa/group/${data.groupId}`);
    } catch (error) {
      toast.error("Errore nella creazione del gruppo");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Indietro</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-8 h-8 text-red-300" />
            <h1 className="text-4xl font-extrabold">Crea Secret Santa</h1>
          </div>
          <p className="text-gray-300">Configura il tuo gruppo di regali segreti</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Informazioni base
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Nome del gruppo *
              </label>
              <input
                type="text"
                placeholder="Es: Secret Santa Classe 5A"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Budget (€) *
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="25.00"
                  value={budget ?? ""}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Il budget massimo per ogni regalo
              </p>
            </div>
          </div>

          {/* Pulsante crea */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-all"
            >
              Annulla
            </button>
            <button
              onClick={createGroup}
              disabled={loading || !nome.trim() || !budget || budget <= 0}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Creazione...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  Crea gruppo
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
