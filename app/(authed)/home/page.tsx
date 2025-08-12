
import HomeClient from "./HomeClient"

export const metadata = {
  title: "Skoolly - Benvenuto nella Tua Area Personale",
  description: "Accedi alla tua dashboard personale per gestire profilo, attività e impostazioni in modo semplice e veloce.",
  // keywords: "home, dashboard, profilo, attività, gestione account",
};

export default async function HomePage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <HomeClient />;
}
