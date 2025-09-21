"use client"
import MerchAdminDashboard from '@/components/dashboard/Merch/Dashboard';
import LocaleAdminDashboard from '@/components/dashboard/Locale/dashboard'
import AdminDashboard from '@/components/dashboard/Admin/AdminDashboard'
import { NightclubDashboard } from '@/components/dashboard/Discoteca/dashboard';
import { getUtenteCompleto } from '@/lib/api';
import { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import StudentDashboard from '@/components/dashboard/Studente/StudenteDashboard';

type Classe = {
  id: string;
  anno: number;
  sezione: string;
};

type Utente = {
  id: string;
  nome: string;
  email: string;
  classe: Classe | null; // This type was changed from string to an object or null
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
            } catch (err) {
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
    else if (utente.ruolo === "studente") {

        return <StudentDashboard />;
    }
    else if (utente.ruolo === "admin") {
        return <AdminDashboard />
    }
    else if (utente.ruolo === "locale"){
        return <LocaleAdminDashboard />;
    }
    else if (utente.ruolo === "discoteca"){
        return <NightclubDashboard/>;
    }

    // Default return or handling for unrecognised roles
    return <div>Ruolo non riconosciuto.</div>
}