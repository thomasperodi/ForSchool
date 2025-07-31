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
import { getScuole, createProdotto, getTaglie } from "@/lib/database-functions"

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
    colore:"",
    taglie: [] as number[] // ✅ nuovo campo
  })

  const [taglie, setTaglie] = useState<{ id: number; nome: string }[]>([])
const [selectedTaglie, setSelectedTaglie] = useState<number[]>([])


  // array di immagini prodotto
  const [immagini, setImmagini] = useState<File[]>([])

  // varianti con immagine singola per variante
  const [varianti, setVarianti] = useState<Array<{
  colore: string
  taglia: string
  stock: string
  prezzo_override: string
  immagine: File[] | null
  taglie: number[]        // ✅ AGGIUNTO
}>>([
  {
    colore: "",
    taglia: "",
    stock: "",
    prezzo_override: "",
    immagine: null,
    taglie: [],           // ✅ AGGIUNTO
  }
])



  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadScuole()
    loadTaglie()
  }, [])
const loadTaglie = async () => {
  const data = await getTaglie()
  setTaglie(data)
}
  useEffect(() => {
    if (selectedSchoolId) {
      setFormData((prev) => ({ ...prev, scuola_id: selectedSchoolId }))
    }
  }, [selectedSchoolId])

  const loadScuole = async () => {
    const data = await getScuole()
    setScuole(data)
  }

  // Apertura finestra file selector per immagini prodotto
  const onUploadButtonClick = () => {
    fileInputRef.current?.click()
  }

  // Aggiunge nuove immagini all'array immagini
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      setImmagini((prev) => [...prev, ...newFiles])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // validazione
    if (!formData.scuola_id || !formData.nome || !formData.prezzo) {
      alert("Campi obbligatori mancanti")
      setLoading(false)
      return
    }

    const newProdotto: NewProdottoMerch = {
  scuola_id: formData.scuola_id,
  nome: formData.nome,
  descrizione: formData.descrizione || null,
  prezzo: parseFloat(formData.prezzo),
  stock: parseInt(formData.stock, 10),
  disponibile: true,
  colore: formData.colore
}


    const res = await createProdotto(newProdotto, immagini, varianti, formData.taglie)
    if (res) {
      // reset form
      setFormData({
        scuola_id: selectedSchoolId || "",
        nome: "",
        descrizione: "",
        prezzo: "",
        stock: "",
        colore: "",
        taglie: [] // reset taglie
      })
      setImmagini([])
      setVarianti([{
        colore: "", taglia: "", stock: "", prezzo_override: "", immagine: null,
        taglie: []
      }])
      if (fileInputRef.current) fileInputRef.current.value = ""
      onProductAdded()
    } else {
      alert("Errore creazione prodotto")
    }
    setLoading(false)
  }

  function updateVariante(idx: number, field: keyof typeof varianti[0], value: string) {
    setVarianti((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)))
  }

  function removeVariante(idx: number) {
    setVarianti((prev) => prev.filter((_, i) => i !== idx))
  }

  function addVariante() {
  setVarianti((prev) => [
    ...prev,
    {
      colore: "",
      taglia: "",
      stock: "",
      prezzo_override: "",
      immagine: null,
      taglie: []    // ✅ AGGIUNTO
    }
  ])
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
            <div className="space-y-2">
  <Label htmlFor="colore">Nome Colore</Label>
  <Input
    id="colore"
    type="text"
    value={formData.colore}
    onChange={(e) => setFormData({ ...formData, colore: e.target.value })}
    placeholder="Es. Rosso, Nero, ecc."
  />
</div>
<div className="col-span-full space-y-4">
  <div className="space-y-2">
  <Label>Taglie per prodotto base</Label>
  <div className="flex flex-wrap gap-2">
    {taglie.map((taglia) => {
      const isSelected = formData.taglie.includes(taglia.id)
      return (
        <button
          key={taglia.id}
          type="button"
          onClick={() => {
            const nuoveTaglie = isSelected
              ? formData.taglie.filter((id) => id !== taglia.id)
              : [...formData.taglie, taglia.id]
            setFormData((prev) => ({ ...prev, taglie: nuoveTaglie }))
          }}
          className={`px-3 py-1 rounded-lg border transition-colors ${
            isSelected
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white hover:bg-gray-100 border-gray-300"
          }`}
        >
          {taglia.nome}
        </button>
      )
    })}
  </div>
</div>

  
</div>





          </div>

          {/* Gestione immagini prodotto */}
          <div className="space-y-2">
            <Label>Immagini del prodotto</Label>
            <div className="flex flex-wrap gap-4">
              {immagini.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={URL.createObjectURL(img)} className="w-20 h-20 object-cover rounded-lg border" alt={`immagine prodotto ${idx + 1}`} />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setImmagini((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={onUploadButtonClick} className="w-20 h-20 border-dashed flex items-center justify-center">
                <Upload className="h-4 w-4" />
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                multiple
                ref={fileInputRef}
                onChange={onFileChange}
              />
            </div>
          </div>

          {/* Varianti dinamiche */}
          {/* Varianti dinamiche */}
<div className="space-y-4">
  {varianti.map((v, idx) => (
    <div
      key={idx}
      className="space-y-4 rounded-xl border p-4 shadow-sm bg-white"
    >
      {/* Selettore Taglie */}
      <div className="space-y-1">
        <Label>Taglie disponibili</Label>
        <div className="flex flex-wrap gap-2">
          {taglie.map((taglia) => {
            const isSelected = v.taglie?.includes(taglia.id);
            return (
              <button
                key={taglia.id}
                type="button"
                onClick={() => {
                  setVarianti((prev) =>
                    prev.map((item, i) => {
                      if (i !== idx) return item;
                      const nuoveTaglie = isSelected
                        ? (item.taglie || []).filter((id) => id !== taglia.id)
                        : [...(item.taglie || []), taglia.id];
                      return { ...item, taglie: nuoveTaglie };
                    })
                  );
                }}
                className={`px-3 py-1 rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white hover:bg-gray-100 border-gray-300"
                }`}
              >
                {taglia.nome}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Variante */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <Input
          placeholder="Colore"
          value={v.colore}
          onChange={(e) => updateVariante(idx, "colore", e.target.value)}
          required
        />
        <Input
          type="number"
          placeholder="Stock"
          value={v.stock}
          onChange={(e) => updateVariante(idx, "stock", e.target.value)}
          required
          min={0}
        />
        <Input
          type="number"
          placeholder="Prezzo override (€)"
          value={v.prezzo_override}
          onChange={(e) => updateVariante(idx, "prezzo_override", e.target.value)}
          min={0}
          step="0.01"
        />

        {/* Upload immagine */}
        <div>
          <input
            type="file"
            accept="image/*"
            id={`variant-img-${idx}`}
            className="hidden"
            multiple
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : null;
              setVarianti((prev) =>
                prev.map((item, i) =>
                  i === idx ? { ...item, immagine: files } : item
                )
              );
            }}
          />
          <label
            htmlFor={`variant-img-${idx}`}
            className="cursor-pointer inline-flex items-center gap-2 rounded border px-3 py-1 text-sm hover:bg-gray-100"
          >
            {v.immagine && v.immagine.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto max-w-[200px]">
                {v.immagine.map((imgFile, i) => (
                  <img
                    key={i}
                    src={URL.createObjectURL(imgFile)}
                    alt={`anteprima variante ${i + 1}`}
                    className="h-8 w-8 object-cover rounded"
                  />
                ))}
              </div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>
              {v.immagine && v.immagine.length > 0
                ? "Cambia immagine"
                : "Carica immagine"}
            </span>
          </label>
        </div>

        {/* Bottone rimozione */}
        <Button
          type="button"
          variant="destructive"
          onClick={() => removeVariante(idx)}
          className="w-full max-w-[100px]"
          aria-label="Rimuovi variante"
        >
          Rimuovi
        </Button>
      </div>
    </div>
  ))}

  <Button type="button" variant="outline" onClick={addVariante} className="mt-2">
    Aggiungi Variante
  </Button>
</div>



          <div className="flex flex-col sm:flex-row justify-end space-x-0 sm:space-x-4 space-y-2 sm:space-y-0">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salva Prodotto"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
