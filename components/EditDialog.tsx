'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type BaseFieldType = 'text' | 'number' | 'select' | 'checkbox'

type FieldDefinition<T> = {
  name: keyof T
  label: string
  type: BaseFieldType
  options?: { value: string | number; label: string }[] // solo per select
}

type EditDialogProps<T> = {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  id: string | null;
  title: string;
  fields: FieldDefinition<T>[];
  initialValues: T;
  submitText: string;
  onSubmit: (updated: T) => void;
  onSave: (data: T) => void; // funzione per salvare i dati
}

export function EditDialog<T>({
  open,
  onOpenChange,
  title,
  fields,
  initialValues,
  onSave,
}: EditDialogProps<T>) {
  const [formData, setFormData] = useState<T>(initialValues)

  // Quando cambia initialValues, aggiorna il form (se modifichi il prodotto da editare)
  useEffect(() => {
    setFormData(initialValues)
  }, [initialValues])

  const handleChange = <K extends keyof T>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = () => {
    onSave(formData)
    onOpenChange(false) // chiudi dialog dopo salvataggio
  }

return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Modifica i campi desiderati e premi &quot;Salva&quot;.
        </DialogDescription>
      </DialogHeader>

      <form className="grid gap-4 py-4">
        {fields.map((field) => (
          <div key={String(field.name)} className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={String(field.name)} className="text-right">
              {field.label}
            </Label>

            <div className="col-span-3">
              {field.type === 'select' ? (
                <Select
                  value={String(formData[field.name] ?? '')}
                  onValueChange={(value) =>
                    handleChange(field.name, value as T[typeof field.name])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Seleziona ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'number' ? (
                <Input
                  type="number"
                  id={String(field.name)}
                  value={
                    formData[field.name] !== undefined && formData[field.name] !== null
                      ? (formData[field.name] as number | string)
                      : ''
                  }
                  onChange={(e) =>
                    handleChange(field.name, Number(e.target.value) as T[typeof field.name])
                  }
                />
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  id={String(field.name)}
                  checked={Boolean(formData[field.name])}
                  onChange={(e) =>
                    handleChange(field.name, e.target.checked as T[typeof field.name])
                  }
                />
              ) : (
                <Input
                  id={String(field.name)}
                  value={(formData[field.name] ?? '') as string}
                  onChange={(e) =>
                    handleChange(field.name, e.target.value as T[typeof field.name])
                  }
                />
              )}
            </div>
          </div>
        ))}
      </form>

      <DialogFooter>
        <Button type="button" onClick={handleSubmit}>
          Salva
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

}
