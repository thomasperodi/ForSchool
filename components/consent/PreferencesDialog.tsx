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
  const [local, setLocal] = useState<ConsentPreferences>({ necessary: true, analytics: false, version: 1 });

  useEffect(() => {
    let mounted = true;

    const loadPrefs = async () => {
      try {
        const stored = await SecureStoragePlugin.get({ key: 'cookie_prefs' });
        if (mounted && stored?.value) {
          const parsed = JSON.parse(stored.value);
          setLocal(parsed);
        } else if (mounted && prefs) {
          setLocal(prefs);
        }
      } catch (e) {
        if (mounted && prefs) setLocal(prefs);
      }
    };

    loadPrefs();

    return () => { mounted = false; };
  }, [prefs]);

  const save = async () => {
    await setPrefs(local);
    try {
      await SecureStoragePlugin.set({ key: 'cookie_prefs', value: JSON.stringify(local) });
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
          <p>Gestisci le tue preferenze sui cookie. Solo necessari e analitici anonimi sono disponibili.</p>

          <div className="flex items-center justify-between">
            <span>Analitica</span>
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
