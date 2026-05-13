"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  Cpu,
  Database,
  FileSearch,
  GitMerge,
  HelpCircle,
  Home,
  ListChecks,
  MessagesSquare,
  Network,
  PanelLeft,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
};

type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "개요",
    items: [
      { href: "/", label: "프로젝트 홈", icon: Home },
    ],
  },
  {
    title: "Knowledge Base",
    items: [
      { href: "/kb", label: "KB 개요", icon: Database },
      { href: "/kb/match", label: "통합 ID 매칭", icon: GitMerge, hint: "RFP 4-4 ①" },
      { href: "/kb/extract", label: "비정형 데이터 처리", icon: FileSearch, hint: "RFP 4-4 ②" },
      { href: "/kb/rules", label: "룰 엔진 연계", icon: Network, hint: "RFP 4-4 ③" },
      { href: "/accounts", label: "광고주 360", icon: Target },
    ],
  },
  {
    title: "Sales Agent",
    items: [
      { href: "/agent", label: "Agent 대시보드", icon: Sparkles },
      { href: "/agent/recommend", label: "추천 워크플로", icon: Cpu },
      { href: "/agent/messages", label: "메시지 초안", icon: MessagesSquare },
      { href: "/agent/actions", label: "다음 액션", icon: ListChecks },
    ],
  },
  {
    title: "거버넌스",
    items: [
      { href: "/admin/dq", label: "데이터 품질", icon: ShieldCheck },
      { href: "/admin/mdm", label: "MDM 리뷰 큐", icon: Users },
      { href: "/admin/audit", label: "감사 로그", icon: ScrollText },
    ],
  },
];

const STORAGE_KEY = "mobidays-demo:sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  // Default open on first paint to avoid layout flash on initial SSR render.
  // After mount we sync with localStorage.
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {
      // ignore (SSR/private mode)
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--color-muted)]/40 flex">
      <Sidebar collapsed={collapsed && mounted} onToggle={toggle} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar collapsed={collapsed && mounted} onToggle={toggle} />
        <main className="flex-1 min-w-0 px-6 lg:px-10 py-6 lg:py-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "shrink-0 bg-[color:var(--color-brand-ink)] text-white sticky top-0 h-screen overflow-hidden flex flex-col",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-0" : "w-64",
      )}
      aria-hidden={collapsed}
    >
      {/* Inner is fixed width so the slide-out animation doesn't reflow content. */}
      <div className="w-64 shrink-0 flex flex-col h-full overflow-y-auto scrollbar-thin">
        <div className="px-5 pt-6 pb-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-[color:var(--color-brand-lime)] flex items-center justify-center">
              <span className="text-[color:var(--color-brand-ink)] font-bold text-sm tracking-tighter">M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold tracking-tight leading-none">Mobidays AI</span>
              <span className="text-[10px] uppercase text-white/60 leading-none mt-1">Sales KB · Agent Demo</span>
            </div>
          </Link>
          <button
            onClick={onToggle}
            aria-label="사이드바 닫기"
            title="사이드바 닫기 (⌘B)"
            className="size-7 rounded-md text-white/55 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-5 flex-1">
          {NAV.map((section) => (
            <div key={section.title}>
              <div className="px-2 mb-1.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        tabIndex={collapsed ? -1 : 0}
                        className={cn(
                          "group flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition",
                          active
                            ? "bg-[color:var(--color-brand-lime)] text-[color:var(--color-brand-ink)]"
                            : "text-white/85 hover:bg-white/5",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </span>
                        {item.hint && (
                          <span
                            className={cn(
                              "text-[9px] font-semibold tracking-wide",
                              active ? "text-[color:var(--color-brand-ink)]/70" : "text-white/40",
                            )}
                          >
                            {item.hint}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 text-[11px] text-white/40 leading-relaxed border-t border-white/5">
          <div>RFP: 모비데이즈 AI/AX</div>
          <div>Build: 2026-05 / Demo PoC</div>
          <Link
            href="/admin"
            tabIndex={collapsed ? -1 : 0}
            className="inline-flex items-center gap-1 mt-2 text-white/55 hover:text-white"
          >
            <Settings2 className="size-3" /> Admin
          </Link>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  // Keyboard shortcut: ⌘B / Ctrl+B toggles sidebar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onToggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggle]);

  return (
    <header className="h-14 px-4 lg:px-6 border-b border-[color:var(--color-border)] bg-white flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          aria-label={collapsed ? "사이드바 열기" : "사이드바 닫기"}
          title={`사이드바 ${collapsed ? "열기" : "닫기"} (⌘B)`}
          className={cn(
            "size-8 rounded-md flex items-center justify-center transition",
            "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
          )}
        >
          <PanelLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">통합 데모 환경</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-muted-foreground)] bg-[color:var(--color-muted)] px-2 py-0.5 rounded-md">
          <span className="size-1.5 bg-[color:var(--color-success)] rounded-full" />
          SQLite · Mock LLM · 로컬 실행
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-xs text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <HelpCircle className="size-3.5" /> 가이드
        </Link>
        <div className="size-8 rounded-full bg-[color:var(--color-brand-ink)] text-white flex items-center justify-center text-xs font-medium">
          MS
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="px-6 lg:px-10 py-4 border-t border-[color:var(--color-border)] bg-white">
      <div className="flex items-center justify-between text-[11px] text-[color:var(--color-muted-foreground)]">
        <div>Mobidays AI Demo — 2026-05 · 본 데모는 PoC 시연용으로 실제 운영 시스템과 분리됩니다.</div>
        <div className="flex gap-3">
          <span>v0.1.0</span>
          <Link href="/admin/seed" className="hover:underline">데이터 리셋</Link>
        </div>
      </div>
    </footer>
  );
}
