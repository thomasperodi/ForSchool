'use client';

import { useConsent } from "./ConsentProvider";

// Definiamo manualmente le categorie consentite
type ConsentCategory = "necessary" | "analytics";

export default function useConsentAllowed(category: ConsentCategory): boolean | null {
  const { prefs } = useConsent();

  // Se prefs non è ancora caricato, ritorna null
  if (!prefs) return null;

  // TypeScript sa che category è una chiave di prefs
  return prefs[category];
}
