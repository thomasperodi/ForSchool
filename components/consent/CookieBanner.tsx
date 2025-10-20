'use client';

import { useEffect, useState } from 'react';
import { useConsent } from './ConsentProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PreferencesDialog } from './PreferencesDialog';
import { Download } from 'lucide-react';

export function CookieBanner() {
  const { prefs, setPrefs } = useConsent();
  const [visible, setVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setVisible(prefs === null);
  }, [prefs]);

  const acceptAll = async () => {
    // “analytics” qui rimane solo come preferenza UI.
    // Non abilita alcun tracking, perché Vercel Web Analytics è cookieless.
    await setPrefs({ necessary: true, analytics: true, version: 2 });
    setVisible(false);
  };

  const acceptNecessary = async () => {
    await setPrefs({ necessary: true, analytics: false, version: 2 });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Informativa cookie</h2>
            <p className="text-sm text-muted-foreground">
              Nell’app utilizziamo solo cookie tecnici necessari al funzionamento (es. autenticazione).
              Per le statistiche usiamo un sistema <strong>senza cookie e anonimo</strong> (niente
              tracciamento pubblicitario né condivisione con terze parti).
            </p>

            {/* 🔽 Sezione per scaricare i PDF */}
            <div className="flex gap-3 mt-3">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href="/privacy-policy.pdf" download>
                  <Download className="w-4 h-4 mr-2" />
                  Privacy Policy
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href="/cookie-policy.pdf" download>
                  <Download className="w-4 h-4 mr-2" />
                  Cookie Policy
                </a>
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
