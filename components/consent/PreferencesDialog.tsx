'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useConsent } from "./ConsentProvider";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

export function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { prefs, setPrefs } = useConsent();
  const [local, setLocal] = useState(prefs);

  // Recupero preferenze da Secure Storage se disponibili (solo mobile)
useEffect(() => {
  let mounted = true;

  const loadPrefs = async () => {
    try {
      const stored = await SecureStoragePlugin.get({ key: 'cookie_prefs' });
      if (mounted && stored?.value) {
        const parsed = JSON.parse(stored.value);
        setLocal(parsed);
        setPrefs(parsed);
      } else if (mounted && prefs) {
        setLocal(prefs);
      }
    } catch (e) {
      if (mounted && prefs) setLocal(prefs);
    }
  };

  loadPrefs();

  return () => {
    mounted = false;
  };
  // Vuoi eseguire solo al mount, quindi array vuoto
}, []);


  const save = async () => {
    if (local) {
      await setPrefs(local);
      // salvo anche in Secure Storage su mobile
      try {
        await SecureStoragePlugin.set({ key: 'cookie_prefs', value: JSON.stringify(local) });
      } catch (e) {
        console.error("Errore nel salvare le preferenze su Secure Storage:", e);
      }
    }
    onOpenChange(false);
  };

  const openPrivacyPolicy = async () => {
    // Browser Capacitor per aprire link in-app o esterni
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: 'https://www.iubenda.com/privacy-policy/79987490' });
  };

  const openCookiePolicy = async () => {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: 'https://www.iubenda.com/privacy-policy/79987490/cookie-policy' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica preferenze cookie</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Puoi modificare le tue preferenze sui cookie in qualsiasi momento. Consulta la nostra{" "}
            <button onClick={openPrivacyPolicy} className="underline text-blue-600">Privacy Policy</button>{" "}
            e la{" "}
            <button onClick={openCookiePolicy} className="underline text-blue-600">Cookie Policy</button>.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Analitica</span>
              <Switch
                checked={local?.analytics}
                onCheckedChange={(v) => setLocal((p) => ({ ...p!, analytics: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Funzionali</span>
              <Switch
                checked={local?.functional}
                onCheckedChange={(v) => setLocal((p) => ({ ...p!, functional: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Marketing</span>
              <Switch
                checked={local?.marketing}
                onCheckedChange={(v) => setLocal((p) => ({ ...p!, marketing: v }))}
              />
            </div>
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
