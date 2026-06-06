import { createFileRoute } from "@tanstack/react-router";
import SignalsPage from "@/components/phasezero/pages/SignalsPage";

export const Route = createFileRoute("/signals")({
  component: SignalsPage,
});
