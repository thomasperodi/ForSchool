
import RipetizioniClient from "./RipetizioniClient";

export const metadata = {
  title: "Skoolly - Ripetizioni",
    description: "Trova ripetizioni e lezioni private per migliorare le tue competenze",
    keywords: "ripetizioni, lezioni private, tutor, studio, aiuto scolastico",
       
};

export default async function ProfiloPage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <RipetizioniClient />;
}
