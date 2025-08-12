
import RipetizioniClient from "./RipetizioniClient";

export const metadata = {
  title: "Skoolly - Trova Ripetizioni e Lezioni Private Online",
  description: "Scopri ripetizioni e lezioni private personalizzate per migliorare le tue competenze. Trova il tutor ideale su Skoolly e raggiungi i tuoi obiettivi di studio!",
  // keywords opzionale, puoi tenerla o rimuoverla
  keywords: "ripetizioni, lezioni private, tutor, studio, aiuto scolastico",
};


export default async function ProfiloPage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <RipetizioniClient />;
}
