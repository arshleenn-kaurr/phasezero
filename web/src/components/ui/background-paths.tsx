import { motion } from "framer-motion";

// Paths only — no hero text/button wrapper.
// Colour-tuned to pz-accent green, very low opacity so it's dimensional not distracting.
export function FloatingPaths({ position, opacityScale = 1 }: { position: number; opacityScale?: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${
      189 + i * 6
    } -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${
      343 - i * 6
    }C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${
      875 - i * 6
    } ${684 - i * 5 * position} ${875 - i * 6}`,
    opacity: Math.min((0.04 + i * 0.018) * opacityScale, 0.85),
    width: 0.4 + i * 0.025,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="#A8C979"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            initial={{ pathLength: 0.3, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [path.opacity * 0.5, path.opacity, path.opacity * 0.5],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 22 + (path.id % 7) * 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
              delay: path.id * 0.15,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// Full hero version (kept for completeness, not used in the app)
export function BackgroundPaths({ title = "Background Paths" }: { title?: string }) {
  const words = title.split(" ");
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-pz-bg">
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      <div className="relative z-10 text-center">
        <h1 className="font-serif-display text-[60px] text-pz-text">
          {words.map((w, wi) => (
            <span key={wi} className="inline-block mr-4">
              {w.split("").map((l, li) => (
                <motion.span
                  key={`${wi}-${li}`}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: wi * 0.1 + li * 0.03, type: "spring", stiffness: 150, damping: 25 }}
                  className="inline-block text-pz-text"
                >
                  {l}
                </motion.span>
              ))}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}
