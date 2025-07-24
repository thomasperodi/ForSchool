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
        }
      }
    }
  }
}

export type Scuola = Database["public"]["Tables"]["scuole"]["Row"]
export type ProdottoMerch = Database["public"]["Tables"]["prodotti_merch"]["Row"]
export type NewProdottoMerch = Database["public"]["Tables"]["prodotti_merch"]["Insert"]
export type UpdateProdottoMerch = Database["public"]["Tables"]["prodotti_merch"]["Update"]

export interface ProdottoWithScuola extends ProdottoMerch {
  scuole: Scuola
}

export interface DashboardStats {
  totalRevenue: number
  totalProducts: number
  totalSchools: number
  lowStockProducts: number
  monthlyRevenue: number[]
  topProducts: { nome: string; vendite: number; scuola: string }[]
  topSchools: { nome: string; prodotti: number; fatturato: number }[]
}
