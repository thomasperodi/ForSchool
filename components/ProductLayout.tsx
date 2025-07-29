// components/ProductLayout.tsx
import { ReactNode } from 'react';

interface ProductLayoutProps {
  children: ReactNode; // Questo è il contenuto che il wrapper avvolgerà
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Hero Section - Potrebbe essere comune per tutte le pagine di merchandising */}
      

      {/* Contenuto specifico della pagina di dettaglio o della griglia prodotti */}
      <div className="container mx-auto p-4 md:p-8">
        {children}
      </div>

      {/* Policy e Tempi di Spedizione - Potrebbero essere inclusi qui per tutte le pagine di prodotto */}
      {/* O potresti includerli solo nella pagina di dettaglio se non vuoi che appaiano sulla griglia */}
      <div className="container mx-auto mt-8 border-t pt-6 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">Policy e Spedizione</h3>
        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Tempi di spedizione:</strong> Spedizione stimata in 3-5 giorni lavorativi.
            Riceverai un&apos;email di conferma con il tracking non appena il tuo ordine sarà spedito.
          </p>
          <p>
            <strong>Politica di reso:</strong> Accettiamo resi entro 14 giorni dalla ricezione del prodotto, purché sia in condizioni originali e con l&apos;imballaggio intatto. Consulta la nostra pagina &quot;Resi e Rimborsi&quot; per maggiori dettagli.
          </p>
          <p>
            <strong>Qualità:</strong> Tutti i nostri prodotti sono realizzati con materiali di alta qualità e stampati con tecniche durevoli per garantire la massima soddisfazione.
          </p>
        </div>
      </div>

    </div>
  );
}