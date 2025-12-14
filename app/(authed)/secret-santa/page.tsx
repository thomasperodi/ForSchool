"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gift, Users, Mail, Plus, ArrowRight, Calendar, Euro, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

interface Invite {
  id: string;
  group_name: string;
  token: string;
  created_at?: string;
}

interface Group {
  id: string;
  nome: string;
  budget: number;
  status?: string;
  participantsCount?: number;
  acceptedCount?: number;
  created_at?: string;
}

export default function SecretSantaDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      // Recupera il token dalla sessione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessione non valida");
      }

      const res = await fetch("/api/secret-santa/dashboard", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) throw new Error("Errore nel caricamento");
      
      const data = await res.json();
      setMyGroups(data.groups || []);
      setReceivedInvites(data.invites || []);
    } catch {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      draft: { label: "Bozza", color: "bg-gray-500" },
      locked: { label: "Bloccato", color: "bg-yellow-500" },
      drawn: { label: "Estratto", color: "bg-green-500" },
      closed: { label: "Chiuso", color: "bg-red-500" },
    };
    
    const statusInfo = status ? statusMap[status] : null;
    if (!statusInfo) return null;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  /* =========================
     LOADING
  ========================= */
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
          <p className="text-xl font-medium tracking-wide">Caricamento Secret Santa…</p>
        </motion.div>
      </div>
    );
  }

  const totalGroups = myGroups.length;
  const totalInvites = receivedInvites.length;
  const activeGroups = myGroups.filter(g => g.status === "drawn" || g.status === "locked").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* =========================
           HEADER CON STATISTICHE
        ========================= */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <Gift className="w-10 h-10 text-red-300" />
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
              Secret Santa
            </h1>
          </div>
          <p className="text-gray-300 text-lg">
            Organizza regali, inviti e sorprese natalizie 🎅
          </p>

          {/* Statistiche rapide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center"
            >
              <Users className="w-6 h-6 mx-auto mb-2 text-red-300" />
              <p className="text-2xl font-bold">{totalGroups}</p>
              <p className="text-xs text-gray-300">Gruppi</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center"
            >
              <Mail className="w-6 h-6 mx-auto mb-2 text-yellow-300" />
              <p className="text-2xl font-bold">{totalInvites}</p>
              <p className="text-xs text-gray-300">Inviti</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center"
            >
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-green-300" />
              <p className="text-2xl font-bold">{activeGroups}</p>
              <p className="text-xs text-gray-300">Attivi</p>
            </motion.div>
          </div>
        </motion.header>

        {/* =========================
           CREA GRUPPO - CTA PRINCIPALE
        ========================= */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gradient-to-r from-red-600/20 to-red-700/20 backdrop-blur-lg border-2 border-red-400/30 rounded-2xl p-6 hover:border-red-400/50 transition-all cursor-pointer group"
            onClick={() => router.push("/secret-santa/create")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition">
                  <Plus className="w-6 h-6 text-red-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Crea un nuovo gruppo</h2>
                  <p className="text-sm text-gray-300">
                    Imposta budget, regole e invita i tuoi amici
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-red-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* =========================
             INVITI RICEVUTI
          ========================= */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-yellow-300" />
                <h2 className="text-xl font-bold">Inviti ricevuti</h2>
              </div>
              {receivedInvites.length > 0 && (
                <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                  {receivedInvites.length}
                </span>
              )}
            </div>

            {receivedInvites.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nessun invito in sospeso</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedInvites.map((invite, idx) => (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all cursor-pointer group"
                    onClick={() => router.push(`/secret-santa/invite/${invite.token}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-lg mb-1">{invite.group_name}</p>
                        {invite.created_at && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(invite.created_at)}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* =========================
             I MIEI GRUPPI
          ========================= */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-300" />
                <h2 className="text-xl font-bold">I miei gruppi</h2>
              </div>
              {myGroups.length > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {myGroups.length}
                </span>
              )}
            </div>

            {myGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">Non fai ancora parte di nessun gruppo</p>
                <button
                  onClick={() => router.push("/secret-santa/create")}
                  className="text-sm text-red-300 hover:text-red-200 underline"
                >
                  Crea il primo gruppo
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {myGroups.map((group, idx) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all cursor-pointer group"
                    onClick={() => router.push(`/secret-santa/group/${group.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">{group.nome}</h3>
                          {getStatusBadge(group.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            {group.budget}€
                          </span>
                          {group.participantsCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {group.participantsCount} membri
                            </span>
                          )}
                        </div>
                        {group.created_at && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Creato il {formatDate(group.created_at)}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Pulsante refresh */}
        <div className="flex justify-center">
          <button
            onClick={() => loadDashboard(false)}
            disabled={refreshing}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {refreshing ? "Aggiornamento..." : "Aggiorna"}
          </button>
        </div>
      </div>
    </div>
  );
}
