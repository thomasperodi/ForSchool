"use client"

import { useState } from "react"
import { Mail, User, MessageSquare, Send } from "lucide-react"

export default function Contact() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSuccess(null)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    const res = await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        message: formData.get("message"),
      }),
      headers: { "Content-Type": "application/json" },
    })

    setLoading(false)

    if (res.ok) {
      setSuccess("✅ Messaggio inviato con successo!")
      form.reset()
    } else {
      setError("❌ Errore durante l'invio. Riprova più tardi.")
    }
  }

  return (
    <section
      id="contact"
      className="py-16 px-4 bg-gradient-to-br from-[#f1f5f9] via-[#38bdf8]/10 to-[#34d399]/10 relative overflow-hidden"
    >
      {/* Decorazioni sfumate */}
      <div className="absolute -top-8 left-0 w-32 h-32 bg-[#38bdf8]/20 rounded-full blur-2xl z-0" />
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#fbbf24]/20 rounded-full blur-2xl z-0" />

      <div className="max-w-xl mx-auto relative z-10">
        <h2 className="text-3xl font-bold mb-4 text-center text-[#1e293b]">
          Contattaci
        </h2>
        <p className="mb-8 text-center text-[#334155]">
          Hai domande, suggerimenti o vuoi collaborare? Scrivici!
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-white p-6 rounded-2xl shadow-xl border border-[#e2e8f0]"
        >
          {/* Nome */}
          <div>
            <label
              className="block mb-1 font-medium text-[#1e293b]"
              htmlFor="name"
            >
              <span className="flex items-center gap-2">
                <User size={16} /> Nome
              </span>
            </label>
            <input
              id="name"
              name="name"
              required
              type="text"
              className="w-full px-3 py-2 border rounded-lg bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] transition-all"
              placeholder="Il tuo nome"
            />
          </div>

          {/* Email */}
          <div>
            <label
              className="block mb-1 font-medium text-[#1e293b]"
              htmlFor="email"
            >
              <span className="flex items-center gap-2">
                <Mail size={16} /> Email
              </span>
            </label>
            <input
              id="email"
              name="email"
              required
              type="email"
              className="w-full px-3 py-2 border rounded-lg bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] transition-all"
              placeholder="La tua email"
            />
          </div>

          {/* Messaggio */}
          <div>
            <label
              className="block mb-1 font-medium text-[#1e293b]"
              htmlFor="message"
            >
              <span className="flex items-center gap-2">
                <MessageSquare size={16} /> Messaggio
              </span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              className="w-full px-3 py-2 border rounded-lg bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] transition-all"
              placeholder="Scrivi qui il tuo messaggio..."
            />
          </div>

          {/* Bottone */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#38bdf8] text-[#1e293b] font-semibold shadow-md hover:bg-[#fbbf24] hover:scale-105 transition-all disabled:opacity-60"
          >
            {loading ? "Invio..." : <>Invia <Send size={16} /></>}
          </button>

          {/* Feedback */}
          {success && (
            <p className="text-green-600 font-medium text-center">{success}</p>
          )}
          {error && (
            <p className="text-red-600 font-medium text-center">{error}</p>
          )}
        </form>
      </div>
    </section>
  )
}
