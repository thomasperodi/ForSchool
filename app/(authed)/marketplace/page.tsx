import { supabase } from "@/lib/supabaseClient";
import MarketplaceClient from "./MarketplaceClient"

export const metadata = {
  title: "Skoolly - Marketplace",
  description: "Scopri i prodotti in vendita dagli utenti",
  keywords: "marketplace, prodotti, vendita, acquisto, utenti, offerte",
};

export default async function MarketplacePage() {
  

  // Filtri e paginazione gestiti lato client
  const { data: prodotti, error } = await supabase
    .from("prodotti")
    .select("*")
    .order("creato_il", { ascending: false })
    .limit(12); // prima pagina

  if (error) {
    console.error(error);
    return <p className="text-red-500">Errore nel caricamento dei prodotti.</p>;
  }

  return <MarketplaceClient initialProducts={prodotti ?? []} />;
}
