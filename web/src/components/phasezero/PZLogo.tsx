function PZMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.9)}
      viewBox="0 0 48 44"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 40 L5 6" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M5 6 L26 6" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M26 6 L16 23" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M16 23 L5 23" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M14 13 L43 13" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M43 13 L14 40" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M14 40 L43 40" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
    </svg>
  );
}

export default function PZLogo({
  scale = 1,
  showSub = true,
}: {
  scale?: number;
  showSub?: boolean;
}) {
  const markSize = Math.round(36 * scale);
  const nameSize = Math.round(16 * scale);
  const subSize  = Math.round(8.5 * scale);
  const divH     = Math.round(30 * scale);
  const gap      = Math.round(12 * scale);

  return (
    <div className="flex items-center" style={{ gap }}>
      <div className="text-pz-accent">
        <PZMark size={markSize} />
      </div>
      <div className="bg-pz-muted/30 shrink-0" style={{ width: 1, height: divH }} />
      <div className="flex flex-col justify-center">
        <div
          className="font-mono-pz leading-none"
          style={{ fontSize: nameSize, letterSpacing: "0.3em" }}
        >
          <span className="text-pz-text font-medium">PHASE</span>
          <span className="text-pz-accent font-medium">ZERO</span>
        </div>
        {showSub && (
          <div
            className="font-mono-pz text-pz-muted leading-none mt-[3px]"
            style={{ fontSize: subSize, letterSpacing: "0.28em" }}
          >
            SCIENTIFIC INTELLIGENCE
          </div>
        )}
      </div>
    </div>
  );
}
