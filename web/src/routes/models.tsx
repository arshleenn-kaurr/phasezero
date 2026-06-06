import { createFileRoute } from "@tanstack/react-router";
import ModelsPage from "@/components/phasezero/pages/ModelsPage";

export const Route = createFileRoute("/models")({
  component: ModelsPage,
});
