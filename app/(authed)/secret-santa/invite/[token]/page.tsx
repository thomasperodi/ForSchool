"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gift, Mail, Users, Euro, CheckCircle, XCircle, ArrowRight, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface Invite {
  invite_id: string;
  group_id: string;
  group_name: string;
  email: string;
  invited_by?: string;
  created_at?: string;
}

interface GroupInfo {
  nome: string;
  budget: number;
  created_at?: string;
}

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/secret-santa/invite?token=${token}`);
      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "Invito non valido");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setInvite(data);

      // Carica informazioni aggiuntive sul gruppo
      if (data.group_id) {
        const groupRes = await fetch(`/api/secret-santa/group?groupId=${data.group_id}`);
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupInfo(groupData.group);
        }
      }
    } catch (error) {
      setError("Errore nel caricamento dell'invito");
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    setAccepting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      if (!userId) {
        toast.error("Devi essere autenticato per accettare l'invito");
        setAccepting(false);
        return;
      }

      const res = await fetch("/api/secret-santa/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Errore nell'accettazione dell'invito");
        setAccepting(false);
        return;
      }

      const data = await res.json();
      toast.success("Invito accettato! 🎉");
      router.push(`/secret-santa/group/${data.groupId}`);
    } catch (error) {
      toast.error("Errore nell'accettazione dell'invito");
      setAccepting(false);
    }
  };

  const decline = async () => {
    if (!confirm("Sei sicuro di voler rifiutare questo invito?")) {
      return;
    }

    setDeclining(true);
    try {
      const res = await fetch("/api/secret-santa/decline-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Errore nel rifiuto dell'invito");
        setDeclining(false);
        return;
      }

      toast.success("Invito rifiutato");
      router.push("/secret-santa");
    } catch (error) {
      toast.error("Errore nel rifiuto dell'invito");
      setDeclining(false);
    }
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
          <p className="text-xl font-medium">Caricamento invito...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-md mx-auto px-4"
        >
          <XCircle className="w-16 h-16 mx-auto text-red-400" />
          <div>
            <h1 className="text-2xl font-bold mb-2">Invito non valido</h1>
            <p className="text-gray-300 mb-6">
              {error || "Questo invito non esiste o è scaduto."}
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
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Gift className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-extrabold mb-2">Invito a Secret Santa</h1>
            <p className="text-gray-300">Sei stato invitato a partecipare!</p>
          </div>

          {/* Info gruppo */}
          <div className="bg-white/5 rounded-2xl p-6 mb-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                {invite.group_name}
              </h2>
            </div>

            {groupInfo && (
              <>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Euro className="w-5 h-5" />
                    <span>Budget: <span className="text-white font-semibold">{groupInfo.budget}€</span></span>
                  </div>
                </div>
              </>
            )}

            {invite.created_at && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Invito ricevuto il {new Date(invite.created_at).toLocaleDateString("it-IT")}
                </p>
              </div>
            )}
          </div>

          {/* Azioni */}
          <div className="space-y-3">
            <button
              onClick={accept}
              disabled={accepting || declining}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Accettazione...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Accetta invito
                </>
              )}
            </button>

            <button
              onClick={decline}
              disabled={accepting || declining}
              className="w-full px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {declining ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Rifiuto...
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Rifiuta invito
                </>
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/secret-santa")}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Torna alla dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
