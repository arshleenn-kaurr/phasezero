import {
  Crosshair,
  Briefcase,
  Microscope,
  BarChart3,
  CircleDashed,
  TrendingUp,
  BookText,
  Settings as SettingsIcon,
  ChevronDown,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import pzLogo from "@/assets/phasezero-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV = [
  { to: "/", label: "Briefing Room", icon: Crosshair },
  { to: "/opportunities", label: "Opportunities", icon: Briefcase },
  { to: "/evidence", label: "Evidence", icon: Microscope },
  { to: "/signals", label: "Signal Scan", icon: BarChart3 },
  { to: "/models", label: "Models", icon: CircleDashed },
  { to: "/simulation", label: "Simulation", icon: TrendingUp },
  { to: "/memos", label: "Memos", icon: BookText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActivePath = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-6">
        <Link to="/" className="block px-2">
          <img
            src={pzLogo}
            alt="PhaseZero"
            className="h-10 w-auto"
            style={{ filter: "invert(1) hue-rotate(180deg) brightness(1.6) saturate(1.1)" }}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const isActive = isActivePath(item.to);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.to} className="relative">
                        {isActive && (
                          <span className="absolute right-0 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-pz-accent" />
                        )}
                        <Icon
                          size={15}
                          className={isActive ? "text-pz-accent" : "text-pz-muted"}
                        />
                        <span className="text-[14px] font-light">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-5 py-5">
        <div className="flex flex-col gap-3">
          <div className="border pz-border rounded-sm px-3 py-2.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" />
            <div className="flex flex-col">
              <span className="text-[12px] text-pz-text">Research Terminal</span>
              <span className="font-mono-pz text-[9px] tracking-wider text-pz-accent">
                ONLINE
              </span>
            </div>
          </div>
          <button className="flex items-center gap-2.5 px-1 py-1 hover:bg-[color:var(--pz-panel-alt)] rounded-sm transition-colors">
            <span className="h-7 w-7 rounded-full bg-[color:var(--pz-panel-alt)] border pz-border flex items-center justify-center font-mono-pz text-[10px] text-pz-soft">
              JS
            </span>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[12px] text-pz-text truncate">Jane Smith, PhD</span>
              <span className="text-[10px] text-pz-muted truncate">Lead Quant Researcher</span>
            </div>
            <ChevronDown size={12} className="ml-auto text-pz-muted" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
