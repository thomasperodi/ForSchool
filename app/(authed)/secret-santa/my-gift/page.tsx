"use client";

import { useEffect, useState } from "react";
import SSCard from "@/components/ss/Card";
import { motion } from "framer-motion";

export default function MyGiftPage() {
  const [receiver, setReceiver] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch("/api/secret-santa/my-gift")
      .then((r) => r.json())
      .then((d) => setReceiver(d.receiver));
  }, []);

  if (!receiver)
    return <div className="text-white mt-20 text-center">Caricamento...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white">
      <div className="relative w-full max-w-sm">

        {/* Card con blur */}
        <motion.div
          className={`absolute inset-0 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-2xl font-bold ${
            revealed ? "hidden" : ""
          }`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          onClick={() => setRevealed(true)}
        >
          Tocca per rivelare
        </motion.div>

        {/* Nome destinatario */}
        <SSCard className="text-center">
          <h1 className="text-xl text-gray-600">Devi fare un regalo a</h1>
          <p className="text-4xl font-bold text-red-700 mt-2">{receiver}</p>
        </SSCard>
      </div>
    </div>
  );
}
