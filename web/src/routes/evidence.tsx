import { createFileRoute } from "@tanstack/react-router";
import EvidencePage from "@/components/phasezero/pages/EvidencePage";

export const Route = createFileRoute("/evidence")({
  component: EvidencePage,
});
