'use client';

import { useEffect, useState } from 'react';
import { useConsent } from './ConsentProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PreferencesDialog } from './PreferencesDialog';

export function CookieBanner() {
  const { prefs, setPrefs } = useConsent();
  const [visible, setVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mostra banner solo se non ci sono preferenze
  useEffect(() => {
    setVisible(prefs === null);
  }, [prefs]);

  // OK = accetta tutti i cookie disponibili (analytics inclusi)
  const acceptAll = async () => {
    await setPrefs({ necessary: true, analytics: true, version: 1 });
    setVisible(false);
  };

  // Accetta solo cookie necessari
  const acceptNecessary = async () => {
    await setPrefs({ necessary: true, analytics: false, version: 1 });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Informativa Cookie 🍪</h2>
            <p className="text-sm text-muted-foreground">
              Questo sito utilizza solo cookie tecnici e analitici anonimi (es. Vercel Analytics) per migliorare prestazioni e sicurezza.
            </p>
            <p className="text-sm text-muted-foreground">
              Puoi scegliere di accettare tutti i cookie cliccando <strong>OK</strong>, accettare solo i cookie necessari, oppure modificare le preferenze.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDialogOpen(true)}>Preferenze</Button>
              <Button variant="secondary" onClick={acceptNecessary}>Solo necessari</Button>
              <Button onClick={acceptAll}>OK</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <PreferencesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
