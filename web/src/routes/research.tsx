import { createFileRoute } from "@tanstack/react-router";
import ResearchPage from "@/components/phasezero/pages/ResearchPage";

export const Route = createFileRoute("/research")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: String(search.q ?? ""),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { q } = Route.useSearch();
  return <ResearchPage query={q} />;
}
