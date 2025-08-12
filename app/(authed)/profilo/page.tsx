
import ProfiloClient from "./ProfiloClient";

export const metadata = {
  title: "Skoolly - Gestisci il Tuo Profilo Personale",
  description: "Aggiorna facilmente il tuo profilo e le informazioni personali per personalizzare la tua esperienza su Skoolly.",
  // keywords: "profilo, gestione account, informazioni personali, impostazioni",
};

export default async function ProfiloPage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <ProfiloClient />;
}
