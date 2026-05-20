"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  FileText,
  Loader2,
  PlayCircle,
  Shield,
  Sparkles,
  Type,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  { id: "parse", label: "문서 파싱", desc: "마크다운 정리 · 헤더/푸터 제거" },
  { id: "pii", label: "PII 마스킹", desc: "Regex + LLM fallback · 원본 별도 보관" },
  { id: "extract", label: "구조 추출 (LLM)", desc: "Claude Tool Use · JSON 스키마 강제" },
  { id: "entityLink", label: "엔티티 링킹", desc: "참석자/회사 → PMID·CMID" },
  { id: "chunk", label: "Semantic chunking", desc: "800±200 토큰 · overlap 80" },
  { id: "embed", label: "임베딩", desc: "voyage-multilingual-2 · 1024d" },
  { id: "index", label: "인덱싱", desc: "Gold + 청크 + 벡터 영속화" },
];

interface ExtractResult {
  timings: Record<string, number>;
  cleaned: string;
  piiHits: { type: string; raw: string; masked: string; start: number; end: number }[];
  redacted: string;
  fields: {
    occurredAt: string | null;
    location?: string;
    channel?: string;
    attendees: { name: string; party: string; companyName?: string; title?: string }[];
    topics: { label: string; summary: string; evidenceSpan: string; sentiment: string }[];
    actionItems: { ownerParty: string; description: string }[];
    budgetSignals: { amountKrw: number; scope: string; horizon: string }[];
    productsMentioned: string[];
    competitorsMentioned: string[];
    nextMeeting: { at: string } | null;
    riskFlags: string[];
  };
  linkedEntities: { name: string; party: string; cmid?: string; companyName?: string; matched: boolean }[];
  chunks: { ordinal: number; text: string; charCount: number; topics: string[]; sectionPath: string }[];
  embedding: { model: string; dim: number; chunkCount: number; batches: number };
}

