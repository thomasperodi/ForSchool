'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useConsent, ConsentPreferences } from "./ConsentProvider";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

export function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { prefs, setPrefs } = useConsent();

  // DEFAULT aggiornati: version=2, nessun tracking, analytics è anonima/cookieless
  const DEFAULT: ConsentPreferences = { necessary: true, analytics: false, version: 2 };
  const [local, setLocal] = useState<ConsentPreferences>(DEFAULT);

  useEffect(() => {
    let mounted = true;

    const loadPrefs = async () => {
      try {
        const stored = await SecureStoragePlugin.get({ key: "cookie_prefs" });
        if (mounted && stored?.value) {
          const parsed = JSON.parse(stored.value) as ConsentPreferences;
          // Se le preferenze salvate sono ante bump (version < 2), forziamo i nuovi default
          if (!parsed.version || parsed.version < 2) {
            setLocal(DEFAULT);
          } else {
            setLocal(parsed);
          }
        } else if (mounted && prefs) {
          // Allinea allo stato globale solo se già versione >= 2, altrimenti usa DEFAULT
          if (!prefs.version || prefs.version < 2) {
            setLocal(DEFAULT);
          } else {
            setLocal(prefs);
          }
        }
      } catch {
        if (mounted) setLocal(prefs && prefs.version >= 2 ? prefs : DEFAULT);
      }
    };

    loadPrefs();
    return () => { mounted = false; };
  }, [prefs]);

  const save = async () => {
    // forza version=2
    const toSave: ConsentPreferences = { ...local, version: 2 };
    await setPrefs(toSave);
    try {
      await SecureStoragePlugin.set({ key: "cookie_prefs", value: JSON.stringify(toSave) });
    } catch (e) {
      console.error("Errore salvataggio su SecureStorage:", e);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferenze cookie</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Usiamo solo cookie tecnici necessari al funzionamento (es. autenticazione).
            Le statistiche sono <strong>anonime e senza cookie</strong> (nessun tracciamento
            pubblicitario, nessuna condivisione con terze parti).
          </p>

          <div className="flex items-center justify-between">
            <span>Analitica (anonima, cookieless)</span>
            <Switch
              checked={local.analytics}
              onCheckedChange={(v) => setLocal((p) => ({ ...p, analytics: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={save}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
