import AppLayout from "../AppLayout";
import { PageHeader, Panel, SectionLabel } from "../primitives";

const ASSUMPTION_NOTES = [
  "Expert assumptions default to 50/100 (neutral) across all biology, clinical, regulatory, and commercial dimensions.",
  "Strategic fit and risk tolerance are seeded per-candidate from the diligence profile.",
  "All models run deterministically and fully offline — no live network calls during scoring.",
];

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        subtitle="PhaseZero runtime configuration and assumption defaults."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <SectionLabel>Engine</SectionLabel>
          <dl className="mt-4 flex flex-col gap-3 text-[12.5px]">
            <Row k="API Base" v="http://localhost:8000" />
            <Row k="Scoring Mode" v="Deterministic / Offline" />
            <Row k="BioNeMo Layer" v="Mocked (API-ready)" />
            <Row k="Live Connectors" v="Disabled (demo)" />
          </dl>
        </Panel>
        <Panel>
          <SectionLabel>Assumption Defaults</SectionLabel>
          <ul className="mt-4 flex flex-col gap-2.5">
            {ASSUMPTION_NOTES.map((note) => (
              <li key={note} className="flex gap-2 text-[12.5px] leading-snug text-pz-soft font-light">
                <span className="text-pz-accent text-[8px] pt-1.5">●</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppLayout>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b pz-border pb-2.5">
      <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted">{k}</span>
      <span className="text-pz-soft font-light">{v}</span>
    </div>
  );
}
