export interface Product {
  id: string
  name: string
  description: string
  price: number
  cost: number
  category: string
  images: string[]
  stock: number
  status: "active" | "inactive" | "out_of_stock"
  createdAt: Date
  updatedAt: Date
}
export type Utente = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  scuola_id: string | null;
  classe: string | null;
  scuola?: Scuola | null;
};

// Tipo base per Scuola
export type Scuola = {
  id: string;
  nome: string;
  indirizzo?: string | null;
};

// Tipo base per Prodotto Merch
export type ProdottoMerch = {
  id: string;
  nome: string;
  descrizione?: string | null;
  prezzo: number;
  colore?: { id: string; nome: string } | null; // Colori disponibili
  immagine_url?: string | null; // URL dell'immagine del prodotto
};

// Tipo base per Variante Prodotto Merch
export type VarianteProdottoMerch = {
  id: string;
  prodotto_id: string;
  taglia?: string | null;
  colore?: string | null;
  prezzo?: number | null;
};
export interface Order {
  id: string
  customerName: string
  customerEmail: string
  items: OrderItem[]
  total: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  createdAt: Date
  shippingAddress: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
}
export type OrdineMerchCompleto = {
  id: string;
  utente_id: string | null;
  prodotto_id: string | null;
  variante_id: string | null;
  quantita: number;
  stato: 'in_attesa' | 'spedito' | 'ritirato';
  timestamp: string;

  // Join
  utente?: Utente | null;
  prodotto?: ProdottoMerch | null;
  variante?: VarianteProdottoMerch | null;
};
export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  pendingOrders: number
  monthlyRevenue: number[]
  topProducts: { name: string; sales: number }[]
}
// Add this type in your types/database.ts or a separate API types file
// or directly in your route.ts if it's only used there.

export type RevenueStats = {
  revenue: number;                 // Fatturato (es. 15420.5)
  revenueChangePercent: number;   // Variazione % rispetto al mese scorso (es. 12.5)
  costs: number;                  // Costi totali (es. 5047.2)
  costsPercentOfRevenue: number;  // % costi sul fatturato (es. 32.7)
  profit: number;                 // Profitto netto (es. 10373.3)
  profitMarginPercent: number;    // Margine profitto (es. 67.3)
  reportMonth: string;            // Mese di riferimento (es. "Luglio 2025")

  totalOrders: number;            // Numero totale ordini (es. 2)
  pendingOrders: number;          // Numero ordini pendenti (es. 1)
  totalProducts: number;          // Numero prodotti totali (es. 1)
  totalSchools: number;           // Numero scuole totali (es. 7)
  lowStockProducts: number;       // Prodotti con stock basso (es. 1)

  monthlyRevenue: number[];       // Array con guadagni mensili (es. [0,0,0,0,220.83,...])

  topProducts: {                  // Lista dei top prodotti
    name: string;
    sales: number;
  }[];

  topSchools: {                   // Lista delle top scuole
    nome: string;
    prodotti: number;
    fatturato: number;
  }[];
};


export type RevenueStatsDetailed = {
  id: string;
  nome: string;
  totaleGuadagnato: number;
  statsMese: {
    mese: string;
    num_pagamenti: number;
    totale_incassato: number;
    totale_commissioni: number;
    profitto: number;
    incasso_medio: number;
    commissione_media: number;
    margine_percentuale: number;
  };
};