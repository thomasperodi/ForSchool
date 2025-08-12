
import DashboardClient from "./DashboardClient"

export const metadata = {
  title: "Skoolly - Dashboard: Gestisci il Tuo Profilo e Attività",
  description: "Monitora e gestisci il tuo profilo, le tue attività e impostazioni personali direttamente dalla dashboard di Skoolly.",
  // keywords: "dashboard, profilo, gestione account, attività, impostazioni",
};

export default async function HomePage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <DashboardClient />;
}
