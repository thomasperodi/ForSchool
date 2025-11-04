// app/safety/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Standard di sicurezza dei minorenni | Skoolly",
  description:
    "Skoolly tutela i minorenni con una politica di tolleranza zero verso ogni forma di abuso o sfruttamento.",
  alternates: { canonical: "https://www.skoollyapp.com/safety" }, // aggiorna con il tuo dominio reale
  robots: { index: true, follow: true },
};

export default function SafetyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
      <h1>Standard di sicurezza dei minorenni</h1>
      <p>
        Skoolly adotta una politica di <strong>tolleranza zero</strong> verso
        qualsiasi forma di abuso o sfruttamento sessuale di minori.
      </p>

      <p>
        Tutti i contenuti e i comportamenti che violano questa regola vengono
        rimossi e, se necessario, segnalati alle autorità competenti. Gli utenti
        responsabili vengono sospesi o esclusi in modo permanente.
      </p>

      <h2>Impegni di sicurezza</h2>
      <ul>
        <li>Monitoraggio costante dei contenuti pubblicati dagli utenti.</li>
        <li>Verifica e blocco immediato di account sospetti.</li>
        <li>
          Collaborazione con le autorità nazionali in caso di segnalazioni o
          sospetti di abuso.
        </li>
      </ul>

      <h2>Segnalazioni</h2>
      <p>
        Chiunque riscontri contenuti o comportamenti che possano violare questi
        standard può segnalarli scrivendo a{" "}
        <a href="mailto:skoollyapp@gmail.com">skoollyapp@gmail.com</a>.
      </p>

      <h2>Conformità legale</h2>
      <p>
        Skoolly è conforme alle leggi vigenti in materia di sicurezza dei
        minorenni e collabora con le autorità competenti per la prevenzione e
        la segnalazione di materiale illecito.
      </p>

      <footer className="mt-10 border-t pt-6 text-sm text-gray-600">
        <p>
          Ultimo aggiornamento: 4 novembre 2025 — Pagina pubblicata per
          garantire trasparenza e conformità alle norme di Google Play sulla
          sicurezza dei minorenni.
        </p>
      </footer>
    </main>
  );
}
