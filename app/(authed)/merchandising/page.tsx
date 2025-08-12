
import MerchandisingPage from "./MerchandisingClient";

export const metadata = {
  title: "Skoolly - Merchandising",
  description: "Scopri il merchandising della tua scuola",
  keywords: "merchandising, scuola, prodotti ufficiali, abbigliamento scolastico, accessori",
    openGraph: {
        title: "Skoolly - Merchandising",
        description: "Scopri il merchandising della tua scuola",
        url: "https://skoolly.com/merchandising",
        images: [
        {
            url: "https://skoolly.com/images/merchandising.jpg",
            width: 1200,
            height: 630,
            alt: "Merchandising Skoolly",
        },
        ],
    },
    
};

export default async function MerchandinsingPage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <MerchandisingPage />;
}
