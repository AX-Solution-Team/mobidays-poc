"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  GitBranch,
  Loader2,
  PlayCircle,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, fmtKrw } from "@/lib/utils";

interface RuleRow {
  id: string;
  name: string;
  description?: string | null;
  yaml: string;
  status: string;
  version: number;
}

interface AccountRow {
  cmid: string;
  canonicalName: string;
  industryLabel: string | null;
  customerTier: string | null;
  marketingBudgetKrw: number | null;
  annualRevenueKrw: number | null;
  relationshipScore: number | null;
  leadStage: string | null;
}

interface ExecResult {
  executionId: string;
  ruleId: string;
  ruleVersion: number;
  cmid: string;
  inputs: Record<string, unknown>;
  decision: Record<string, unknown> | null;
  trail: { if?: string; else?: boolean; matched: boolean; then?: Record<string, unknown> }[];
  outputs: { target?: string; before?: unknown; after?: unknown; applied: boolean; reason?: string }[];
  status: string;
  error?: string;
  latencyMs: number;
}

interface SimResult {
  total: number;
  distribution: Record<string, number>;
  changes: { cmid: string; name: string; from: string | null; to: unknown }[];
  sample: { cmid: string; canonicalName: string; industry: string | null; currentTier: string | null; decision: unknown; latencyMs: number }[];
}

