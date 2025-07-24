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

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  pendingOrders: number
  monthlyRevenue: number[]
  topProducts: { name: string; sales: number }[]
}
