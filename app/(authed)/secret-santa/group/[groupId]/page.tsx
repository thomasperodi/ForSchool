"use client";

import { useEffect, useState } from "react";
import SSCard from "@/components/ss/Card";
import SSButton from "@/components/ss/Button";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface Group {
  id: string;
  nome: string;
  budget: number;
}

interface Member {
  id: string;
  nome: string;
  email: string;
}

export default function GroupPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadGroup = async () => {
    setLoading(true);

    const res = await fetch(`/api/secret-santa/group?groupId=${groupId}`);
    const data = await res.json();

    setGroup(data.group);
    setMembers(data.members);
    setLoading(false);
  };

  useEffect(() => {
    loadGroup();
  }, []);

const sendInvite = async () => {
  if (!email.trim()) return;

  const { data: auth } = await supabase.auth.getUser();
  const invitedBy = auth?.user?.id;

  await fetch("/api/secret-santa/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, email, invitedBy }),
  });

  toast.success("Invito inviato!");
};


  const assign = async () => {
    await fetch("/api/secret-santa/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });

    alert("Abbinamenti generati!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl animate-pulse">
        Caricamento gruppo...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-red-700 to-black text-white">
      {/* HEADER */}
      <SSCard className="w-full mb-4 bg-white/80 backdrop-blur text-black">
        <h1 className="text-3xl font-bold">{group?.nome}</h1>
        <p className="text-gray-700">Budget: {group?.budget}€</p>
      </SSCard>

      {/* INVITA */}
      <SSCard className="bg-white/80 backdrop-blur text-black">
        <h2 className="text-xl font-semibold mb-3">Invita un membro</h2>

        <div className="flex gap-2 items-center">
          <input
            placeholder="Email dello studente..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 p-3 border rounded-xl"
          />

          <button
            onClick={sendInvite}
            disabled={inviteLoading}
            className={`px-5 py-3 rounded-xl font-semibold text-white ${
              inviteLoading ? "bg-gray-500" : "bg-blue-600"
            }`}
          >
            {inviteLoading ? "..." : "+"}
          </button>
        </div>
      </SSCard>

      {/* LISTA MEMBRI */}
      <SSCard className="mt-4 bg-white/90 backdrop-blur text-black">
        <h2 className="text-xl font-semibold mb-2">Membri del gruppo</h2>

        {members.length === 0 ? (
          <p className="text-gray-600">Nessun membro ancora.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="border-b pb-2 flex justify-between items-center"
              >
                <span>
                  <strong>{m.nome}</strong>
                  <span className="text-gray-600"> ({m.email})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SSCard>

      <SSButton onClick={assign} className="mt-6">
        Genera abbinamenti segreti
      </SSButton>
    </div>
  );
}
