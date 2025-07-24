"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Eye } from "lucide-react"
import type { ProdottoWithScuola } from "@/types/database"
import Image from "next/image"
import { MobileProductsList } from "./mobile-products-list"
import { deleteProdotto } from "@/lib/database-functions"

interface ProductsTableProps {
  products: ProdottoWithScuola[]
  onProductDeleted: (id: string) => void
}

interface MobileProductsListProps {
  products: ProdottoWithScuola[]
  onProductDeleted: (id: string) => void
}


export function ProductsTable({ products, onProductDeleted }: ProductsTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const getStatusBadge = (product: ProdottoWithScuola) => {
    if (!product.disponibile) {
      return <Badge variant="secondary">Non Disponibile</Badge>
    }
    if (product.stock === 0) {
      return <Badge variant="destructive">Esaurito</Badge>
    }
    if (product.stock < 10) {
      return <Badge variant="outline">Stock Basso</Badge>
    }
    return <Badge variant="default">Disponibile</Badge>
  }

  const handleDelete = async (id: string) => {
  if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return

  setLoading(id)
  const success = await deleteProdotto(id)
  if (success) {
    onProductDeleted(id)   // <-- passa id qui
  }
  setLoading(null)
}

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Prodotti ({products.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Vista Desktop */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Scuola</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Creazione</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Image
                        src={product.immagine_url || "/placeholder.svg?height=40&width=40&text=Prodotto"}
                        alt={product.nome}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium">{product.nome}</div>
                        <div className="text-sm text-muted-foreground">{product.descrizione?.substring(0, 50)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.scuole.nome}</div>
                      <div className="text-sm text-muted-foreground">{product.scuole.citta}</div>
                    </div>
                  </TableCell>
                  <TableCell>€{product.prezzo.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={product.stock < 10 ? "text-red-500 font-medium" : ""}>{product.stock}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(product)}</TableCell>
                  <TableCell>{new Date(product.created_at).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        disabled={loading === product.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Vista Mobile */}
        <div className="lg:hidden">
          <MobileProductsList
  products={products}
  onProductDeleted={onProductDeleted} // passa direttamente la funzione senza wrapper
/>

        </div>

        {products.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nessun prodotto trovato. Aggiungi il primo prodotto!
          </div>
        )}
      </CardContent>
    </Card>
  )
}
