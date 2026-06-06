import type { ReactNode } from "react";

// Minimal markdown renderer tuned for the diligence memo (headings, lists,
// tables, bold, horizontal rules). Not a general-purpose parser.
export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let table: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={key++} className="my-2 flex flex-col gap-1.5 pl-1">
        {list.map((item, i) => (
          <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-pz-soft">
            <span className="text-pz-accent text-[8px] pt-1.5">●</span>
            <span>{inline(item)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  const flushTable = () => {
    if (!table.length) return;
    const rows = table
      .filter((r) => !/^\|[\s:|-]+\|?$/.test(r))
      .map((r) => r.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length));
    const [head, ...body] = rows;
    blocks.push(
      <div key={key++} className="my-3 overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          {head && (
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th
                    key={i}
                    className="border-b pz-border py-1.5 pr-4 text-left font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted font-normal"
                  >
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>
                {row.map((c, ci) => (
                  <td key={ci} className="border-b pz-border/50 py-1.5 pr-4 text-pz-soft font-light">
                    {inline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    table = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("|")) {
      flushList();
      table.push(line);
      continue;
    }
    flushTable();

    if (!line.trim()) {
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={key++} className="mt-4 mb-1.5 font-mono-pz text-[10px] tracking-[0.2em] uppercase text-pz-accent">
          {inline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={key++} className="mt-5 mb-2 font-serif-display text-[20px] text-pz-text">
          {inline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={key++} className="mt-2 mb-2 font-serif-display text-[26px] text-pz-text">
          {inline(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith("---")) {
      flushList();
      blocks.push(<hr key={key++} className="my-4 border-0 border-t pz-border" />);
    } else if (/^(\s*[-*]\s+|\s*\d+\.\s+)/.test(line)) {
      list.push(line.replace(/^(\s*[-*]\s+|\s*\d+\.\s+)/, ""));
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="my-2 text-[12.5px] leading-relaxed text-pz-soft font-light">
          {inline(line)}
        </p>,
      );
    }
  }
  flushList();
  flushTable();

  return <div className="max-w-3xl">{blocks}</div>;
}

// Renders **bold** and *italic* inside a line.
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-pz-text font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
