import { useEffect, useRef, useState } from "react";

export type ProteinViewerMode = "cartoon" | "surface" | "both";

interface ProteinViewerProps {
  pdbId?: string;
  pdbUrl?: string;
  height?: number;
  mode?: ProteinViewerMode;
}

const BACKGROUND = "#080D0F";
const RIBBON = "#A8C979";
const SURFACE = "#D8D7CB";
const BORDER = "rgba(168, 201, 121, 0.16)";

// 3Dmol viewer interface (loaded from CDN via window.$3Dmol)
interface Viewer {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: object, style: object) => void;
  addSurface: (type: unknown, style: object) => unknown;
  removeAllSurfaces: () => void;
  zoomTo: () => void;
  zoom: (factor: number, time?: number) => void;
  spin: (axis: string, speed?: number) => void;
  render: () => void;
  clear: () => void;
  resize: () => void;
}

interface Mol3D {
  createViewer: (element: HTMLElement, config?: Record<string, unknown>) => Viewer;
  SurfaceType: { VDW: unknown };
}

declare global {
  interface Window {
    $3Dmol?: Mol3D;
  }
}

// Inject 3Dmol from CDN the first time; resolves when window.$3Dmol is ready.
function load3Dmol(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.$3Dmol) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="3Dmol-min.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("3Dmol CDN script failed")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://3Dmol.org/build/3Dmol-min.js";
    script.async = true;
    script.onload = () => {
      console.log("3Dmol script loaded");
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load 3Dmol from CDN"));
    document.head.appendChild(script);
  });
}

// Waits until host has nonzero layout dimensions (defers past the first paint).
function waitForSize(host: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    if (host.offsetWidth > 0 && host.offsetHeight > 0) {
      resolve();
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          ro.disconnect();
          resolve();
          return;
        }
      }
    });
    ro.observe(host);
  });
}

function applyMode(lib: Mol3D, viewer: Viewer, mode: ProteinViewerMode) {
  const showCartoon = mode === "cartoon" || mode === "both";
  const showSurface = mode === "surface" || mode === "both";
  viewer.removeAllSurfaces();
  viewer.setStyle(
    {},
    showCartoon ? { cartoon: { color: RIBBON, opacity: 1 } } : {},
  );
  if (showSurface) {
    viewer.addSurface(lib.SurfaceType.VDW, { opacity: 0.12, color: SURFACE });
  }
  viewer.render();
}

export default function ProteinViewer({
  pdbId = "1CRN",
  pdbUrl,
  height = 360,
  mode = "cartoon",
}: ProteinViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const libRef = useRef<Mol3D | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function init() {
      const host = hostRef.current;
      if (!host) return;

      setStatus("loading");
      setErrorMsg("");

      try {
        await waitForSize(host);
        if (cancelled) return;
        console.log(
          "Protein container dimensions",
          host.offsetWidth,
          host.offsetHeight,
        );

        await load3Dmol();
        if (cancelled) return;

        const lib = window.$3Dmol!;
        libRef.current = lib;

        const fetchUrl = pdbUrl
          ? pdbUrl
          : `https://files.rcsb.org/download/${pdbId}.pdb`;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Structure fetch failed: ${res.status}`);
        const pdbText = await res.text();
        const fmt = fetchUrl.endsWith(".cif") ? "cif" : "pdb";
        console.log("PDB fetched", pdbId, `(${pdbText.length} chars)`);

        if (cancelled || !hostRef.current) return;

        hostRef.current.innerHTML = "";
        const viewer = lib.createViewer(hostRef.current, {
          backgroundColor: BACKGROUND,
          backgroundAlpha: 0,
          antialias: true,
        });
        viewerRef.current = viewer;

        viewer.addModel(pdbText, fmt);
        console.log("Model added");

        viewer.setStyle({}, { cartoon: { color: RIBBON, opacity: 1 } });
        viewer.zoomTo();
        viewer.zoom(1.6);
        viewer.spin("y", 0.4);
        viewer.render();
        console.log("Viewer rendered");

        if (!cancelled) setStatus("ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("ProteinViewer error:", msg);
        if (!cancelled) {
          setErrorMsg(msg);
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.clear();
      } catch {
        /* ignore */
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdbId, pdbUrl]);

  // Re-apply representation on mode change once viewer is ready.
  useEffect(() => {
    const viewer = viewerRef.current;
    const lib = libRef.current;
    if (!viewer || !lib || status !== "ready") return;
    applyMode(lib, viewer, mode);
  }, [mode, status]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height }}
    >
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <span className="h-7 w-7 rounded-full border border-[rgba(168,201,121,0.35)] border-t-pz-accent animate-spin" />
          <span className="font-mono-pz text-[9.5px] tracking-[0.22em] uppercase text-pz-muted">
            {pdbUrl ? "Loading structure…" : `Rendering ${pdbId}`}
          </span>
        </div>
      )}

      {status === "error" && <Fallback pdbId={pdbId} detail={errorMsg} />}

      {status === "ready" && (
        <div className="absolute bottom-3 right-3 font-mono-pz text-[9px] tracking-wider text-pz-accent pz-blink pointer-events-none">
          ● LIVE
        </div>
      )}
    </div>
  );
}

function Fallback({ pdbId, detail }: { pdbId: string; detail: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <svg
        viewBox="0 0 120 120"
        className="h-24 w-24 opacity-80"
        aria-hidden="true"
      >
        <g fill="none" stroke={RIBBON} strokeWidth="1.2" strokeOpacity="0.55">
          <circle cx="60" cy="34" r="6" fill={RIBBON} fillOpacity="0.18" />
          <circle cx="34" cy="70" r="6" fill={RIBBON} fillOpacity="0.18" />
          <circle cx="86" cy="70" r="6" fill={RIBBON} fillOpacity="0.18" />
          <circle cx="60" cy="92" r="6" fill={RIBBON} fillOpacity="0.18" />
          <line x1="60" y1="34" x2="34" y2="70" />
          <line x1="60" y1="34" x2="86" y2="70" />
          <line x1="34" y1="70" x2="60" y2="92" />
          <line x1="86" y1="70" x2="60" y2="92" />
          <line x1="34" y1="70" x2="86" y2="70" />
        </g>
      </svg>
      <div className="flex flex-col gap-1">
        <span className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-soft">
          Structure Preview Unavailable
        </span>
        <span className="font-mono-pz text-[9px] tracking-[0.2em] uppercase text-pz-muted">
          {pdbId} · Offline Render
        </span>
        {detail && (
          <span className="mt-1 font-mono-pz text-[8px] tracking-[0.14em] text-pz-muted/70 max-w-[260px] break-words">
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
