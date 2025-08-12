// app/(authed)/merchandising/[productId]/page.tsx

import ProductDetailMerch from "./productClientMerch"

export const metadata = {
  title: "Skoolly - Merchandising - Dettaglio Prodotto",
  description: "Scopri il merchandising della tua scuola - Dettaglio Prodotto",
  keywords: "merchandising, scuola, prodotti ufficiali, abbigliamento scolastico, accessori",
    
    
};

interface PageProps {
  params: {
    productId: string;
  };
}

export default function Page({ params }: PageProps) {
  // params.productId è la stringa dall'url

  // Qui puoi fare fetch dati server-side se vuoi
  // oppure semplicemente passare il productId al componente client

  return <ProductDetailMerch productId={params.productId} />;
}
