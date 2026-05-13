import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtKrw(n: number | bigint | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_0000_0000_0000) return `${(num / 1_0000_0000_0000).toFixed(1)}조`;
  if (num >= 1_0000_0000) return `${(num / 1_0000_0000).toFixed(1)}억`;
  if (num >= 1_0000) return `${(num / 1_0000).toFixed(0)}만`;
  return `${num.toLocaleString("ko-KR")}원`;
}

export function fmtPct(n: number, digits = 1) {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  if (!withTime) return `${y}-${m}-${day}`;
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function relTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - dt.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

export function freshnessLabel(d: Date | string | null | undefined): {
  label: string;
  tone: "fresh" | "ok" | "stale" | "old";
} {
  if (!d) return { label: "—", tone: "old" };
  const dt = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 14) return { label: `${Math.floor(diff)}일`, tone: "fresh" };
  if (diff < 30) return { label: `${Math.floor(diff)}일`, tone: "ok" };
  if (diff < 90) return { label: `${Math.floor(diff)}일`, tone: "stale" };
  return { label: `${Math.floor(diff)}일`, tone: "old" };
}

export function safeParseJson<T = unknown>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
