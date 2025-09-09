"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import NavbarAuth from "@/components/NavbarAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { useSession } from "@supabase/auth-helpers-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter();
  const pathname = usePathname();
  const [toastShown, setToastShown] = useState(false); // traccia se il toast è già apparso
  const [token, setToken] = useState<string | null>(null);
  const session = useSession();
  
  const getTitleFromPath = (path: string | null) => {
  if (!path) return "";
  
  const firstSegment = path.split("/")[1]; // prende la prima parola dopo "/"
  if (!firstSegment) return "";

  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
};




  return (
    <SidebarProvider>
    <div className="min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#f1f5f9] to-[#34d399] px-0 ">
      <div className="hidden md:block">
        <NavbarAuth />
      </div>
      <div className="block md:hidden ">
        <AppSidebar />
        <MobileHeader title={getTitleFromPath(pathname)} />
      </div>
      <main className="max-w-7xl mx-auto py-12 px-4 main-content-safe">{children}</main>
    </div>
    </SidebarProvider>
  );
}
