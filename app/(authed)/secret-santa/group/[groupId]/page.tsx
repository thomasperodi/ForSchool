"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Mail,
  Euro,
  Gift,
  Sparkles,
  UserPlus,
  CheckCircle,
  XCircle,
  FileText,
  Settings,
  Shuffle,
  Crown,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Group {
  id: string;
  nome: string;
  budget: number;
  creator_id: string;
  created_at?: string;
}

interface Member {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  joined_at?: string;
  is_creator: boolean;
}

interface Stats {
  total: number;
  accepted: number;
  invited: number;
  declined: number;
}

interface Match {
  id: string;
  giver_id: string;
  giver_name: string;
  giver_email: string;
  receiver_id: string;
  receiver_name: string;
  receiver_email: string;
  created_at?: string;
}

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState<string>("");
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, accepted: 0, invited: 0, declined: 0 });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [hasMatches, setHasMatches] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setGroupId(resolvedParams.groupId);
    });
  }, [params]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/secret-santa/group?groupId=${groupId}`);
      if (!res.ok) throw new Error("Errore nel caricamento");

      const data = await res.json();
      setGroup(data.group);
      setMembers(data.members || []);
      setStats(data.stats || { total: 0, accepted: 0, invited: 0, declined: 0 });
      setMatches(data.matches || []);
      setHasMatches(data.hasMatches || false);

      // Verifica se l'utente è il proprietario
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id || null;
      setCurrentUserId(userId);
      setIsOwner(data.group?.creator_id === userId);
    } catch {
      toast.error("Errore nel caricamento del gruppo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      loadGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const sendInvite = async () => {
    if (!email.trim()) {
      toast.error("Inserisci un'email valida");
      return;
    }

    setInviteLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const invitedBy = auth?.user?.id;

      const res = await fetch("/api/secret-santa/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, email, invitedBy }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Errore nell'invio dell'invito");
        return;
      }

      toast.success("Invito inviato con successo! 🎉");
      setEmail("");
      loadGroup();
    } catch {
      toast.error("Errore nell'invio dell'invito");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAssign = () => {
    if (stats.accepted < 2) {
      toast.error("Servono almeno 2 membri accettati per generare gli abbinamenti");
      return;
    }
    setShowConfirmDialog(true);
  };

  const assign = async () => {
    setAssigning(true);
    try {
      const res = await fetch("/api/secret-santa/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Errore nella generazione degli abbinamenti");
        return;
      }

      toast.success("Abbinamenti generati con successo! 🎁");
      setHasMatches(true);
      loadGroup();
    } catch {
      toast.error("Errore nella generazione degli abbinamenti");
    } finally {
      setAssigning(false);
    }
  };

  const getStatusBadge = () => {
    if (hasMatches) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium text-white bg-green-500 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Estratto
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium text-white bg-gray-500 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Bozza
      </span>
    );
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
          <p className="text-xl font-medium">Caricamento gruppo...</p>
        </motion.div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Gruppo non trovato</p>
          <button
            onClick={() => router.push("/secret-santa")}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div className="flex-1">
            <button
              onClick={() => router.push("/secret-santa")}
              className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Indietro</span>
            </button>

            <div className="flex items-center gap-3 mb-3">
              <Gift className="w-8 h-8 text-red-300" />
              <h1 className="text-4xl font-extrabold">{group.nome}</h1>
              {getStatusBadge()}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-gray-300">
              <span className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Budget: <span className="text-white font-semibold">{group.budget}€</span>
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Membri: <span className="text-white font-semibold">{stats.total}</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Statistiche */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-300" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-300">Totale</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-300" />
            <p className="text-2xl font-bold">{stats.accepted}</p>
            <p className="text-xs text-gray-300">Accettati</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
            <Mail className="w-6 h-6 mx-auto mb-2 text-yellow-300" />
            <p className="text-2xl font-bold">{stats.invited}</p>
            <p className="text-xs text-gray-300">In attesa</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-300" />
            <p className="text-2xl font-bold">{stats.declined}</p>
            <p className="text-xs text-gray-300">Rifiutati</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna principale */}
          <div className="lg:col-span-2 space-y-6">

            {/* Lista membri */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Membri del gruppo
                </h2>
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {members.length}
                </span>
              </div>

              {members.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nessun membro ancora</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member, idx) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{member.nome}</h3>
                            {member.is_creator && (
                              <Crown className="w-4 h-4 text-yellow-400" />
                            )}
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-green-500 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Membro
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{member.email}</p>
                          {member.joined_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Unito il {new Date(member.joined_at).toLocaleDateString("it-IT")}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invita membro */}
            {isOwner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Invita membro
                </h2>

                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="email@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendInvite()}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />

                  <button
                    onClick={sendInvite}
                    disabled={inviteLoading || !email.trim()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Invio...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Invia invito
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Azioni */}
            {isOwner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Azioni
                </h2>

                <button
                  onClick={handleAssign}
                  disabled={hasMatches || assigning || stats.accepted < 2}
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {assigning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Generazione...
                    </>
                  ) : hasMatches ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Abbinamenti già generati
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4" />
                      Genera abbinamenti
                    </>
                  )}
                </button>

                {stats.accepted < 2 && !hasMatches && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Servono almeno 2 membri accettati
                  </p>
                )}
              </motion.div>
            )}

            {/* Abbinamento personale - solo a chi devo fare il regalo */}
            {hasMatches && currentUserId && (() => {
              const myMatch = matches.find(m => m.giver_id === currentUserId);
              if (!myMatch) return null;
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-br from-green-600/20 to-green-700/20 backdrop-blur-lg border-2 border-green-400/30 rounded-2xl p-6"
                >
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-green-300" />
                    Il tuo abbinamento
                  </h2>

                  <div className="bg-white/10 rounded-xl p-6 text-center">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-300 mb-2">Devi fare il regalo a:</p>
                        <p className="text-2xl font-bold text-green-300 mb-1">{myMatch.receiver_name}</p>
                        <p className="text-sm text-gray-400">{myMatch.receiver_email}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
                        <Euro className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          Budget: <span className="font-semibold text-white">{group?.budget}€</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Info gruppo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Informazioni
              </h2>

              <div className="space-y-3 text-sm">
                {group.created_at && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Creato il</p>
                    <p className="text-gray-300">
                      {new Date(group.created_at).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {hasMatches && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Abbinamenti generati
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Genera abbinamenti"
        description="Sei sicuro di voler generare gli abbinamenti? Questa azione è irreversibile e non potrà essere annullata."
        actionText="Genera abbinamenti"
        cancelText="Annulla"
        actionClassName="bg-red-600 hover:bg-red-700"
        onConfirm={assign}
      />
    </div>
  );
}
