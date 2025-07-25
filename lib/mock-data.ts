import type { ProdottoWithScuola, DashboardStats } from "@/types/database"
import type { Order } from "@/types/index"


export const mockProducts: ProdottoWithScuola[] = [
  {
    id: "1",
    scuola_id: "scuola1",
    nome: "T-Shirt Logo Aziendale",
    descrizione: "T-shirt in cotone 100% con logo aziendale stampato",
    prezzo: 25.99,
    immagine_url: "/placeholder.svg?height=40&width=40&text=T-Shirt",
    disponibile: true,
    stock: 150,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
    colore: "bianco",
    scuole: {
      id: "scuola1",
      nome: "Istituto Tecnico Industriale",
      citta: "Milano",
      dominio: null,
    },
  },
  {
    id: "2",
    scuola_id: "scuola2",
    nome: "Tazza Personalizzata",
    descrizione: "Tazza in ceramica con stampa personalizzata",
    prezzo: 12.99,
    immagine_url: "/placeholder.svg?height=40&width=40&text=Tazza",
    disponibile: true,
    stock: 75,
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-01-18T00:00:00Z",
    colore: "nero",
    scuole: {
      id: "scuola2",
      nome: "Liceo Scientifico Galileo",
      citta: "Roma",
      dominio: null,
    },
  },
  {
    id: "3",
    scuola_id: "scuola1",
    nome: "Felpa con Cappuccio",
    descrizione: "Felpa con cappuccio in cotone pesante",
    prezzo: 45.99,
    immagine_url: "/placeholder.svg?height=40&width=40&text=Felpa",
    disponibile: false,
    stock: 0,
    created_at: "2024-01-05T00:00:00Z",
    updated_at: "2024-01-22T00:00:00Z",
    colore: "grigio",
    scuole: {
      id: "scuola1",
      nome: "Istituto Tecnico Industriale",
      citta: "Milano",
      dominio: null,
    },
  },
]


export const mockOrders: Order[] = [
  {
    id: "ORD-001",
    customerName: "Mario Rossi",
    customerEmail: "mario.rossi@email.com",
    items: [{ productId: "1", productName: "T-Shirt Logo Aziendale", quantity: 2, price: 25.99 }],
    total: 51.98,
    status: "processing",
    createdAt: new Date("2024-01-22"),
    shippingAddress: "Via Roma 123, Milano, MI 20100",
  },
  {
    id: "ORD-002",
    customerName: "Giulia Bianchi",
    customerEmail: "giulia.bianchi@email.com",
    items: [
      { productId: "2", productName: "Tazza Personalizzata", quantity: 1, price: 12.99 },
      { productId: "1", productName: "T-Shirt Logo Aziendale", quantity: 1, price: 25.99 },
    ],
    total: 38.98,
    status: "shipped",
    createdAt: new Date("2024-01-21"),
    shippingAddress: "Corso Italia 456, Roma, RM 00100",
  },
]

export const mockStats: DashboardStats = {
  totalRevenue: 15420.5,
  totalProducts: 28,
  totalSchools: 2,
  lowStockProducts: 3,
  monthlyRevenue: [8500, 9200, 10100, 11500, 12800, 13200, 14100, 15420],
  topProducts: [
    { nome: "T-Shirt Logo Aziendale", vendite: 156, scuola: "Istituto Tecnico Industriale" },
    { nome: "Tazza Personalizzata", vendite: 89, scuola: "Liceo Scientifico Galileo" },
    { nome: "Felpa con Cappuccio", vendite: 67, scuola: "Istituto Tecnico Industriale" },
  ],
  topSchools: [
    { nome: "Istituto Tecnico Industriale", prodotti: 12, fatturato: 8200 },
    { nome: "Liceo Scientifico Galileo", prodotti: 16, fatturato: 7200 },
  ],
}