export function RuleStudio({
  rules,
  accounts,
}: {
  rules: RuleRow[];
  accounts: AccountRow[];
}) {
  const [selectedRuleId, setSelectedRuleId] = useState(rules[0]?.id ?? "");
  const selectedRule = useMemo(
    () => rules.find((r) => r.id === selectedRuleId),
    [rules, selectedRuleId],
  );
  const [yaml, setYaml] = useState(selectedRule?.yaml ?? "");
  const [cmid, setCmid] = useState(accounts[0]?.cmid ?? "");

  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState<ExecResult | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);

  const onPickRule = (id: string) => {
    setSelectedRuleId(id);
    const r = rules.find((x) => x.id === id);
    if (r) setYaml(r.yaml);
    setExecResult(null);
    setSimResult(null);
  };

  const onExecute = async () => {
    setExecLoading(true);
    setExecError(null);
    setExecResult(null);
    try {
      const res = await fetch("/api/rules/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ yaml, cmid, dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "실행 실패");
      setExecResult(json);
    } catch (e: unknown) {
      setExecError(e instanceof Error ? e.message : "오류");
    } finally {
      setExecLoading(false);
    }
  };

  const onSimulate = async () => {
    setSimLoading(true);
    try {
      const res = await fetch("/api/rules/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ yaml, limit: 22 }),
      });
      const json = await res.json();
      if (res.ok) setSimResult(json);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* LEFT — Rule picker + YAML editor */}
      <div className="xl:col-span-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>활성 룰 정의</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {rules.map((r) => (
              <button
                key={r.id}
                onClick={() => onPickRule(r.id)}
                className={cn(
                  "w-full text-left rounded-md border border-[color:var(--color-border)] px-3 py-2.5 hover:border-[color:var(--color-brand-ink)] transition",
                  selectedRuleId === r.id &&
                    "border-[color:var(--color-brand-ink)] bg-[color:var(--color-brand-lime-bg)]/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge tone={r.status === "active" ? "success" : "neutral"}>{r.status} · v{r.version}</Badge>
                </div>
                {r.description && (
                  <div className="text-[11px] text-[color:var(--color-muted-foreground)] mt-0.5">
                    {r.description}
                  </div>
                )}
              </button>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>YAML 정의 (편집 가능)</span>
              <Button size="sm" variant="ghost" onClick={() => selectedRule && setYaml(selectedRule.yaml)}>
                되돌리기
              </Button>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              rows={24}
              className="w-full font-mono text-[12px] leading-relaxed bg-[color:var(--color-muted)] rounded-md p-3 border border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 scrollbar-thin"
              spellCheck={false}
            />
          </CardBody>
        </Card>
      </div>

      {/* RIGHT — Single execution + simulation */}
      <div className="xl:col-span-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="size-4" /> 단건 실행 (dry-run)
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <select
                value={cmid}
                onChange={(e) => setCmid(e.target.value)}
                className="col-span-2 h-9 px-3 border rounded-md border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 text-sm bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.cmid} value={a.cmid}>
                    {a.canonicalName} · 현재 Tier {a.customerTier ?? "—"}
                  </option>
                ))}
              </select>
              <Button onClick={onExecute} disabled={execLoading}>
                {execLoading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                실행
              </Button>
            </div>

            {execError && (
              <div className="text-xs text-[color:var(--color-danger)] bg-[color:var(--color-danger-bg)] px-3 py-2 rounded-md">
                {execError}
              </div>
            )}

            {execResult && <ExecResultView result={execResult} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="size-4" /> 시뮬레이션 — 전체 광고주 영향
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[color:var(--color-muted-foreground)]">
                YAML 변경 시, 이 룰을 전체 광고주에 dry-run하여 어떤 변화가 생길지 미리 계산합니다.
              </div>
              <Button onClick={onSimulate} disabled={simLoading} variant="outline">
                {simLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                시뮬레이션
              </Button>
            </div>

            {simResult && <SimResultView result={simResult} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>아키텍처 (룰 ↔ KB)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-xs leading-relaxed space-y-2 text-[color:var(--color-foreground)]/85">
              <div className="flex gap-2 items-start">
                <Badge tone="ink">①</Badge>
                <div><b>YAML 정의</b>를 zod로 검증하고 PR 기반 4-eyes 승인 후 활성화. 이 데모에선 단일 사용자가 즉시 편집.</div>
              </div>
              <div className="flex gap-2 items-start">
                <Badge tone="ink">②</Badge>
                <div><b>Input Resolver</b>가 KB Access Layer를 통해 데이터를 읽음. 화이트리스트된 `source` 경로 + 사전 정의된 `expr` selector만 허용.</div>
              </div>
              <div className="flex gap-2 items-start">
                <Badge tone="ink">③</Badge>
                <div><b>안전한 AST 평가기</b>로 결정 테이블 평가. <code className="bg-[color:var(--color-muted)] px-1 rounded">eval()</code> 금지, 화이트리스트 연산자만.</div>
              </div>
              <div className="flex gap-2 items-start">
                <Badge tone="ink">④</Badge>
                <div><b>Output Dispatcher</b>가 KB 컬럼에 쓰기. `requires_approval` 설정 시 HITL 큐로 보냄.</div>
              </div>
              <div className="flex gap-2 items-start">
                <Badge tone="ink">⑤</Badge>
                <div><b>실행 로그</b>가 `rule_executions`에 inputs · decision · outputs 스냅샷과 함께 영속화. 재현 가능.</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ExecResultView({ result }: { result: ExecResult }) {
  const isOk = result.status === "ok";
  const decisionEntries = result.decision
    ? Object.entries(result.decision)
    : [];

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-md px-3 py-2 flex items-center gap-3",
          isOk
            ? "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]"
            : "bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger)]",
        )}
      >
        {isOk ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
        <div className="flex-1">
          <div className="font-semibold text-sm">
            {isOk ? "실행 성공" : "실행 실패"} · {result.latencyMs}ms
          </div>
          {result.error && (
            <div className="text-xs mt-0.5 opacity-90">{result.error}</div>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider opacity-80 font-medium">
          {result.executionId.slice(-6)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-md border border-[color:var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-1.5 flex items-center gap-1">
            <Database className="size-3" /> Inputs (KB Access Layer 조회 결과)
          </div>
          <div className="space-y-1 text-xs">
            {Object.entries(result.inputs).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-[color:var(--color-muted-foreground)] font-mono">{k}</span>
                <span className="font-mono tabular-nums">
                  {formatInputValue(k, v)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[color:var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-1.5 flex items-center gap-1">
            <Sparkles className="size-3" /> Decision
          </div>
          {decisionEntries.length === 0 ? (
            <div className="text-xs text-[color:var(--color-muted-foreground)]">
              (없음 — 매칭되는 룰 없음)
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              {decisionEntries.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-[color:var(--color-muted-foreground)] font-mono">{k}</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-[color:var(--color-border)] p-3">
        <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-1.5 flex items-center gap-1">
          <GitBranch className="size-3" /> Decision Path
        </div>
        <ol className="space-y-1">
          {result.trail.map((t, i) => (
            <li
              key={i}
              className={cn(
                "text-xs flex items-start gap-2 rounded px-2 py-1",
                t.matched && "bg-[color:var(--color-brand-lime-bg)]/50 font-medium",
              )}
            >
              <span className="text-[color:var(--color-muted-foreground)] tabular-nums w-5">{i + 1}.</span>
              <span className="font-mono text-[11px] flex-1 break-words">
                {t.else ? "else (default)" : t.if}
              </span>
              {t.matched && (
                <Badge tone="lime">matched</Badge>
              )}
            </li>
          ))}
        </ol>
      </div>

      {result.outputs.length > 0 && (
        <div className="rounded-md border border-[color:var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-1.5">
            Outputs
          </div>
          <div className="space-y-1.5">
            {result.outputs.map((o, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Badge tone={o.applied ? "success" : "neutral"}>
                  {o.applied ? "적용" : "skip"}
                </Badge>
                <span className="font-mono">{o.target}</span>
                {o.before != null && o.after != null && (
                  <span className="text-[color:var(--color-muted-foreground)]">
                    {String(o.before ?? "—")} → <b className="text-[color:var(--color-foreground)]">{String(o.after)}</b>
                  </span>
                )}
                {o.reason && (
                  <span className="text-[color:var(--color-muted-foreground)] italic">— {o.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SimResultView({ result }: { result: SimResult }) {
  const buckets = ["A", "B", "C", "D"];
  const max = Math.max(...Object.values(result.distribution));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {buckets.map((b) => (
          <div
            key={b}
            className="rounded-md border border-[color:var(--color-border)] p-3 text-center"
          >
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
              Tier {b}
            </div>
            <div className="font-bold text-xl tabular-nums">{result.distribution[b] ?? 0}</div>
            <div className="mt-1 h-1.5 bg-[color:var(--color-muted)] rounded overflow-hidden">
              <div
                className="h-full bg-[color:var(--color-brand-lime)]"
                style={{ width: `${((result.distribution[b] ?? 0) / (max || 1)) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
          <Clock className="size-3.5" /> 영향 변경 — {result.changes.length}건
        </div>
        {result.changes.length === 0 ? (
          <div className="text-xs text-[color:var(--color-muted-foreground)]">
            현재 룰을 적용해도 변경되는 광고주가 없습니다.
          </div>
        ) : (
          <div className="space-y-1">
            {result.changes.slice(0, 12).map((c) => (
              <div
                key={c.cmid}
                className="flex items-center justify-between gap-2 text-xs rounded px-2 py-1.5 border border-[color:var(--color-border)]"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-[color:var(--color-muted-foreground)]">
                  Tier{" "}
                  <span className="font-mono">{c.from ?? "—"}</span>
                  {" → "}
                  <b className="text-[color:var(--color-foreground)] font-mono">{String(c.to)}</b>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatInputValue(key: string, value: unknown): string {
  if (value == null) return "null";
  if (key.toLowerCase().includes("krw") && typeof value === "number") {
    return `${value.toLocaleString()}  (${fmtKrw(value)})`;
  }
  if (typeof value === "number") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
