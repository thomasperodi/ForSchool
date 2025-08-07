"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Eye, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface Promotion {
  id: string
  name: string
  description: string
  discount: string
  discountType: 'percentage' | 'fixed'
  startDate: string
  endDate: string
  redeemed: number
  status: 'active' | 'expired' | 'draft'
  image?: string
}

const mockPromotions: Promotion[] = [
  {
    id: '1',
    name: 'Sconto Aperitivo',
    description: 'Sconto del 20% su tutti gli aperitivi dalle 18:00 alle 20:00',
    discount: '20',
    discountType: 'percentage',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    redeemed: 23,
    status: 'active'
  },
  {
    id: '2',
    name: 'Menu Pranzo Speciale',
    description: 'Menu pranzo completo a prezzo scontato',
    discount: '5',
    discountType: 'fixed',
    startDate: '2024-01-05',
    endDate: '2024-01-20',
    redeemed: 45,
    status: 'active'
  },
  {
    id: '3',
    name: 'Happy Hour Weekend',
    description: 'Doppio sconto nel weekend per happy hour',
    discount: '30',
    discountType: 'percentage',
    startDate: '2023-12-15',
    endDate: '2023-12-31',
    redeemed: 67,
    status: 'expired'
  }
]

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    startDate: '',
    endDate: '',
    image: ''
  })

  const handleCreatePromotion = () => {
    const newPromotion: Promotion = {
      id: Date.now().toString(),
      ...formData,
      redeemed: 0,
      status: 'active'
    }
    
    setPromotions([...promotions, newPromotion])
    setIsCreateDialogOpen(false)
    setFormData({
      name: '',
      description: '',
      discount: '',
      discountType: 'percentage',
      startDate: '',
      endDate: '',
      image: ''
    })
    
    toast.success("Promozione creata con successo")
  }

  const handleDeletePromotion = (id: string) => {
    setPromotions(promotions.filter(p => p.id !== id))
    toast.success("Promozione eliminata correttamente")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Attiva</Badge>
      case 'expired':
        return <Badge variant="secondary">Scaduta</Badge>
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handlePreview = (promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setIsPreviewDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Promozioni</h1>
          <p className="text-muted-foreground">
            Crea, modifica e gestisci le tue promozioni
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuova Promozione
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crea Nuova Promozione</DialogTitle>
              <DialogDescription>
                Compila i dettagli per creare una nuova promozione.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descrizione
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discountType" className="text-right">
                  Tipo Sconto
                </Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: 'percentage' | 'fixed') => setFormData({...formData, discountType: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentuale</SelectItem>
                    <SelectItem value="fixed">Importo Fisso (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right">
                  Sconto
                </Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({...formData, discount: e.target.value})}
                  className="col-span-3"
                  placeholder={formData.discountType === 'percentage' ? '20' : '5.00'}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  Data Inizio
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  Data Fine
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreatePromotion}>
                Crea Promozione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutte le Promozioni</CardTitle>
          <CardDescription>
            Visualizza e gestisci tutte le tue promozioni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Sconto</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Riscatti</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell className="font-medium">{promotion.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{promotion.description}</TableCell>
                  <TableCell>
                    {promotion.discount}{promotion.discountType === 'percentage' ? '%' : '€'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(promotion.startDate).toLocaleDateString('it-IT')} - {new Date(promotion.endDate).toLocaleDateString('it-IT')}
                    </div>
                  </TableCell>
                  <TableCell>{promotion.redeemed}</TableCell>
                  <TableCell>{getStatusBadge(promotion.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(promotion)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePromotion(promotion.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Anteprima */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Anteprima Promozione</DialogTitle>
            <DialogDescription>
              Ecco come apparirà la tua promozione ai clienti
            </DialogDescription>
          </DialogHeader>
          {selectedPromotion && (
            <div className="py-4">
              <Card className="w-full">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedPromotion.discount}{selectedPromotion.discountType === 'percentage' ? '%' : '€'}
                  </div>
                  <CardTitle className="text-xl">{selectedPromotion.name}</CardTitle>
                  <CardDescription>{selectedPromotion.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Valida dal {new Date(selectedPromotion.startDate).toLocaleDateString('it-IT')} al {new Date(selectedPromotion.endDate).toLocaleDateString('it-IT')}
                    </p>
                    <Badge variant="outline">Codice: PROMO{selectedPromotion.id}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsPreviewDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
