import { createFileRoute } from "@tanstack/react-router";
import CommandCenter from "@/components/phasezero/CommandCenter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhaseZero — Therapeutic Intelligence OS" },
      { name: "description", content: "AI-native scientific diligence cockpit for ADC opportunities. Find therapeutic alpha before consensus forms." },
      { property: "og:title", content: "PhaseZero — Therapeutic Intelligence OS" },
      { property: "og:description", content: "AI-native scientific diligence cockpit for ADC opportunities." },
    ],
  }),
  component: Index,
});

function Index() {
  return <CommandCenter />;
}
