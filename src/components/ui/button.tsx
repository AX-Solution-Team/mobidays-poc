import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "lime";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[color:var(--color-brand-ink)] text-white hover:bg-[color:var(--color-brand-ink-2)]",
  secondary:
    "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-border)]",
  ghost: "text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
  outline:
    "border border-[color:var(--color-border)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
  danger:
    "bg-[color:var(--color-danger)] text-white hover:opacity-90",
  lime:
    "bg-[color:var(--color-brand-lime)] text-[color:var(--color-brand-ink)] hover:brightness-95",
};

const SIZE: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
  lg: "h-11 px-5 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", size = "md", className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
          VARIANT[variant],
          SIZE[size],
          className,
        )}
        {...rest}
      />
    );
  },
);
