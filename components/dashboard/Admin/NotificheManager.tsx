"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function NotificheManager() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/notifications/sendAll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore invio notifiche");

      toast.success(
        `Notifiche inviate! ✅ Inviate: ${data.sent}, Fallite: ${data.failure}`
      );

      setTitle("");
      setBody("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Errore: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-8 shadow-lg border">
      <CardHeader>
        <CardTitle>Invio Notifiche Push</CardTitle>
        <CardDescription>
          Inserisci il titolo e il messaggio della notifica da inviare a tutti gli utenti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-sm text-gray-700">Titolo</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo della notifica"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Massimo 100 caratteri consigliati.</p>
          </div>

          <div>
            <label className="block mb-1 font-medium text-sm text-gray-700">Messaggio</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Testo della notifica"
              required
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Massimo 200 caratteri consigliati.</p>
          </div>

          <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
            {loading && <Loader2 className="animate-spin h-4 w-4" />}
            {loading ? "Invio in corso..." : "Invia Notifiche"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
