"use client"
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { ConsentManagerTrigger } from "@/components/consent/ConsentManagerTrigger";
import useConsentAllowed from "@/components/consent/useConsentAllowed";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import SafeAreaClient from "./SafeAreaClient";
import Providers from "./Providers";

const AnalyticsWithConsent = () => {
  const ok = useConsentAllowed("analytics");
  if (!ok) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>

<Providers>


    <ConsentProvider>
      <SafeAreaClient />

      {/* Banner iniziale */}
      <CookieBanner />

      {/* Analytics solo se consentiti */}
      <AnalyticsWithConsent />

      {children}

      {/* Trigger per riaprire preferenze (es. in footer) */}

        <ConsentManagerTrigger />

    </ConsentProvider>
    </Providers>
    </>
  );
};

export default AppLayout;
