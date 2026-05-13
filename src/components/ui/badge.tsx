import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "lime"
  | "ink"
  | "info"
  | "success"
  | "warning"
  | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)] border border-[color:var(--color-border)]",
  lime: "bg-[color:var(--color-brand-lime)] text-[color:var(--color-brand-ink)]",
  ink: "bg-[color:var(--color-brand-ink)] text-white",
  info: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info)]",
  success: "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]",
  warning: "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]",
  danger: "bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger)]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tracking-tight",
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
