"use client";

import { useState, useEffect } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash; // #access_token=...
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        if (accessToken) setToken(accessToken);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("Token di reset mancante nell'URL.");
      return;
    }

    if (!password || password.length < 8) {
      setMessage("La password deve avere almeno 8 caratteri.");
      return;
    }

    if (password !== confirm) {
      setMessage("Le password non coincidono.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`❌ ${data.error || "Errore durante l'aggiornamento password"}`);
      } else {
        setMessage("✅ Password aggiornata con successo. Ora puoi effettuare il login.");
        setPassword("");
        setConfirm("");
      }
    } catch (err) {
      setMessage("❌ Errore imprevisto durante l'aggiornamento password.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="w-full max-w-md border rounded p-6 shadow">
        <h2 className="text-xl mb-6 font-semibold">Reimposta Password</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="password"
            placeholder="Nuova password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full p-3 border rounded"
          />
          <input
            type="password"
            placeholder="Conferma password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full p-3 border rounded"
          />
          {message && (
            <p
              className={`text-sm ${
                message.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {loading ? "Aggiornamento..." : "Aggiorna Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
