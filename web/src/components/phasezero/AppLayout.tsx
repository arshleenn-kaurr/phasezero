import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./Sidebar";

export default function AppLayout({
  title,
  loading = false,
  children,
}: {
  title: string;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-pz-bg text-pz-text">
        <TopBar title={title} loading={loading} />
        <PageContent>{children}</PageContent>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PageContent({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 px-8 lg:px-12 pt-8 pb-12"
    >
      {children}
    </motion.main>
  );
}

function TopBar({ title, loading }: { title: string; loading: boolean }) {
  return (
    <div className="px-8 lg:px-12 pt-7 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-pz-muted hover:text-pz-text" />
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-pz-accent ${loading ? "pz-pulse" : ""}`}
          />
          <span className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-accent">
            {loading ? "Syncing Live Data" : title}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 min-w-[280px] max-w-[420px] w-full border-b pz-border pb-1.5">
        <Search size={13} className="text-pz-muted" />
        <input
          type="text"
          placeholder="Search targets, modalities, or data…"
          className="bg-transparent text-[12.5px] text-pz-soft placeholder:text-pz-muted outline-none w-full font-light"
        />
      </div>
    </div>
  );
}
