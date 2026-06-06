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

export default function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActivePath = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <aside className="hidden lg:flex w-[230px] shrink-0 flex-col justify-between border-r pz-border bg-pz-bg px-5 py-7">
      <div>
        <div className="flex items-center gap-2 px-2">
          <span
            className="font-serif-display text-[15px] text-pz-text"
            style={{ letterSpacing: "0.28em" }}
          >
            PHASEZER
          </span>
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-[color:var(--pz-accent)]" />
        </div>

        <nav className="mt-10 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const isActive = isActivePath(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3 rounded-sm py-2.5 pl-3 pr-2 text-left transition-colors ${
                  isActive
                    ? "text-pz-text bg-[color:var(--pz-panel-alt)]"
                    : "text-pz-muted hover:text-pz-soft"
                }`}
              >
                {isActive && (
                  <span className="absolute right-0 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-pz-accent" />
                )}
                <Icon size={14} className={isActive ? "text-pz-accent" : "text-pz-muted"} />
                <span className="text-[13px] font-light">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <div className="border pz-border rounded-sm px-3 py-2.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" />
          <div className="flex flex-col">
            <span className="text-[12px] text-pz-text">Research Terminal</span>
            <span className="font-mono-pz text-[9px] tracking-wider text-pz-accent">ONLINE</span>
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
    </aside>
  );
}