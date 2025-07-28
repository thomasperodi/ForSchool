// app/dashboard/page.tsx (Server Component)
"use client"
import MerchAdminDashboard from '@/components/dashboard/Merch/Dashboard';
import { getUtenteCompleto } from '@/lib/api';
import { useEffect, useState } from "react";
import toast from 'react-hot-toast';

type Utente = {
  id: string;
  nome: string;
  email: string;
  classe: string;
  ruolo: string;
  notifiche: boolean;
  tema: string;
  scuola: { id: string; nome: string } | null;
  scuola_nome: string | null;
};

export default function DashboardPage() {
    

    // Verifica il Ruolo dell'Utente e mostra il dashboard in base al ruolo
    const [utente, setUtente] = useState<Utente | null>(null);
    useEffect(() => {
        const fetchUtente = async () => {
            try {
                const utente = await getUtenteCompleto();
                setUtente(utente);
            } catch  {
                toast.error("Errore nel recupero dei dati utente");
            }
        };
        fetchUtente();
    }, []);
    if (!utente) {
        return <div>Caricamento...</div>;
    }
    else if (utente.ruolo == "merch") {
        
        return <MerchAdminDashboard />;
    }
    else if (utente.ruolo === "studente" ) {

        return <div>Dashboard Studente in costruzione</div>
    }
    else if (utente.ruolo === "admin") {
        return <div>Dashboard Admin in costruzione</div>
    }
    else if (utente.ruolo === "docente") {
        return <div>Dashboard Docente in costruzione</div>
    }
    // Renderizza il dashboard per admin e merch




    
  
    
      
   
   
  }

