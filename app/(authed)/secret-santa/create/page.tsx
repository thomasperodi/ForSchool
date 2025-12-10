"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SSCard from "@/components/ss/Card";
import SSButton from "@/components/ss/Button";
import { supabase } from "@/lib/supabaseClient";

export default function CreateGroupPage() {
  const [nome, setNome] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const createGroup = async () => {
    if (!nome || !budget) {
      alert("Inserisci nome e budget");
      return;
    }

    setLoading(true);

    // RECUPERA L'ID DELL'UTENTE
    const { data: auth } = await supabase.auth.getUser();
    const creatorId = auth?.user?.id;

    if (!creatorId) {
      alert("Non sei autenticato.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/secret-santa/create-group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, budget, creatorId }),
    });

    if (!res.ok) {
      alert("Errore nella creazione del gruppo");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/secret-santa/group/${data.groupId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-700 to-black">
      <SSCard className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center text-red-600">
          Crea Secret Santa
        </h1>

        <div className="space-y-4">
          <input
            placeholder="Nome gruppo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl"
          />

          <input
            type="number"
            placeholder="Budget (€)"
            value={budget ?? ""}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-xl"
          />

          <SSButton onClick={!loading ? createGroup : undefined}>
            {loading ? "Creazione..." : "Crea gruppo"}
          </SSButton>
        </div>
      </SSCard>
    </div>
  );
}
