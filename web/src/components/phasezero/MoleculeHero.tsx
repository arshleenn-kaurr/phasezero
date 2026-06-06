import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Spotlight } from "@/components/ui/spotlight";
import pzLogo from "@/assets/phasezero-logo.png";

const ACCENT = "#A8C979";
const BG = "#080D0F";

interface Viewer {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: object, style: object) => void;
  zoomTo: () => void;
  zoom: (factor: number, time?: number) => void;
  spin: (axis: string, speed?: number) => void;
  render: () => void;
  clear: () => void;
}
interface Mol3D {
  createViewer: (el: HTMLElement, config?: Record<string, unknown>) => Viewer;
}

function load3Dmol(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.$3Dmol) { resolve(); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[src*="3Dmol-min.js"]');
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.src = "https://3Dmol.org/build/3Dmol-min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("3Dmol CDN failed"));
    document.head.appendChild(script);
  });
}

const RINGS = [
  { size: 220, duration: 8,  cls: "pz-orbit",       opacity: 0.25 },
  { size: 340, duration: 13, cls: "pz-orbit-med",    opacity: 0.15 },
  { size: 460, duration: 19, cls: "pz-orbit-outer",  opacity: 0.08 },
];

export default function MoleculeHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const heroY       = useTransform(scrollYProgress, [0, 0.65], [0, -80]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!hostRef.current) return;
      try {
        await load3Dmol();
        if (cancelled) return;

        const lib = window.$3Dmol!;
        // 4ETQ = trastuzumab Fab bound to HER2 domain II — the antibody in Kadcyla (ADC)
        const res = await fetch("https://files.rcsb.org/download/4ETQ.pdb");
        if (!res.ok) throw new Error("PDB fetch failed");
        const pdbText = await res.text();
        if (cancelled || !hostRef.current) return;

        hostRef.current.innerHTML = "";
        const viewer = lib.createViewer(hostRef.current, {
          backgroundColor: BG,
          backgroundAlpha: 0,
          antialias: true,
        });
        viewerRef.current = viewer;

        viewer.addModel(pdbText, "pdb");
        // Dark base gives overall protein volume — dim so the lit nodes pop
        viewer.setStyle({}, { sphere: { color: "#0E1E10", radius: 1.25, opacity: 0.55 } });
        // Alpha-carbons (one per residue) → bright accent nodes, the "lit up" look
        viewer.setStyle({ atom: "CA" }, { sphere: { color: ACCENT, radius: 1.55, opacity: 1.0 } });
        // Hetflag (drug ligand) → near-white hot glow, distinct from the antibody
        viewer.setStyle({ hetflag: true }, { sphere: { color: "#D8F0B8", radius: 1.35, opacity: 1.0 } });
        viewer.zoomTo();
        viewer.zoom(0.85);
        viewer.spin("y", 0.22);
        viewer.render();

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    init();
    return () => {
      cancelled = true;
      try { viewerRef.current?.clear(); } catch { /* ignore */ }
      viewerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-pz-bg"
      style={{ minHeight: "100svh" }}
    >
      {/* Spotlight beam — upper left */}
      <Spotlight
        className="-top-40 left-0 md:left-20 md:-top-10"
        fill={ACCENT}
      />

      {/* Radial glow behind molecule */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 72% 52%, rgba(168,201,121,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Content fades + lifts as user scrolls past */}
      <motion.div
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 flex h-full flex-col"
      >
        {/* Top nav row */}
        <div className="flex items-center justify-between px-8 lg:px-14 pt-7 shrink-0">
          <img
            src={pzLogo}
            alt="PhaseZero"
            className="h-6 w-auto"
            style={{ filter: "invert(1) hue-rotate(180deg) brightness(1.6) saturate(1.1)" }}
          />
          <Link
            to="/opportunities"
            className="font-mono-pz text-[9px] tracking-[0.22em] uppercase text-pz-muted hover:text-pz-accent transition-colors"
          >
            All Opportunities →
          </Link>
        </div>

        {/* Hero grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center px-8 lg:px-14">
          {/* Left: copy */}
          <div className="flex flex-col justify-center py-12 lg:py-0">
            <div className="font-mono-pz text-[9.5px] tracking-[0.34em] uppercase text-pz-accent mb-5">
              ADC Target Intelligence
            </div>
            <h1 className="font-serif-display text-[50px] md:text-[68px] leading-[0.9] text-pz-text">
              Plausible targets,
              <br />
              <em className="italic text-pz-accent font-normal">before consensus forms.</em>
            </h1>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-pz-soft font-light">
              Eight autonomous agents monitor biomedical literature, clinical trials,
              and commercial signals — surfacing ADC drug targets ranked by therapeutic alpha.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/opportunities/$id"
                params={{ id: "tf-adc" }}
                className="flex items-center gap-2.5 rounded-sm bg-pz-accent px-6 py-3 font-mono-pz text-[10px] tracking-[0.2em] uppercase text-[#080D0F] hover:bg-pz-accent/85 transition-colors"
              >
                Top Target <ArrowRight size={11} />
              </Link>
              <Link
                to="/signals"
                className="font-mono-pz text-[10px] tracking-[0.2em] uppercase text-pz-muted hover:text-pz-soft transition-colors"
              >
                Signal Feed
              </Link>
            </div>

            {/* Mini stats */}
            <div className="mt-10 flex items-center gap-8 border-t pz-border pt-6">
              {[
                { val: "128", label: "signals" },
                { val: "8", label: "agents" },
                { val: "4", label: "targets" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-serif-display text-[24px] leading-none text-pz-text">{s.val}</div>
                  <div className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 3D molecule */}
          <div className="relative h-[50vh] lg:h-[72vh] flex items-center justify-center">
            {/* Orbital rings */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ perspective: "700px" }}
            >
              {RINGS.map((r, i) => (
                <div
                  key={i}
                  className={r.cls}
                  style={{
                    position: "absolute",
                    width:  r.size,
                    height: r.size,
                    borderRadius: "50%",
                    border: `1px solid rgba(168, 201, 121, ${r.opacity})`,
                    boxShadow: `0 0 ${8 + i * 4}px rgba(168, 201, 121, ${r.opacity * 0.5})`,
                    transform: "rotateX(80deg)",
                  }}
                />
              ))}
            </div>

            {/* 3dmol viewer — pointer-events disabled so zoom/drag are impossible;
                programmatic spin() runs via rAF and is unaffected */}
            <div
              ref={hostRef}
              className="absolute inset-0 pz-float"
              style={{ zIndex: 1, pointerEvents: "none" }}
            />

            {/* Loading state */}
            {status === "loading" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <span className="h-8 w-8 rounded-full border border-pz-accent/25 border-t-pz-accent animate-spin" />
                <span className="font-mono-pz text-[9.5px] tracking-[0.22em] uppercase text-pz-muted">
                  Rendering 4ETQ · Trastuzumab–HER2
                </span>
              </div>
            )}

            {/* Live badge */}
            {status === "ready" && (
              <div className="absolute top-4 right-0 z-20 flex items-center gap-1.5 pointer-events-none">
                <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" />
                <span className="font-mono-pz text-[9px] tracking-wider text-pz-accent">
                  4ETQ · TRASTUZUMAB–HER2
                </span>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <span className="font-mono-pz text-[10px] tracking-[0.18em] uppercase text-pz-muted">
                  Structure unavailable offline
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="shrink-0 flex flex-col items-center gap-2 pb-8">
          <span className="font-mono-pz text-[9px] tracking-[0.24em] uppercase text-pz-muted">
            Scroll to explore targets
          </span>
          <ChevronDown size={14} className="text-pz-muted animate-bounce" />
        </div>
      </motion.div>
    </div>
  );
}
