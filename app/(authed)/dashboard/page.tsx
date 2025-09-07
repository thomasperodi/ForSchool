
import DashboardClient from "./DashboardClient"

export const metadata = {
  title: "Skoolly - Dashboard: Gestisci il Tuo Profilo e Attività",
  description: "Monitora e gestisci il tuo profilo, le tue attività e impostazioni personali direttamente dalla dashboard di Skoolly.",
  // keywords: "dashboard, profilo, gestione account, attività, impostazioni",
};

// Evita il prerender statico per questa pagina (alcuni componenti usano API del browser)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <DashboardClient />;
}
