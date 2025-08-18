import { Utente } from "."

export interface Database {
  public: {
    Tables: {
      scuole: {
        Row: {
          id: string
          nome: string
          citta: string
          dominio: string | null
        }
        Insert: {
          id?: string
          nome: string
          citta: string
          dominio?: string | null
        }
        Update: {
          id?: string
          nome?: string
          citta?: string
          dominio?: string | null
        }
      }
      prodotti_merch: {
        Row: {
          id: string
          scuola_id: string
          nome: string
          descrizione: string | null
          prezzo: number
          immagine_url: string | null
          disponibile: boolean
          stock: number
          created_at: string
          updated_at: string
          colore: string | null
          stripe_product_id?: string
          stripe_price_id?: string
        }
        Insert: {
          id?: string
          scuola_id: string
          nome: string
          descrizione?: string | null
          prezzo: number
          immagine_url?: string | null
          disponibile?: boolean
          stock?: number
          created_at?: string
          updated_at?: string
          colore: string | null
          stripe_product_id?: string
          stripe_price_id?: string
        }
        Update: {
          id?: string
          scuola_id?: string
          nome?: string
          descrizione?: string | null
          prezzo?: number
          immagine_url?: string | null
          disponibile?: boolean
          stock?: number
          created_at?: string
          updated_at?: string
          colore: string | null
        }
      }
      prodotti_merch_immagini: {
  Row: {
    id: string
    prodotto_id: string
    immagine_url: string
    created_at: string
  }
  Insert: {
    id?: string
    prodotto_id: string
    immagine_url: string
    created_at?: string
  }
  Update: {
    id?: string
    prodotto_id?: string
    immagine_url?: string
    created_at?: string
  }
}
varianti_prodotto_merch: {
  Row: {
    id: string
    prodotto_id: string
    colore: string
    taglia: string
    stock: number
    prezzo_override: number | null
    immagine_url: string | null
    created_at: string
    stripe_product_id?: string
    stripe_price_id?: string
  }
  Insert: {
    id?: string
    prodotto_id: string
    colore: string
    taglia: string
    stock: number
    prezzo_override?: number | null
    immagine_url?: string | null
    created_at?: string
    stripe_product_id?: string
    stripe_price_id?: string
  }
  Update: {
    id?: string
    prodotto_id?: string
    colore?: string
    taglia?: string
    stock?: number
    prezzo_override?: number | null
    immagine_url?: string | null
    created_at?: string
  }
}

    }
  }
}

export type Scuola = Database["public"]["Tables"]["scuole"]["Row"]
export type ProdottoMerch = Database["public"]["Tables"]["prodotti_merch"]["Row"]
export type NewProdottoMerch = Database["public"]["Tables"]["prodotti_merch"]["Insert"]
export type UpdateProdottoMerch = Database["public"]["Tables"]["prodotti_merch"]["Update"]
export type ImmagineProdottoMerch = Database["public"]["Tables"]["prodotti_merch_immagini"]["Row"]
export type NewImmagineProdottoMerch = Database["public"]["Tables"]["prodotti_merch_immagini"]["Insert"]

export type VarianteProdottoMerch = Database["public"]["Tables"]["varianti_prodotto_merch"]["Row"]
export type NewVarianteProdottoMerch = Database["public"]["Tables"]["varianti_prodotto_merch"]["Insert"]


export interface ProdottoWithScuola extends ProdottoMerch {
  scuole: Scuola
}

export interface DashboardStats {
  totalRevenue: number
  totalProducts: number
  totalOrders: number         // <--- richiesta
  totalSchools: number
  pendingOrders: number       // <--- richiesta
  lowStockProducts: number
  monthlyRevenue: number[]
  topProducts: { name: string; sales: number; scuola: string | null }[]; 
  topSchools: { nome: string; prodotti: number; fatturato: number }[]
}
// types/database.ts
export interface DashboardStatsDB {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  pendingOrders: number
  monthlyRevenue: number[]
  topProducts: { nome: string; vendite: number; scuola: string }[]
}

// types/index.ts

// Adjusted to reflect what Supabase returns for joined data (an array)
export type UtenteQueryResult = { // Renamed to clarify it's the raw query result structure
  id: string;
  nome: string;
  cognome: string;
  scuola: { id: string; nome: string } | null;
}[]; // <--- THIS IS THE KEY CHANGE: IT's AN ARRAY

// Adjusted for product
export type ProdottoMerchQueryResult = { // Renamed
  id: string;
  nome: string;
  prezzo: number;
  stock_quantity: number | null;
  immagine_url: string | null;
  colore: { id: string; nome: string } | null;
}[]; // <--- THIS IS THE KEY CHANGE: IT's AN ARRAY

// Adjusted for variant
export type VarianteProdottoMerchQueryResult = { // Renamed
  id: string;
  nome: string;
  prezzo: number;
  colore: { id: string; nome: string } | null;
}[]; // <--- THIS IS THE KEY CHANGE: IT's AN ARRAY

// This type represents the direct output of your Supabase JOIN query for orders
export type OrderRawQueryResult = {
  id: string;
  timestamp: string;
  quantita: number;
  stato: string;
  prodotto: ProdottoMerch[];
  variante: VarianteProdottoMerch[];
  utente: Utente[];
};


export type Promozione = {
  id: string;
  locale_id: string;
  name: string;
  description?: string | null;
  discount?: string | null;
  valid_until?: string | null; // oppure Date se lo converti
  created_at?: string | null;
};

export type Locale = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  address?: string | null;
  created_at?: string | null;
  image_url?: string | null;
  latitudine?: number | null;
  longitudine?: number | null;
};


export type LocaleWithPromozioni = Locale & {
  promozioni: Promozione[];
  immagini_locali?: string[]; // array di URL immagini del locale
};

export type LocaliWithPromo = LocaleWithPromozioni[];


export interface Discoteca {
  id: string
  nome: string
  indirizzo: string
}

export interface Evento {
  id: string
  nome: string
  descrizione: string
  data: string
  prezzo: number
  locandina_url: string
  discoteca_id: string
  max_partecipanti?: number
  stato: string
}

export interface Biglietto {
  id: string
  utente_id: string
  evento_id: string
  stato_pagamento: string
  prezzo_pagato: number
  timestamp: string
}

export interface EventoConStatistiche extends Evento {
  partecipanti_count: number
  ricavi: number
  tasso_riempimento: number
}