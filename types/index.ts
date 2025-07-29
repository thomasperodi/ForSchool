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
