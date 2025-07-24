"use client"

import { BarChart3, Package, ShoppingCart, TrendingUp, Users, Settings, Home } from "lucide-react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navigation = [
  {
    title: "Dashboard",
    items: [
      { title: "Panoramica", url: "#overview", icon: Home, isActive: true },
      { title: "Analytics", url: "#analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Gestione",
    items: [
      { title: "Prodotti", url: "#products", icon: Package },
      { title: "Ordini", url: "#orders", icon: ShoppingCart },
      { title: "Clienti", url: "#customers", icon: Users },
    ],
  },
  {
    title: "Business",
    items: [
      { title: "Guadagni", url: "#revenue", icon: TrendingUp },
      { title: "Impostazioni", url: "#settings", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2 md:px-4">
          <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-3 w-3 md:h-4 md:w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-semibold">MerchAdmin</span>
            <span className="text-xs text-muted-foreground hidden md:block">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive} className="h-10 md:h-8">
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4 md:h-4 md:w-4" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
