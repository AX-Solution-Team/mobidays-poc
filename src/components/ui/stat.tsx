import * as React from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: "up" | "down" | "flat";
  className?: string;
}

export function Stat({ label, value, hint, trend, className }: StatProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4",
        className,
      )}
    >
      <div className="text-xs text-[color:var(--color-muted-foreground)] font-medium tracking-tight">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)] flex items-center gap-1">
          {trend === "up" && <span className="text-[color:var(--color-success)]">▲</span>}
          {trend === "down" && <span className="text-[color:var(--color-danger)]">▼</span>}
          {trend === "flat" && <span className="text-[color:var(--color-muted-foreground)]">—</span>}
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}
