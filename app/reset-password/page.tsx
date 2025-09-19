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
  <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        🔒 Reimposta Password
      </h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Inserisci una nuova password sicura per il tuo account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nuova password */}
        <div className="relative">
          <input
            type="password"
            placeholder="Nuova password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {/* Indicatore forza password */}
          {password && (
            <div className="mt-1 text-xs text-gray-500">
              {password.length < 8
                ? "Password troppo corta"
                : "Password valida"}{" "}
              {password.length >= 12 && "💪 Molto sicura"}
            </div>
          )}
        </div>

        {/* Conferma password */}
        <div className="relative">
          <input
            type="password"
            placeholder="Conferma password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {confirm && confirm !== password && (
            <p className="text-xs text-red-600 mt-1">Le password non coincidono</p>
          )}
        </div>

        {/* Messaggi generali */}
        {message && (
          <p
            className={`text-sm text-center ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        {/* Bottone */}
        <button
          type="submit"
          disabled={loading || confirm !== password || password.length < 8}
          className={`w-full py-3 rounded-lg text-white font-semibold transition ${
            loading || confirm !== password || password.length < 8
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Aggiornamento..." : "Aggiorna Password"}
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Assicurati di scegliere una password sicura e unica.
      </p>
    </div>
  </div>
);

}
