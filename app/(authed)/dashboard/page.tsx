
import DashboardClient from "./DashboardClient"

export const metadata = {
  title: "Skoolly - Dashboard",
  description: "Gestisci il tuo profilo e le tue attività",
    keywords: "dashboard, profilo, gestione account, attività, impostazioni",
};

export default async function HomePage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <DashboardClient />;
}
