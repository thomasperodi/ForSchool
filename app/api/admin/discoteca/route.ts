// app/api/admin/discoteche/route.ts
// (Next.js App Router API Route)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Assicurati che questo path sia corretto

type DiscoRecord = {
    id: string;
    nome: string;
    indirizzo: string | null;
    stripe_account_id: string | null;
    user?: { // Aggiunto il campo user, ora opzionale in questa tipizzazione flat
      id: string;
      nome: string;
      email: string;
    } | null;
  };

  type DiscoWithUserData = DiscoRecord & {
    utenti_discoteche: Array<{
      utente_id: string;
      utenti: {
        id: string;
        nome: string;
        email: string;
      }[] | null;
    }> | null;
  };


  
  export async function GET(req: NextRequest) {
    try {
      const { data, error } = await supabase
        .from('discoteche')
        .select(`
          id,
          nome,
          indirizzo,
          stripe_account_id,
          utenti_discoteche (
            utenti (
              id,
              nome,
              email
            )
          )
        `);
  
      if (error) throw error;
  
  
      // Restituisci direttamente i dati così come arrivano
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore nel recupero delle discoteche';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  
  export async function POST(req: NextRequest) {
    // TODO: Implementa l'autenticazione e l'autorizzazione
    // if (!isAuthenticated(req) || !isAuthorized(req, 'admin')) {
    //   return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    // }
  
    try {
      const body = await req.json();
      const { nome, indirizzo, stripe_account_id, user_id } = body as { // Aggiunto user_id per l'assegnazione
        nome: string;
        indirizzo?: string;
        stripe_account_id?: string;
        user_id?: string; // ID dell'utente da assegnare come gestore
      };
  
      if (!nome) {
        return NextResponse.json({ error: 'Il nome della discoteca è obbligatorio.' }, { status: 400 });
      }
  
      const { data: discoData, error: discoError } = await supabase
        .from('discoteche')
        .insert([{
          nome,
          indirizzo: indirizzo ?? null,
          stripe_account_id: stripe_account_id ?? null,
        }])
        .select('id,nome,indirizzo,stripe_account_id')
        .single();
  
      if (discoError) throw discoError;
  
      // Se un user_id è fornito, assegna l'utente alla discoteca
      let userAssigned = null;
      if (user_id) {
        const { data: utentiDiscotecheData, error: utentiDiscotecheError } = await supabase
          .from('utenti_discoteche')
          .insert([{
            discoteca_id: discoData.id,
            utente_id: user_id,
            ruolo_gestione: 'manager', // Puoi specificare un ruolo o renderlo configurabile
          }])
          .select('utente_id')
          .single();
  
        if (utentiDiscotecheError) console.error("Errore nell'assegnazione dell'utente alla discoteca:", utentiDiscotecheError);
        else {
          // Recupera i dettagli dell'utente assegnato per la risposta
          const { data: userData, error: userError } = await supabase
            .from('utenti')
            .select('id,nome,email')
            .eq('id', user_id)
            .single();
          if (userError) console.error("Errore nel recupero dettagli utente:", userError);
          userAssigned = userData;
        }
      }
  
      return NextResponse.json({ ...discoData, user: userAssigned });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore nella creazione della discoteca';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  