import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/components/phasezero/pages/SettingsPage";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
