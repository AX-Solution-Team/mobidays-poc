import * as React from "react";
import Link from "next/link";

interface BreadcrumbItem {
  href?: string;
  label: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)] mb-2">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {b.href ? (
                <Link href={b.href} className="hover:text-[color:var(--color-foreground)]">
                  {b.label}
                </Link>
              ) : (
                <span>{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span className="text-[color:var(--color-border)]">/</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] mb-1.5 font-medium">
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl lg:text-[26px] font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-[color:var(--color-muted-foreground)] max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
