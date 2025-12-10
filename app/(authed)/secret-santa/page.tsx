"use client";

import { useEffect, useState } from "react";
import SSCard from "@/components/ss/Card";
import SSButton from "@/components/ss/Button";
import { useRouter } from "next/navigation";

interface Invite {
  id: string;
  group_name: string;
  token: string;
}

interface Group {
  id: string;
  nome: string;
  budget: number;
}

export default function SecretSantaDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);

  const loadDashboard = async () => {
    setLoading(true);

    const res = await fetch("/api/secret-santa/dashboard");
    const data = await res.json();

    setMyGroups(data.groups || []);
    setReceivedInvites(data.invites || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl animate-pulse">
        Caricamento...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-red-700 to-black text-white">
      <h1 className="text-4xl font-bold text-center mb-6">Secret Santa 🎄</h1>

      {/* CREA GRUPPO */}
      <SSCard className="mb-6 bg-white/20 backdrop-blur">
        <h2 className="text-xl font-semibold mb-2">Crea un gruppo</h2>
        <p className="text-gray-200 text-sm mb-4">
          Imposta un budget, invita gli amici e organizza il Secret Santa!
        </p>

        <SSButton onClick={() => router.push("/secret-santa/create")}>
          Nuovo gruppo
        </SSButton>
      </SSCard>

      {/* INVITI RICEVUTI */}
      <SSCard className="mb-6 bg-white/20 backdrop-blur">
        <h2 className="text-xl font-semibold mb-3">Inviti ricevuti</h2>

        {receivedInvites.length === 0 ? (
          <p className="text-gray-300">Non hai inviti al momento.</p>
        ) : (
          <ul className="space-y-3">
            {receivedInvites.map((invite) => (
              <li
                key={invite.id}
                className="p-3 bg-white/10 border border-white/20 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">{invite.group_name}</p>
                  <p className="text-xs text-gray-300">Ti hanno invitato!</p>
                </div>

                <SSButton
                  className="px-4 py-2 text-sm"
                  onClick={() =>
                    router.push(`/secret-santa/invite/${invite.token}`)
                  }
                >
                  Vedi invito
                </SSButton>
              </li>
            ))}
          </ul>
        )}
      </SSCard>

      {/* I MIEI GRUPPI */}
      <SSCard className="bg-white/20 backdrop-blur">
        <h2 className="text-xl font-semibold mb-3">I miei gruppi</h2>

        {myGroups.length === 0 ? (
          <p className="text-gray-300">Non fai parte di nessun gruppo.</p>
        ) : (
          <ul className="space-y-3">
            {myGroups.map((g) => (
              <li
                key={g.id}
                className="p-3 bg-white/10 border border-white/20 rounded-lg flex justify-between items-center cursor-pointer"
                onClick={() => router.push(`/secret-santa/group/${g.id}`)}
              >
                <div>
                  <p className="font-bold">{g.nome}</p>
                  <p className="text-xs text-gray-300">Budget: {g.budget}€</p>
                </div>

                <span className="text-red-300 text-sm underline">Apri →</span>
              </li>
            ))}
          </ul>
        )}
      </SSCard>
    </div>
  );
}
