import { createFileRoute } from "@tanstack/react-router";
import SimulationPage from "@/components/phasezero/pages/SimulationPage";

export const Route = createFileRoute("/simulation")({
  component: SimulationPage,
});
