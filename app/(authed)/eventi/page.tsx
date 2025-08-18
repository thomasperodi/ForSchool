import EventiClient from "./EventiClient"

export const metadata = {
  title: "Skoolly - Eventi: Scopri i Nostri Eventi e I Luoghi Incontri",
  description: "Scopri i nostri eventi e i luoghi incontri, dove puoi condividere esperienze e conoscere nuove persone.",
};

export default async function HomePage() {
  

  // Filtri e paginazione gestiti lato client
 

  return <EventiClient />;
}
