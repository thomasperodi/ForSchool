
import ProfiloClient from "./ProfiloClient";

export const metadata = {
  title: "Skoolly - Profilo",
  description: "Gestisci il tuo profilo e le tue informazioni personali",
  keywords: "profilo, gestione account, informazioni personali, impostazioni",
       
};

export default async function ProfiloPage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <ProfiloClient />;
}
