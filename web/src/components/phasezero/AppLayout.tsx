import type { ReactNode } from "react";
import { Search } from "lucide-react";
import Sidebar from "./Sidebar";

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
    <div className="min-h-screen w-full bg-pz-bg text-pz-text flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar title={title} loading={loading} />
        <main className="flex-1 px-8 lg:px-12 pt-8 pb-12">{children}</main>
      </div>
    </div>
  );
}

function TopBar({ title, loading }: { title: string; loading: boolean }) {
  return (
    <div className="px-8 lg:px-12 pt-7 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full bg-pz-accent ${loading ? "pz-pulse" : ""}`}
        />
        <span className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-accent">
          {loading ? "Syncing Live Data" : title}
        </span>
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
