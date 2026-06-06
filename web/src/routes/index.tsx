import { createFileRoute } from "@tanstack/react-router";
import SearchHome from "@/components/phasezero/SearchHome";
import AppSidebar from "@/components/phasezero/Sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhaseZero — Therapeutic Intelligence OS" },
      {
        name: "description",
        content:
          "AI-native scientific diligence cockpit for ADC opportunities. Find therapeutic alpha before consensus forms.",
      },
      { property: "og:title", content: "PhaseZero — Therapeutic Intelligence OS" },
      {
        property: "og:description",
        content: "AI-native scientific diligence cockpit for ADC opportunities.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="bg-pz-bg text-pz-text">
        <SearchHome />
      </SidebarInset>
    </SidebarProvider>
  );
}
