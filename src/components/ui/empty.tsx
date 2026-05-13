import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-10 rounded-lg border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-card)]",
        className,
      )}
    >
      {icon && <div className="mb-3 text-[color:var(--color-muted-foreground)]">{icon}</div>}
      <div className="font-semibold text-sm">{title}</div>
      {description && (
        <div className="mt-1.5 text-xs text-[color:var(--color-muted-foreground)] max-w-md">
          {description}
        </div>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
