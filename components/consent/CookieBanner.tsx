'use client';

import { useEffect, useState } from 'react';
import { useConsent } from './ConsentProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CookieBanner() {
  const { prefs, setPrefs } = useConsent();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!prefs) {
      setVisible(true);
    }
  }, [prefs]);

  const accept = async () => {
    await setPrefs({
      necessary: true,
      analytics: true,
      functional: false,
      marketing: false,
      version: 1,
    });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Informativa Cookie 🍪</h2>
          <p className="text-sm text-muted-foreground">
            Questo sito utilizza solo cookie tecnici e analitici anonimi (es. Vercel Analytics)
            per migliorare le prestazioni e la sicurezza. 
            <br />
            Non utilizziamo cookie di profilazione o per finalità pubblicitarie.
          </p>
          <div className="flex justify-end">
            <Button onClick={accept}>OK</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
