'use client';

import { useConsent } from "./ConsentProvider";
import type { ConsentCategory } from "./ConsentProvider";

export default function useConsentAllowed(
  category: Exclude<ConsentCategory, "necessary"> | "necessary"
) {
  const { prefs } = useConsent();
  return !!(prefs && prefs[category]);
}
