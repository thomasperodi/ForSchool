
import PromozioniClient from "./PromozioniClient";

export const metadata = {
  title: "Skoolly - Promozioni",
  description: "Scopri le promozioni e le offerte della tua scuola",
  keywords: "promozioni, offerte, scuola, sconti, eventi, attività",

       
};

export default async function ProfiloPage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <PromozioniClient />;
}
