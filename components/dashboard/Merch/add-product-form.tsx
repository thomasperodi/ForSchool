"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X } from "lucide-react"
import type { Scuola, NewProdottoMerch } from "@/types/database"
import { getScuole, createProdotto } from "@/lib/database-functions"

interface AddProductFormProps {
  onProductAdded: () => void
  selectedSchoolId?: string | null
}

export function AddProductForm({ onProductAdded, selectedSchoolId }: AddProductFormProps) {
  const [scuole, setScuole] = useState<Scuola[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    scuola_id: selectedSchoolId || "",
    nome: "",
    descrizione: "",
    prezzo: "",
    stock: "",
    immagine_url: "",
  })
  const [file, setFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadScuole()
  }, [])

  useEffect(() => {
    if (selectedSchoolId) {
      setFormData((prev) => ({ ...prev, scuola_id: selectedSchoolId }))
    }
  }, [selectedSchoolId])

  const loadScuole = async () => {
    const data = await getScuole()
    setScuole(data)
  }

  // Apertura finestra file selector
  const onUploadButtonClick = () => {
    fileInputRef.current?.click()
  }

  // Quando seleziono il file aggiorno lo state con l’anteprima
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null
    setFile(selectedFile)

    if (selectedFile) {
      // Mostro l’anteprima immagine caricata
      const imageUrl = URL.createObjectURL(selectedFile)
      setFormData((prev) => ({ ...prev, immagine_url: imageUrl }))
    } else {
      setFormData((prev) => ({ ...prev, immagine_url: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validazioni basilari (da migliorare lato UI)
      if (
        !formData.scuola_id ||
        !formData.nome ||
        !formData.prezzo ||
        !formData.stock
      ) {
        alert("Compila tutti i campi obbligatori!")
        setLoading(false)
        return
      }

      const newProdotto: NewProdottoMerch = {
        scuola_id: formData.scuola_id,
        nome: formData.nome,
        descrizione: formData.descrizione || null,
        prezzo: Number.parseFloat(formData.prezzo),
        stock: Number.parseInt(formData.stock),
        immagine_url: null, // lo inserisco dopo upload
        disponibile: true,
      }

      // Passo file alla funzione createProdotto per upload su bucket + DB
      const result = await createProdotto(newProdotto, file ?? undefined)

      if (result) {
        // Reset form e file
        setFormData({
          scuola_id: selectedSchoolId || "",
          nome: "",
          descrizione: "",
          prezzo: "",
          stock: "",
          immagine_url: "",
        })
        setFile(null)
        onProductAdded()
      } else {
        alert("Errore nella creazione del prodotto")
      }
    } catch (error) {
      alert("Errore imprevisto: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aggiungi Nuovo Prodotto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scuola">Scuola</Label>
              <Select
                value={formData.scuola_id}
                onValueChange={(value) => setFormData({ ...formData, scuola_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona scuola" />
                </SelectTrigger>
                <SelectContent>
                  {scuole.map((scuola) => (
                    <SelectItem key={scuola.id} value={scuola.id}>
                      {scuola.nome} - {scuola.citta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Prodotto</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Es. T-Shirt con Logo Scuola"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              placeholder="Descrizione dettagliata del prodotto..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prezzo">Prezzo (€)</Label>
              <Input
                id="prezzo"
                type="number"
                step="0.01"
                value={formData.prezzo}
                onChange={(e) => setFormData({ ...formData, prezzo: e.target.value })}
                placeholder="25.99"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Quantità in Stock</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Immagine Prodotto</Label>
            <div className="flex items-center gap-4">
              {formData.immagine_url ? (
                <div className="relative">
                  <img
                    src={formData.immagine_url}
                    alt="Anteprima prodotto"
                    className="w-20 h-20 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => {
                      setFile(null)
                      setFormData((prev) => ({ ...prev, immagine_url: "" }))
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-20 h-20 border-dashed bg-transparent"
                  onClick={onUploadButtonClick}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              )}

              {/* input file nascosto */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={onFileChange}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto bg-transparent"
              onClick={() => {
                setFile(null)
                setFormData({
                  scuola_id: selectedSchoolId || "",
                  nome: "",
                  descrizione: "",
                  prezzo: "",
                  stock: "",
                  immagine_url: "",
                })
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            >
              Annulla
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              {loading ? "Aggiungendo..." : "Aggiungi Prodotto"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
