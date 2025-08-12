import ProductDetailMerch from "./productClientMerch";

export const metadata = {
  title: "Skoolly - Merchandising - Dettaglio Prodotto",
  description: "Scopri il merchandising della tua scuola - Dettaglio Prodotto",
  keywords: "merchandising, scuola, prodotti ufficiali, abbigliamento scolastico, accessori",
};

export default async function ProductPageMerch({ params }: { params: { productId: string } }) {
  // Puoi anche fare fetch dati qui se vuoi, usando await
  return <ProductDetailMerch productId={params.productId} />;
}
