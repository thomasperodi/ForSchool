// app/terms/page.tsx
import React from "react";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Termini di Servizio - Skoolly</h1>

        <p className="mb-4">Ultimo aggiornamento: 4 ottobre 2025</p>

        <p className="mb-4">
          Benvenuto su <strong>Skoolly</strong>! Prima di utilizzare la nostra app, leggi attentamente questi Termini. Accedendo o utilizzando Skoolly, accetti di rispettare questi Termini. Se non accetti, non utilizzare l’app.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">1. Descrizione del Servizio</h2>
        <p className="mb-4">
          Skoolly è un’app che consente agli studenti di accedere a contenuti educativi, organizzare attività scolastiche e partecipare a funzionalità di community. Alcune funzionalità sono disponibili tramite abbonamenti auto‑rinnovabili.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">2. Abbonamenti e Pagamenti</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Nome dell’abbonamento: Elite</li>
          <li>Durata: 1 mese </li>
          <li>Prezzo: come indicato nell’in-app purchase</li>
        </ul>
        <p className="mb-4">
          Il pagamento avviene tramite il sistema di pagamento dell’App Store. L’abbonamento si rinnova automaticamente a meno che non venga disattivato almeno 24 ore prima della fine del periodo corrente.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">3. Account Utente</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Devi avere almeno 13 anni per usare Skoolly.</li>
          <li>Sei responsabile della sicurezza del tuo account e delle tue credenziali.</li>
          <li>Puoi cancellare il tuo account in qualsiasi momento tramite le impostazioni dell’app.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-2">4. Contenuti e Proprietà Intellettuale</h2>
        <p className="mb-4">
          Tutti i contenuti presenti su Skoolly, inclusi testi, immagini, grafica e software, sono di proprietà di Skoolly o dei suoi licenzianti. Non puoi copiare, distribuire o modificare i contenuti senza autorizzazione scritta.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">5. Limitazione di Responsabilità</h2>
        <p className="mb-4">
          Skoolly fornisce il servizio “così com’è” e non garantisce che l’app sia priva di errori o interruzioni. Skoolly non sarà responsabile per danni diretti, indiretti o consequenziali derivanti dall’uso dell’app.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">6. Recesso e Cancellazione</h2>
        <p className="mb-4">
          Puoi annullare il tuo abbonamento in qualsiasi momento tramite App Store. La cancellazione non comporta rimborso per i periodi già pagati.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">7. Modifiche ai Termini</h2>
        <p className="mb-4">
          Skoolly può aggiornare questi Termini in qualsiasi momento. Eventuali modifiche saranno comunicate tramite l’app e pubblicate sul nostro sito.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">8. Legge Applicabile e Foro Competente</h2>
        <p className="mb-4">
          Questi Termini sono regolati dalla legge italiana. Per qualsiasi controversia, il foro competente sarà quello della città di residenza di Skoolly, salvo norme inderogabili.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">9. Contatti</h2>
        <p className="mb-4">
          Per domande sui Termini o sul servizio, scrivi a: <strong>skoollyapp@gmail.com</strong>
        </p>
      </div>
    </div>
  );
};

export default TermsPage;
