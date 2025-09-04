// components/AppLayout.tsx
'use client';

import SafeAreaClient from "@/components/SafeAreaClient";
import Providers from "../components/Providers";

const AppLayout = ({ children }: { children: React.ReactNode }) => {


  return (
    <Providers>
      <SafeAreaClient />
      {children}
    </Providers>
  );
};

export default AppLayout;