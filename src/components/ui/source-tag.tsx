import * as React from "react";
import { cn } from "@/lib/utils";

// Visual chip indicating a data source (Salesforce, Sheet, Drive, Gmail, etc.)
const SOURCE_STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  Salesforce: { label: "SFDC", bg: "bg-[#e8f3ff]", fg: "text-[#0070d2]" },
  "Sheet:prospects-v3": { label: "Sheet", bg: "bg-[#e8f5e9]", fg: "text-[#0f7b3f]" },
  Sheet: { label: "Sheet", bg: "bg-[#e8f5e9]", fg: "text-[#0f7b3f]" },
  GoogleDrive: { label: "Drive", bg: "bg-[#fff4d6]", fg: "text-[#8a6300]" },
  Drive: { label: "Drive", bg: "bg-[#fff4d6]", fg: "text-[#8a6300]" },
  Gmail: { label: "Gmail", bg: "bg-[#fee8e7]", fg: "text-[#c5221f]" },
  GmailExport: { label: "Gmail", bg: "bg-[#fee8e7]", fg: "text-[#c5221f]" },
  DART: { label: "DART", bg: "bg-[#ede8ff]", fg: "text-[#6232ad]" },
  Manual: { label: "Manual", bg: "bg-[#f4f5f9]", fg: "text-[#374151]" },
};

export function SourceTag({
  system,
  className,
  size = "xs",
}: {
  system: string;
  className?: string;
  size?: "xs" | "sm";
}) {
  const cfg = SOURCE_STYLES[system] ?? { label: system, bg: "bg-[color:var(--color-muted)]", fg: "text-[color:var(--color-muted-foreground)]" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium tracking-tight",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        cfg.bg,
        cfg.fg,
        className,
      )}
      title={system}
    >
      {cfg.label}
    </span>
  );
}
