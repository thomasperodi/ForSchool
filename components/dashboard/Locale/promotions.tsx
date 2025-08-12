"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import toast from "react-hot-toast"
import { useSession } from "@supabase/auth-helpers-react"
import { supabase } from "@/lib/supabaseClient"

interface Promotion {
  id: string
  name: string
  description: string
  created_at: string
  valid_until: string
  numero_attivazioni: number
  numero_scan: number
  status: "active" | "expired" | "draft"
  image?: string
}

export default function PromotionsPage() {
  const session = useSession()
  const userId = session?.user.id ?? null

  const [localeId, setLocaleId] = useState<string | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    image: "",
  })

  // Recupera localeId da supabase dopo che userId è disponibile
  useEffect(() => {
    if (!userId) return

    const fetchLocaleId = async () => {
      const { data, error } = await supabase
        .from("locali")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Errore nel recupero del locale_id:", error.message)
        return
      }

      setLocaleId(data.id)
    }

    fetchLocaleId()
    
  }, [userId])

  // Fetch promozioni quando localeId è disponibile
 useEffect(() => {
  if (!localeId) return
  fetchPromotions()
}, [localeId])


  const fetchPromotions = async () => {
      try {
        const res = await fetch(`/api/promozioni?locale_id=${localeId}`)
        if (!res.ok) throw new Error("Errore nel fetch promozioni")

        const data: Promotion[] = await res.json()
        setPromotions(data)
      } catch (error) {
        toast.error("Errore caricando le promozioni")
      }
    }
  const handleCreatePromotion = async () => {
    if (!localeId) {
      toast.error("Locale non definito, impossibile creare promozione")
      return
    }

    try {
      const res = await fetch("/api/promozioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale_id: localeId,
          name: formData.name,
          description: formData.description,
          valid_until: formData.endDate,
        }),
      })

      if (!res.ok) throw new Error("Errore durante la creazione")

      const newPromo: Promotion = await res.json()
      setPromotions((old) => [...old, newPromo])
      setIsCreateDialogOpen(false)
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        image: "",
      })
      toast.success("Promozione creata con successo")
    } catch (error) {
      toast.error("Errore durante la creazione della promozione")
    }
  }

  const handleDeletePromotion = async (id: string) => {
    try {
      const res = await fetch(`/api/promozioni/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Errore durante l'eliminazione")

      setPromotions((old) => old.filter((p) => p?.id !== id))
      toast.success("Promozione eliminata correttamente")
    } catch (error) {
      toast.error("Errore durante l'eliminazione della promozione")
    }
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      name: promotion.name,
      description: promotion.description,
      startDate: new Date(promotion.created_at).toISOString().split("T")[0],
      endDate: new Date(promotion.valid_until).toISOString().split("T")[0],
      image: promotion.image || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdatePromotion = async () => {
    if (!editingPromotion) return

    try {
      const res = await fetch(`/api/promozioni/${editingPromotion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          valid_until: formData.endDate,
        }),
      })

      if (!res.ok) throw new Error("Errore durante la modifica")

      fetchPromotions()


      setIsEditDialogOpen(false)
      setEditingPromotion(null)
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        image: "",
      })

      toast.success("Promozione aggiornata con successo")
    } catch (error) {
      toast.error("Errore durante la modifica della promozione")
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="col-span-3"
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
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreatePromotion}>Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promozioni Attive</CardTitle>
          <CardDescription>
            Qui puoi visualizzare, modificare o eliminare le promozioni create.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Attivazioni</TableHead>
                <TableHead>Numero Scan</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions
                .filter((p): p is Promotion => p !== null && p !== undefined)
                .map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell>{promotion.name}</TableCell>
                    <TableCell>{promotion.description}</TableCell>
                    <TableCell>
  {new Date(promotion.created_at).toLocaleDateString('it-IT')} - {new Date(promotion.valid_until).toLocaleDateString('it-IT')}
</TableCell>

                    <TableCell>{promotion.numero_attivazioni}</TableCell>
                    <TableCell>{promotion.numero_scan}</TableCell>
                    
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(promotion)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(promotion)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePromotion(promotion.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Modifica Promozione */}
      {editingPromotion && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifica Promozione</DialogTitle>
              <DialogDescription>
                Modifica i dettagli della promozione selezionata.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editName" className="text-right">
                  Nome
                </Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDescription" className="text-right">
                  Descrizione
                </Label>
                <Textarea
                  id="editDescription"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editStartDate" className="text-right">
                  Data Inizio
                </Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={formData.startDate}
                  disabled
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editEndDate" className="text-right">
                  Data Fine
                </Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdatePromotion}>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Anteprima Promozione */}
      {selectedPromotion && (
        <Dialog
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Anteprima Promozione</DialogTitle>
              <DialogDescription>
                {selectedPromotion.name}
              </DialogDescription>
            </DialogHeader>
            <Card>
              <img
                src={selectedPromotion.image || "/placeholder.jpg"}
                alt={selectedPromotion.name}
                className="w-full h-48 object-cover"
              />
              <CardContent>
                <p>{selectedPromotion.description}</p>
                <p>
                  Validità:{" "}
                  {new Date(selectedPromotion.created_at).toLocaleDateString()} -{" "}
                  {new Date(selectedPromotion.valid_until).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
