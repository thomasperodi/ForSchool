// File: app/support/page.tsx
'use client'

import React, { useState } from 'react'

export default function SupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('Supporto per Skoolly')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    try {
      // HO MODIFICATO QUESTO ENDPOINT
      const res = await fetch('/api/contact', { // <--- CAMBIATO QUI
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })

      if (!res.ok) throw new Error('Errore invio')

      setStatus('success')
      setName('')
      setEmail('')
      setMessage('')
      setSubject('Supporto per Skoolly')
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold">Supporto</h1>
          <p className="text-sm text-slate-600 mt-1">Hai bisogno di aiuto? Inviaci una richiesta e ti risponderemo il prima possibile.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mario Rossi"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario@esempio.com"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Oggetto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Messaggio</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Descrivi il problema o la richiesta..."
              className="mt-1 block w-full rounded-lg border border-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? 'Invio...' : 'Invia richiesta'}
            </button>

            <div className="text-sm text-slate-600">
              {status === 'success' && <span className="text-green-600">Richiesta inviata. Controlla la tua email.</span>}
              {status === 'error' && <span className="text-red-600">Errore durante l&apos;invio. Riprova più tardi.</span>}
            </div>
          </div>
        </form>

        <section className="mt-8 border-t pt-6 text-sm text-slate-700">
          <h2 className="font-semibold">FAQ rapide</h2>
          <ul className="mt-3 space-y-2">
            <li>• <strong>Tempi di risposta:</strong> solitamente 24–48 ore lavorative.</li>
            <li>• <strong>Assistenza urgente:</strong> indica &quot;URGENTE&quot; nell&apos;oggetto.</li>
            <li>• <strong>Privacy:</strong> non condividere dati sensibili come password.</li>
          </ul>
        </section>


      </div>
    </main>
  )
}