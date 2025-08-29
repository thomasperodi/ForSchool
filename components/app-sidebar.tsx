"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
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
  LayoutDashboard,
  Gem,
  Tag,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUtenteCompleto } from "@/lib/api"
import { supabase } from "@/lib/supabaseClient"
import {useRouter} from "next/navigation"
import { Capacitor } from "@capacitor/core"
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin"
import { useAuth } from "@/context/AuthContext"; // importa il tuo hook
import { useState } from "react"
import toast from "react-hot-toast"

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  highlight?: boolean
  onClick?: () => void
}






type PianoAbbonamento = {
  id: string
  nome: string
  // altri campi del piano se vuoi (prezzo, descrizione ecc)
}

type Abbonamento = {
  id: string
  utente_id: string
  piano_id: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stato: "active" | "expired" | "cancelled" | "paused"
  data_inizio?: string | null
  data_fine?: string | null
  sconto_applicato?: number | null
  ambassador_code?: string | null
  created_at?: string | null
  updated_at?: string | null
  piano: PianoAbbonamento
}

type UtenteCompleto = {
  nome?: string
  email?: string
  classe?: string | null
  abbonamento_attivo?: Abbonamento | null
}


export function AppSidebar() {
  const { state, toggleSidebar  } = useSidebar()
  const router = useRouter()
  const collapsed = state === "collapsed"
  const pathname = usePathname()
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const baseNavigationItems: NavigationItem[] = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Promozioni", href: "/promozioni", icon: Tag},
  { name: "Eventi", href: "/eventi", icon: Calendar },
  { name: "Merchandising", href: "/merchandising", icon: ShoppingBag },
  { name: "Ripetizioni", href: "/ripetizioni", icon: GraduationCap },
  // { name: "Foto di Classe", href: "/foto-di-classe", icon: Camera },
  // { name: "Blog", href: "/blog", icon: MessageSquare },
  { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
 {
      name: "Logout",
      href: "#",
      icon: LogOut,
      onClick: async () => {
  try {
    setLoading(true);
    console.log("[UI] Click logout");

    // ✅ Chiama logout già definito
    await logout();
    router.replace("/login"); // replace evita che /home rimanga nello storico

    // ✅ Solo dopo redirect
    console.log("[UI] Logout completato, redirect al login");
    // router.push("/login");
  } catch (err) {
    console.error("[UI] Errore durante il logout:", err);
    toast.error("Errore durante il logout");
  } finally {
    setLoading(false);
  }
}
    }


]
  const [user, setUser] = React.useState<{
    name?: string
    avatar_url?: string
    classe?: string | null
  email?: string
  abbonamentoData?: Abbonamento | null
} | null>(null)


 React.useEffect(() => {
  async function fetchUser() {
    const {
      data: { user: supaUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !supaUser) return

    const data = await getUtenteCompleto() as UtenteCompleto
    console.log("DEBUG: Dati utente recuperati:", data)
    
if (data) {
  const name = data.nome || data.email || "Utente"
  const avatar_url = supaUser.user_metadata?.avatar_url || null
  const classe = data.classe || null
  setUser({
    name,
    avatar_url,
    classe,
    email: data.email,
    abbonamentoData: data.abbonamento_attivo || null,
  })
}
  }
  fetchUser()
}, [])


  const isSubscribed =
    user?.abbonamentoData?.stato === "active"

  const navigationItems: NavigationItem[] = React.useMemo(() => {
    if (isSubscribed) {
      return baseNavigationItems
    } else {
      return [
        ...baseNavigationItems,
        { name: "Abbonati", href: "/abbonamenti", icon: Gem, highlight: true },
      ]
    }
  }, [isSubscribed])


  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r border-border pb-4">
        {/* LOGO HEADER */}
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <Image
                src="/images/SkoollyLogo.png"
                alt="Skoolly Logo"
                width={32}
                height={32}
                className="rounded-lg"
                loading="lazy"
              />
            </div>
            {!collapsed && <h1 className="Skoolly text-2xl">Skoolly</h1>}
          </motion.div>
        </div>

        {/* MENU */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
      {navigationItems.map((item, index) => {
        const isActive = pathname === item.href
        const highlight = item.highlight

        // Se l'item ha onClick, usa un bottone
        if (item.onClick) {
          return (
            <SidebarMenuItem key={item.name}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <SidebarMenuButton asChild>
                  <button
                    type="button"
                    onClick={() => {
      if (item.onClick) item.onClick()
      toggleSidebar()
    }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                      ${
                        isActive
                          ? highlight
                            ? "bg-yellow-100 text-yellow-700 shadow-md"
                            : "bg-primary text-primary-foreground shadow-md"
                          : highlight
                          ? "text-yellow-600 hover:bg-yellow-50 hover:text-yellow-800"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <item.icon
                      className={`w-5 h-5 ${
                        highlight
                          ? isActive
                            ? "text-yellow-700"
                            : "text-yellow-600"
                          : ""
                      }`}
                    />
                    {!collapsed && (
                      <span className={`font-medium ${highlight ? "font-semibold" : ""}`}>
                        {item.name}
                      </span>
                    )}
                  </button>
                </SidebarMenuButton>
              </motion.div>
            </SidebarMenuItem>
          )
        }

        // Altrimenti link normale
        return (
          <SidebarMenuItem key={item.name}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <SidebarMenuButton asChild>
                <Link
                  href={item.href}
                  onClick={() => {
      toggleSidebar()
    }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                    ${
                      isActive
                        ? highlight
                          ? "bg-yellow-100 text-yellow-700 shadow-md"
                          : "bg-primary text-primary-foreground shadow-md"
                        : highlight
                        ? "text-yellow-600 hover:bg-yellow-50 hover:text-yellow-800"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${
                      highlight
                        ? isActive
                          ? "text-yellow-700"
                          : "text-yellow-600"
                        : ""
                    }`}
                  />
                  {!collapsed && (
                    <span className={`font-medium ${highlight ? "font-semibold" : ""}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </motion.div>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* FOOTER UTENTE */}
        <div className="p-4 mt-auto border-t flex items-center gap-3">
          <Link
            href="/profilo"
            className="mt-auto flex items-center gap-3 hover:bg-muted transition-colors"
          >
            <Avatar className="h-8 w-8">
              {user?.avatar_url ? (
                <AvatarImage src={user.avatar_url} />
              ) : (
                <AvatarFallback>
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              )}
            </Avatar>

           {!collapsed && (
  <div className="text-sm">
    <div className="font-semibold leading-tight">
      {user?.name || "Utente"}
      <br />
      {user?.abbonamentoData?.piano.nome && (
        <p className="inline-flex items-center gap-1 mt-1 rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-semibold text-yellow-700 shadow-sm select-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-yellow-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.974a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.388 2.462a1 1 0 00-.364 1.118l1.287 3.973c.3.922-.755 1.688-1.54 1.118l-3.388-2.462a1 1 0 00-1.176 0l-3.388 2.462c-.784.57-1.838-.196-1.539-1.118l1.287-3.973a1 1 0 00-.364-1.118L2.045 9.4c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.974z" />
          </svg>
          {user.abbonamentoData.piano.nome}
        </p>
      )}
    </div>
    <div className="text-xs text-muted-foreground">{user?.classe || ""}</div>
  </div>
)}

          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
