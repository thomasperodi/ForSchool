import { supabase } from "@/lib/supabaseClient";
import MarketplaceClient from "./MarketplaceClient"

export const metadata = {
  title: "Skoolly - Marketplace: Compra e Vendi tra Studenti",
  description: "Scopri il marketplace di Skoolly, dove puoi acquistare e vendere prodotti direttamente tra studenti in modo sicuro e semplice.",
  // keywords: "marketplace, prodotti, vendita, acquisto, utenti, offerte",
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
