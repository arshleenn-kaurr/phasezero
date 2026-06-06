import { createFileRoute } from "@tanstack/react-router";
import MemosPage from "@/components/phasezero/pages/MemosPage";

export const Route = createFileRoute("/memos")({
  component: MemosPage,
});
