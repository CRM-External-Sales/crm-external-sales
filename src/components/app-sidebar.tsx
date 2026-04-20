"use client"

import * as React from "react"
import {
  Home,
  CircleUser,
  Map,
  Car,
  BookUser,
  CalendarPlus,
  ChartPie,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"

// Datos del CRM
const getNavData = (userName?: string, userEmail?: string) => ({
  user: {
    name: userName || "Usuario",
    email: userEmail || "",
    avatar: "",
  },
  teams: [
    {
      name: "CRM VENTA INTERNA Y EXTERNA",
      logo: Home,
      plan: "Río Perdido",
    },
  ],
  navMain: [
    {
      title: "Gestión de Usuarios",
      url: "#",
      icon: CircleUser,
      isActive: false,
      items: [
        {
          title: "Crear Usuario",
          url: "/usuarios/crear",
        },
        {
          title: "Listar Usuarios",
          url: "/usuarios",
        },
      ],
    },
    {
      title: "Gestión de Tours",
      url: "#",
      icon: Map,
      items: [
        {
          title: "Crear Tour",
          url: "/tours/crear",
        },
        {
          title: "Listar Tours",
          url: "/tours",
        },
      ],
    },
    {
      title: "Gestión de Transfers",
      url: "#",
      icon: Car,
      items: [
        {
          title: "Crear Transfer",
          url: "/transfers/crear",
        },
        {
          title: "Listar Transfers",
          url: "/transfers",
        },
      ],
    },
    {
      title: "Gestión de Proveedores",
      url: "#",
      icon: BookUser,
      items: [
        {
          title: "Crear Proveedor",
          url: "/proveedores/crear",
        },
        {
          title: "Listar Proveedores",
          url: "/proveedores",
        },
      ],
    },
    {
      title: "Gestión de Reservas",
      url: "#",
      icon: CalendarPlus,
      items: [
        {
          title: "Crear Reserva",
          url: "/reservas/crear",
        },
        {
          title: "Listar Reservas",
          url: "/reservas",
        },
      ],
    },
    {
      title: "Reportes",
      url: "/reportes",
      icon: ChartPie,
    },
  ],
})

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading } = useAuth()

  const navData = getNavData(
    user?.username,
    user?.email
  )

  return (
    <Sidebar 
      collapsible="icon" 
      {...props} 
      style={{
        "--sidebar": "#313833",
        "--sidebar-foreground": "#ffffff",
        "--sidebar-accent": "#1A1F1B",
        "--sidebar-accent-foreground": "#ffffff",
      } as React.CSSProperties}
      className="[&_[data-sidebar=sidebar]]:bg-[#313833] [&_[data-sidebar=sidebar]]:text-white [&_[data-sidebar=menu-button]]:text-white [&_[data-sidebar=menu-sub-button]]:text-white/80 [&_[data-sidebar=menu-button]:hover]:bg-[#1A1F1B] [&_[data-sidebar=menu-button]:hover]:text-white [&_[data-sidebar=menu-button][data-active=true]]:bg-[#1A1F1B] [&_[data-sidebar=menu-button][data-active=true]]:text-white [&_[data-sidebar=menu-sub-button]:hover]:bg-[#1A1F1B] [&_[data-sidebar=menu-sub-button]:hover]:text-white [&_[data-sidebar=menu-sub-button][data-active=true]]:bg-[#1A1F1B] [&_[data-sidebar=menu-sub-button][data-active=true]]:text-white"
    >
      <SidebarHeader>
        <TeamSwitcher teams={navData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {!loading && <NavUser user={navData.user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
