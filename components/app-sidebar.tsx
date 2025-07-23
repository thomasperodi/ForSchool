"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  GraduationCap,
  Camera,
  ShoppingBag,
  MessageSquare,
  Vote,
  CreditCard,
  Home,
  Bell,
  LayoutDashboard
} from "lucide-react"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "./ui/dialog"
import Image from "next/image"
import { usePathname } from "next/navigation"

const navigationItems = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Eventi", url: "/eventi", icon: Calendar },
  { title: "Ripetizioni", url: "/ripetizioni", icon: GraduationCap },
  { title: "Foto di Classe", url: "/foto-di-classe", icon: Camera },
  { title: "Merchandising", url: "/merchandising", icon: ShoppingBag },
  { title: "Forum", url: "/forum", icon: MessageSquare },
  { title: "Assemblee", url: "/assemblee", icon: Vote },
  { title: "Pagamenti", url: "/pagamenti", icon: CreditCard },
  { title: "Notifiche", url: "/notifiche", icon: Bell },
]

export function AppSidebar() {
  const [user, setUser] = React.useState<{ name?: string; avatar_url?: string; classe?: string; email?: string } | null>(null);
  const [isOpen, setIsOpen] = React.useState(false)
  
  React.useEffect(() => {
    async function fetchUser() {
      const { supabase } = await import("@/lib/supabaseClient");
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const meta = data.user.user_metadata || {};
        setUser({
          name: meta.name || data.user.email,
          avatar_url: meta.avatar_url,
          classe: meta.classe || "",
          email: data.user.email,
        });
      }
    }
    fetchUser();
  }, []);

  const pathname = usePathname()
  React.useEffect(() => {
    // Quando cambia il pathname, chiudo la sidebar
    setIsOpen(false)
  }, [pathname])

  return (
    <div className="">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-50">
            {/* <Menu className="h-6 w-6" /> */}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {/* DialogTitle nascosto per accessibilità */}
          <DialogTitle className="sr-only">Menu sidebar</DialogTitle>
          {/* HEADER IN ALTO */}
          {/* LOGO E SOTTOTITOLO */}
          <div className="flex items-center gap-2 px-4 py-4 border-b">
            <div className="flex h-8 w-8 items-center justify-center">
              <Image src="/images/SkoollyLogo.png" alt="Logo Skoolly" width={32} height={32} />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="Skoolly text-xl">Skoolly</span>
              <span className="truncate text-xs text-muted-foreground">La tua scuola digitale</span>
            </div>
          </div>

          <SidebarMenu className="py-4">
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url} className="flex items-center gap-2 px-4 py-2 w-full">
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <div className="border-t p-4">
            <Link href="/profile" className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {user?.avatar_url ? (
                  <AvatarImage src={user.avatar_url} />
                ) : (
                  <AvatarFallback>{user?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                )}
              </Avatar>
              <div className="text-sm">
                <div className="font-semibold leading-tight">{user?.name || "Utente"}</div>
                <div className="text-xs text-muted-foreground">{user?.classe || ""}</div>
              </div>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
