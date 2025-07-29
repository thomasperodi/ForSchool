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
  topProducts: { nome: string; vendite: number; scuola: string }[]
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