export function ExtractDemo({ sampleText }: { sampleText: string }) {
  const [text, setText] = useState(sampleText);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<number>(-1);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Drive a synthetic progress animation while the request is in flight.
    const cancelFlag = { cancelled: false };
    const animate = async () => {
      const intervals = [220, 400, 1100, 220, 220, 600, 200];
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        if (cancelFlag.cancelled) return;
        setStage(i);
        await new Promise((r) => setTimeout(r, intervals[i] ?? 250));
      }
    };

    const animPromise = animate();

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "추출 실패");
      // Make sure animation reaches end
      await animPromise;
      setResult(json as ExtractResult);
      setStage(PIPELINE_STEPS.length);
    } catch (e: unknown) {
      cancelFlag.cancelled = true;
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* INPUT */}
      <div className="lg:col-span-5 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>입력 미팅록 (편집 가능)</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={20}
              className="w-full font-mono text-[12px] leading-relaxed bg-[color:var(--color-muted)] rounded-md p-3 border border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 scrollbar-thin"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-[color:var(--color-muted-foreground)]">
                {text.length.toLocaleString()}자 · {text.split(/\s+/).length}단어
              </div>
              <Button onClick={run} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                {loading ? "추출 중…" : "파이프라인 실행"}
              </Button>
            </div>
            {error && (
              <div className="mt-3 text-xs text-[color:var(--color-danger)] bg-[color:var(--color-danger-bg)] px-3 py-2 rounded-md">
                {error}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>파이프라인 단계</CardTitle>
          </CardHeader>
          <CardBody>
            <ol className="space-y-2.5">
              {PIPELINE_STEPS.map((s, i) => {
                const state =
                  stage === -1 ? "idle" : i < stage ? "done" : i === stage ? (loading ? "active" : "done") : "pending";
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-start gap-3 rounded-md p-2.5 transition border",
                      state === "active" && "bg-[color:var(--color-brand-lime-bg)]/40 border-[color:var(--color-brand-lime)]",
                      state === "done" && "bg-[color:var(--color-success-bg)]/40 border-[color:var(--color-success)]/30",
                      state === "pending" && "opacity-60 border-transparent",
                      state === "idle" && "border-transparent",
                    )}
                  >
                    <div className="mt-0.5">
                      {state === "done" && (
                        <CheckCircle2 className="size-4 text-[color:var(--color-success)]" />
                      )}
                      {state === "active" && (
                        <Loader2 className="size-4 animate-spin text-[color:var(--color-brand-ink)]" />
                      )}
                      {(state === "pending" || state === "idle") && (
                        <Circle className="size-4 text-[color:var(--color-muted-foreground)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {i + 1}. {s.label}
                        </span>
                        {result && state === "done" && (
                          <span className="text-[10px] tabular-nums text-[color:var(--color-muted-foreground)]">
                            {result.timings[s.id]}ms
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
                        {s.desc}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      </div>

      {/* OUTPUT */}
      <div className="lg:col-span-7 space-y-4">
        {!result && !loading && (
          <Card className="bg-[color:var(--color-brand-ink)] text-white">
            <CardBody className="flex items-center gap-4">
              <div className="size-10 rounded-md bg-[color:var(--color-brand-lime)] text-[color:var(--color-brand-ink)] flex items-center justify-center">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="font-semibold tracking-tight">파이프라인 실행 전</div>
                <div className="text-xs text-white/70 mt-0.5">
                  미팅록 원문을 편집하고 [파이프라인 실행]을 누르세요.
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        {loading && !result && (
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-[color:var(--color-brand-ink)]" />
                <div>
                  <div className="font-medium text-sm">7단계 파이프라인 진행 중…</div>
                  <div className="text-xs text-[color:var(--color-muted-foreground)]">
                    좌측의 단계 표시기를 확인하세요. 평균 ~2.5초 소요.
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {result && <ExtractedFields result={result} />}
        {result && <MeetingSignalPanel result={result} />}
        {result && <EntityLinks result={result} />}
        {result && <PiiPanel result={result} />}
        {result && <ChunksPanel result={result} />}
      </div>
    </div>
  );
}

function ExtractedFields({ result }: { result: ExtractResult }) {
  const f = result.fields;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" /> 구조화 JSON (Tool Use 결과)
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Kv label="일시" value={f.occurredAt ?? "—"} />
          <Kv label="채널 / 장소" value={`${f.channel ?? "—"} · ${f.location ?? "—"}`} />
        </div>

        <div>
          <div className="text-xs font-semibold mb-1.5">참석자</div>
          <div className="flex flex-wrap gap-1.5">
            {f.attendees.map((a, i) => (
              <Badge key={i} tone={a.party === "us" ? "ink" : "info"}>
                {a.name}
                {a.companyName ? ` (${a.companyName})` : ""}
                {a.title ? ` · ${a.title}` : ""}
              </Badge>
            ))}
            {f.attendees.length === 0 && (
              <span className="text-xs text-[color:var(--color-muted-foreground)]">탐지 없음</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-1.5">탐지 토픽</div>
          <div className="space-y-2">
            {f.topics.map((t, i) => (
              <div key={i} className="rounded-md border border-[color:var(--color-border)] p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium">{t.label}</span>
                  <Badge
                    tone={
                      t.sentiment === "positive"
                        ? "success"
                        : t.sentiment === "negative"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {t.sentiment}
                  </Badge>
                </div>
                <div className="text-xs text-[color:var(--color-foreground)]/80">{t.summary}</div>
                <div className="mt-1.5 text-[11px] text-[color:var(--color-muted-foreground)] italic">
                  ↳ &ldquo;{t.evidenceSpan.slice(0, 150)}{t.evidenceSpan.length > 150 ? "…" : ""}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold mb-1.5">액션 아이템</div>
            <ul className="space-y-1 text-xs">
              {f.actionItems.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <Badge tone={a.ownerParty === "us" ? "ink" : "info"}>
                    {a.ownerParty === "us" ? "당사" : a.ownerParty === "client" ? "광고주" : "양측"}
                  </Badge>
                  <span>{a.description}</span>
                </li>
              ))}
              {f.actionItems.length === 0 && (
                <span className="text-[color:var(--color-muted-foreground)]">탐지 없음</span>
              )}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1.5">예산 시그널</div>
            <ul className="space-y-1 text-xs">
              {f.budgetSignals.map((b, i) => (
                <li key={i}>
                  <Badge tone="lime">{(b.amountKrw / 1_0000_0000).toFixed(1)}억</Badge>
                  <span className="ml-1 text-[color:var(--color-muted-foreground)]">
                    {b.scope} · {b.horizon}
                  </span>
                </li>
              ))}
              {f.budgetSignals.length === 0 && (
                <span className="text-[color:var(--color-muted-foreground)]">탐지 없음</span>
              )}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Kv label="언급 제품" value={f.productsMentioned.join(", ") || "—"} />
          <Kv label="언급 경쟁사" value={f.competitorsMentioned.join(", ") || "—"} />
          <Kv label="다음 미팅" value={f.nextMeeting ? f.nextMeeting.at : "—"} />
          <Kv label="리스크 플래그" value={f.riskFlags.join(", ") || "—"} />
        </div>
      </CardBody>
    </Card>
  );
}

function MeetingSignalPanel({ result }: { result: ExtractResult }) {
  const f = result.fields;

  const budgetAmount = f.budgetSignals[0]?.amountKrw ?? null;
  const budgetConfidence: "HIGH" | "MEDIUM" | "LOW" =
    budgetAmount === null ? "LOW" : budgetAmount >= 500_000_000 ? "HIGH" : budgetAmount >= 100_000_000 ? "MEDIUM" : "LOW";
  const budgetTimeline = f.budgetSignals[0]?.horizon ?? "미확인";

  const intentTypes = f.topics.map((t) => {
    if (t.label.includes("RFP") || t.label.includes("제안")) return "RFP준비";
    if (t.label.includes("솔루션") || t.label.includes("플랫폼") || t.label.includes("광고")) return "솔루션관심";
    return "비딩";
  });
  const intentSignals = f.topics.map((t, i) => ({ type: intentTypes[i] ?? "솔루션관심", detail: t.label }));

  const tones = f.topics.map((t) => t.sentiment);
  const dominantTone = tones.includes("positive") ? "호의적" : tones.includes("negative") ? "경계" : "중립";
  const toneTone = dominantTone === "호의적" ? "success" : dominantTone === "경계" ? "danger" : "neutral";

  const overallSentiment: "positive" | "neutral" | "negative" = tones.includes("positive")
    ? "positive"
    : tones.includes("negative")
      ? "negative"
      : "neutral";
  const sentimentTone = overallSentiment === "positive" ? "success" : overallSentiment === "negative" ? "danger" : "neutral";

  const piiTypes = result.piiHits.map((h) => h.type);
  const confColor = budgetConfidence === "HIGH" ? "var(--color-success)" : budgetConfidence === "MEDIUM" ? "#3b82f6" : "var(--color-warning)";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-[color:var(--color-brand-lime)]" />
          MeetingSignal 구조화 스키마
          <span className="text-[10px] font-normal bg-[color:var(--color-brand-ink)] text-[color:var(--color-brand-lime)] px-1.5 py-0.5 rounded ml-1">
            GPT-5.2 Structured Output
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* budget_signal */}
          <div
            className={cn(
              "rounded-md border p-3 space-y-1.5",
              budgetAmount && budgetAmount > 0
                ? "border-[color:var(--color-success)]/40 bg-[color:var(--color-success-bg)]/30"
                : "border-[color:var(--color-border)]",
            )}
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--color-muted-foreground)]">
              budget_signal
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[color:var(--color-muted-foreground)]">amount</span>
              <span className="font-mono font-semibold">
                {budgetAmount ? `${(budgetAmount / 1_0000_0000).toFixed(1)}억 원` : "null"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[color:var(--color-muted-foreground)]">confidence</span>
              <span className="font-mono font-semibold" style={{ color: confColor }}>
                {budgetConfidence}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[color:var(--color-muted-foreground)]">timeline</span>
              <span className="font-mono">{budgetTimeline}</span>
            </div>
          </div>

          {/* relationship_signal + sentiment */}
          <div className="rounded-md border border-[color:var(--color-border)] p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--color-muted-foreground)]">
              relationship_signal
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[color:var(--color-muted-foreground)]">tone</span>
              <Badge tone={toneTone}>{dominantTone}</Badge>
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-[color:var(--color-muted-foreground)]">
              sentiment
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone={sentimentTone}>{overallSentiment}</Badge>
            </div>
          </div>

          {/* intent_signal */}
          <div className="rounded-md border border-[color:var(--color-border)] p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--color-muted-foreground)]">
              intent_signal
            </div>
            {intentSignals.length === 0 ? (
              <span className="text-xs text-[color:var(--color-muted-foreground)]">탐지 없음</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {intentSignals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Badge tone="ink">{sig.type}</Badge>
                    <span className="text-[11px] text-[color:var(--color-foreground)]/70">{sig.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* pii_detected */}
          <div className="rounded-md border border-[color:var(--color-border)] p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--color-muted-foreground)]">
              pii_detected
            </div>
            {piiTypes.length === 0 ? (
              <span className="text-xs text-[color:var(--color-muted-foreground)]">탐지 없음</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(piiTypes)].map((t) => (
                  <Badge key={t} tone="warning">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* next_actions */}
        <div className="rounded-md border border-[color:var(--color-border)] p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--color-muted-foreground)]">
            next_actions
          </div>
          {f.actionItems.length === 0 ? (
            <span className="text-xs text-[color:var(--color-muted-foreground)]">탐지 없음</span>
          ) : (
            <ul className="space-y-1 text-xs">
              {f.actionItems.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[color:var(--color-brand-ink)] mt-0.5">·</span>
                  <Badge tone={a.ownerParty === "us" ? "ink" : "info"} className="shrink-0">
                    {a.ownerParty === "us" ? "당사" : a.ownerParty === "client" ? "광고주" : "양측"}
                  </Badge>
                  <span className="text-[color:var(--color-foreground)]/85">{a.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* topics */}
        <div className="rounded-md border border-[color:var(--color-border)] p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--color-muted-foreground)]">
            topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {f.topics.map((t, i) => (
              <Badge key={i} tone="lime">{t.label}</Badge>
            ))}
            {f.topics.length === 0 && (
              <span className="text-xs text-[color:var(--color-muted-foreground)]">탐지 없음</span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function EntityLinks({ result }: { result: ExtractResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>엔티티 링킹 (참석자 → CMID)</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-1.5">
          {result.linkedEntities.map((l, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
                l.matched ? "border-[color:var(--color-success)]/40 bg-[color:var(--color-success-bg)]/30" : "border-[color:var(--color-border)]",
              )}
            >
              <div className="flex items-center gap-2">
                <Badge tone={l.party === "us" ? "ink" : "info"}>
                  {l.party === "us" ? "당사" : "광고주"}
                </Badge>
                <span className="font-medium">{l.name}</span>
                {l.companyName && (
                  <span className="text-[color:var(--color-muted-foreground)] text-xs">
                    · {l.companyName}
                  </span>
                )}
              </div>
              <div>
                {l.matched ? (
                  <span className="text-xs tabular-nums text-[color:var(--color-success)]">
                    → {l.cmid}
                  </span>
                ) : (
                  <span className="text-xs text-[color:var(--color-warning)]">
                    review_queue로
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function PiiPanel({ result }: { result: ExtractResult }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-4 text-[color:var(--color-warning)]" />
          PII 마스킹 — 검출 {result.piiHits.length}건
          {open ? <ChevronUp className="size-4 ml-auto" /> : <ChevronDown className="size-4 ml-auto" />}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardBody>
          {result.piiHits.length === 0 ? (
            <div className="text-xs text-[color:var(--color-muted-foreground)]">
              민감 정보가 탐지되지 않았습니다.
            </div>
          ) : (
            <div className="space-y-1.5">
              {result.piiHits.map((h, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 text-xs items-center border-b border-[color:var(--color-border)] pb-1.5 last:border-0"
                >
                  <Badge tone="warning" className="col-span-2 justify-center">
                    {h.type}
                  </Badge>
                  <div className="col-span-5 font-mono text-[11px] text-[color:var(--color-danger)] line-through">
                    {h.raw}
                  </div>
                  <div className="col-span-5 font-mono text-[11px] text-[color:var(--color-success)]">
                    {h.masked}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-[11px] text-[color:var(--color-muted-foreground)] leading-relaxed">
            원본은 보호 버킷에 별도 저장되고 인덱스/임베딩은 마스킹 본문을 사용합니다. 관리자
            권한자만 audit 로그를 남기고 일부를 reveal할 수 있습니다.
          </div>
        </CardBody>
      )}
    </Card>
  );
}

function ChunksPanel({ result }: { result: ExtractResult }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-[color:var(--color-brand-ink)]" />
          청크 & 임베딩 — {result.chunks.length} chunks · {result.embedding.dim}d ·{" "}
          <code className="bg-[color:var(--color-muted)] px-1 rounded text-[11px]">
            {result.embedding.model}
          </code>
          {open ? <ChevronUp className="size-4 ml-auto" /> : <ChevronDown className="size-4 ml-auto" />}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardBody>
          <div className="space-y-2">
            {result.chunks.map((c) => (
              <div
                key={c.ordinal}
                className="border border-[color:var(--color-border)] rounded-md p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="ink">#{c.ordinal}</Badge>
                    <span className="text-xs text-[color:var(--color-muted-foreground)]">
                      {c.sectionPath}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Type className="size-3" />
                    <span className="tabular-nums">{c.charCount}자</span>
                  </div>
                </div>
                <div className="text-[12px] leading-relaxed text-[color:var(--color-foreground)]/85 font-mono whitespace-pre-wrap">
                  {c.text}
                </div>
                {c.topics.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.topics.map((t) => (
                      <Badge key={t} tone="lime">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      )}
    </Card>
  );
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium">
        {label}
      </span>
      <span className="text-xs text-[color:var(--color-foreground)] mt-0.5">{value}</span>
    </div>
  );
}
