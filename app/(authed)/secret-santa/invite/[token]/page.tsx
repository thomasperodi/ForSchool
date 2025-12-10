"use client";

import { useEffect, useState } from "react";
import SSCard from "@/components/ss/Card";
import SSButton from "@/components/ss/Button";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Invite {
  group_id: string;
  group_name: string;
}

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();

  const [invite, setInvite] = useState<Invite | null>(null);

  useEffect(() => {
    fetch(`/api/secret-santa/invite?token=${token}`)
      .then((r) => r.json())
      .then((d) => setInvite(d));
  }, []);

  const accept = async () => {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  const res = await fetch("/api/secret-santa/accept-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, userId }),
  });

  const d = await res.json();
  router.push(`/secret-santa/group/${d.groupId}`);
};


  if (!invite) {
    return (
      <div className="text-center text-white min-h-screen flex items-center justify-center">
        Caricamento invito...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-red-700 to-black">
      <SSCard className="max-w-md w-full bg-white/90 backdrop-blur">
        <h1 className="text-2xl font-bold mb-3 text-center">
          Invito a Secret Santa
        </h1>

        <p className="text-gray-700 mb-4 text-center">
          Sei stato invitato nel gruppo:
          <br />
          <span className="font-semibold">{invite.group_name}</span>
        </p>

        <SSButton onClick={accept}>Accetta l’invito</SSButton>
      </SSCard>
    </div>
  );
}
