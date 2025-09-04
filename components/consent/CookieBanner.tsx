'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useConsent } from "./ConsentProvider";
import { Browser } from '@capacitor/browser';
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  version: number;
};

export function CookieBanner() {
  const { prefs, setPrefs } = useConsent();
  const [local, setLocal] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    functional: false,
    marketing: false,
    version: 1,
  });

  useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);

  if (prefs) return null; // Se prefs esistono, banner sparisce

  const savePrefs = async (updatedPrefs: ConsentPreferences) => {
    await setPrefs(updatedPrefs);
    // Salvo anche su Storage per mobile
    await SecureStoragePlugin.set({ key: 'cookie_prefs', value: JSON.stringify(updatedPrefs) });
  };

  const acceptAll = async () => {
    await savePrefs({ ...local, analytics: true, functional: true, marketing: true });
  };
  const rejectAll = async () => {
    await savePrefs({ ...local, analytics: false, functional: false, marketing: false });
  };
  const save = async () => {
    await savePrefs(local);
  };

  const openPrivacyPolicy = async () => {
    await Browser.open({ url: 'https://www.iubenda.com/privacy-policy/79987490' });
  };

  const openCookiePolicy = async () => {
    await Browser.open({ url: 'https://www.iubenda.com/privacy-policy/79987490/cookie-policy' });
  };

  return (
    <div className="fixed bottom-4 inset-x-0 px-4 z-50">
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-lg">Preferenze Cookie</h3>
          <p className="text-sm text-muted-foreground">
            Usiamo cookie per migliorare l’esperienza e analizzare il traffico. Puoi gestire le tue preferenze.  
            Consulta la nostra{" "}
            <button onClick={openPrivacyPolicy} className="underline text-blue-600">Privacy Policy</button>{" "} 
            e la{" "}
            <button onClick={openCookiePolicy} className="underline text-blue-600">Cookie Policy</button>.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Analitica</span>
              <Switch
                checked={local.analytics}
                onCheckedChange={(v) => setLocal((p) => ({ ...p, analytics: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Funzionali</span>
              <Switch
                checked={local.functional}
                onCheckedChange={(v) => setLocal((p) => ({ ...p, functional: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Marketing</span>
              <Switch
                checked={local.marketing}
                onCheckedChange={(v) => setLocal((p) => ({ ...p, marketing: v }))}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={rejectAll}>Rifiuta</Button>
            <Button variant="outline" onClick={save}>Salva</Button>
            <Button onClick={acceptAll}>Accetta tutto</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
