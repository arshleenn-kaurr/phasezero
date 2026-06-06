import { createFileRoute } from "@tanstack/react-router";
import OpportunitiesPage from "@/components/phasezero/pages/OpportunitiesPage";

export const Route = createFileRoute("/opportunities/")({
  component: OpportunitiesPage,
});
