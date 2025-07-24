"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Scuola } from "../types/database"
import { getScuole } from "../lib/database-functions"

interface SchoolSelectorProps {
  selectedSchool: string | null
  onSchoolChange: (schoolId: string | null) => void
  onAddSchool: () => void
}

export function SchoolSelector({ selectedSchool, onSchoolChange, onAddSchool }: SchoolSelectorProps) {
  const [scuole, setScuole] = useState<Scuola[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadScuole()
  }, [])

  const loadScuole = async () => {
    setLoading(true)
    const data = await getScuole()
    setScuole(data)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedSchool || "all"} onValueChange={(value) => onSchoolChange(value === "all" ? null : value)}>
        <SelectTrigger className="w-[200px] md:w-[250px]">
          <SelectValue placeholder="Seleziona scuola" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutte le scuole</SelectItem>
          {scuole.map((scuola) => (
            <SelectItem key={scuola.id} value={scuola.id}>
              {scuola.nome} - {scuola.citta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onAddSchool}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
