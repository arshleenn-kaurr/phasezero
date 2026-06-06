import { createFileRoute } from "@tanstack/react-router";
import OpportunityDetailPage from "@/components/phasezero/pages/OpportunityDetailPage";

export const Route = createFileRoute("/opportunities/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <OpportunityDetailPage id={id} />;
}
