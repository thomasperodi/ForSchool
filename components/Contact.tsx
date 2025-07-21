export default function Contact() {
  return (
    <section id="contact" className="py-12 px-4 bg-gradient-to-br from-[#f1f5f9] via-[#38bdf8]/10 to-[#34d399]/10 relative overflow-hidden">
      {/* Decorazioni sfumate */}
      <div className="absolute -top-8 left-0 w-32 h-32 bg-[#38bdf8]/20 rounded-full blur-2xl z-0" />
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#fbbf24]/20 rounded-full blur-2xl z-0" />
      <div className="max-w-xl mx-auto relative z-10">
        <h2 className="text-2xl font-semibold mb-4 text-center text-[#1e293b]">Contattaci</h2>
        <p className="mb-6 text-center text-[#334155]">Hai domande, suggerimenti o vuoi collaborare? Scrivici!</p>
        <form className="space-y-4 bg-white p-6 rounded-xl shadow-2xl border-2 border-[#38bdf8] focus-within:border-[#fbbf24] transition-all duration-300">
          <div>
            <label className="block mb-1 font-medium text-[#1e293b]" htmlFor="name">Nome</label>
            <input id="name" name="name" type="text" className="w-full px-3 py-2 border rounded-md bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] transition-all" placeholder="Il tuo nome" />
          </div>
          <div>
            <label className="block mb-1 font-medium text-[#1e293b]" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="w-full px-3 py-2 border rounded-md bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] transition-all" placeholder="La tua email" />
          </div>
          <div>
            <label className="block mb-1 font-medium text-[#1e293b]" htmlFor="message">Messaggio</label>
            <textarea id="message" name="message" rows={4} className="w-full px-3 py-2 border rounded-md bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] transition-all" placeholder="Scrivi qui il tuo messaggio..." />
          </div>
          <button type="submit" className="w-full py-2 rounded-md bg-[#38bdf8] text-[#1e293b] font-medium shadow-lg hover:bg-[#fbbf24] hover:text-[#1e293b] hover:scale-105 transition-all">Invia</button>
        </form>
      </div>
    </section>
  );
} 