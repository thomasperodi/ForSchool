
import HomeClient from "./HomeClient"

export const metadata = {
  title: "Skoolly - Home",
  description: "Benvenuto nella tua area personale",
  keywords: "home, dashboard, profilo, attività, gestione account",
};

export default async function HomePage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <HomeClient />;
}
