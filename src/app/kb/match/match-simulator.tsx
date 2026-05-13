"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Search,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchDecision } from "@/lib/mdm/match";
import { cn } from "@/lib/utils";

type FormData = {
  name: string;
  businessNo: string;
  website: string;
  industry: string;
  address: string;
  email: string;
};

const EMPTY: FormData = {
  name: "",
  businessNo: "",
  website: "",
  industry: "",
  address: "",
  email: "",
};

const SAMPLES: { id: string; label: string; tone: string; hint: string; data: FormData }[] = [
  {
    id: "samsung_full",
    label: "삼성전자 (Tier 1 — 사업자번호)",
    tone: "lime",
    hint: "사업자등록번호 일치 → 즉시 자동 병합",
    data: {
      name: "삼성전자",
      businessNo: "1248100998",
      website: "https://www.samsung.com",
      industry: "Electronics",
      address: "수원시 영통구",
      email: "",
    },
  },
  {
    id: "samsung_kor",
    label: "삼성 전자 (Tier 2 — 이름 + 도메인)",
    tone: "info",
    hint: "사업자번호 없으나 이름·도메인 정규화 일치",
    data: {
      name: "삼성 전자",
      businessNo: "",
      website: "https://www.samsung.com",
      industry: "Electronics",
      address: "",
      email: "",
    },
  },
  {
    id: "samsung_en",
    label: "Samsung Electronics (Tier 3 — 확률적)",
    tone: "neutral",
    hint: "별칭/이름 임베딩·도메인 결합으로 자동 매칭",
    data: {
      name: "Samsung Electronics",
      businessNo: "",
      website: "https://www.samsung.com",
      industry: "Electronics",
      address: "",
      email: "",
    },
  },
  {
    id: "samsung_legal",
    label: "삼성전자(주) (정규화 효과)",
    tone: "neutral",
    hint: "괄호·법인 접미사 제거 후 정규화 매칭",
    data: {
      name: "삼성전자(주)",
      businessNo: "",
      website: "",
      industry: "",
      address: "",
      email: "",
    },
  },
  {
    id: "tools_decoy",
    label: "삼성공구사 (혼동 케이스 — 분리되어야 함)",
    tone: "danger",
    hint: "이름 유사하나 사업자번호 다른 별개 법인",
    data: {
      name: "삼성공구사",
      businessNo: "1242010200",
      website: "",
      industry: "Manufacturing",
      address: "",
      email: "",
    },
  },
  {
    id: "neoflight_en",
    label: "NeoFlight Studios (영문→한글)",
    tone: "neutral",
    hint: "영문 표기 + 도메인만 있을 때 매칭",
    data: {
      name: "NeoFlight Studios",
      businessNo: "",
      website: "https://www.neoflight.demo",
      industry: "Game",
      address: "",
      email: "jh.kim@neoflight.demo",
    },
  },
];

export function MatchSimulator() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [result, setResult] = useState<MatchDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [activeSample, setActiveSample] = useState<string | null>(null);

  const updateField = (k: keyof FormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadSample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id);
    if (s) {
      setForm(s.data);
      setActiveSample(id);
      setResult(null);
      setError(null);
    }
  };

  const clear = () => {
    setForm(EMPTY);
    setResult(null);
    setError(null);
    setActiveSample(null);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError("회사명을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          businessNo: form.businessNo || null,
          website: form.website || null,
          industry: form.industry || null,
          address: form.address || null,
          email: form.email || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "요청 실패");
      startTransition(() => setResult(json as MatchDecision));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* INPUT PANEL */}
      <div className="lg:col-span-5 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>입력 (외부 ID 부재 시나리오 포함)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Field label="회사명 *" placeholder="예: 삼성 전자">
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full h-9 px-3 border rounded-md border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="사업자등록번호" placeholder="10자리 (예: 1248100998)">
                <input
                  value={form.businessNo}
                  onChange={(e) => updateField("businessNo", e.target.value)}
                  className="w-full h-9 px-3 border rounded-md border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 text-sm tabular-nums"
                />
              </Field>
              <Field label="도메인 / 웹사이트">
                <input
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="w-full h-9 px-3 border rounded-md border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 text-sm"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="산업군">
                <input
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className="w-full h-9 px-3 border rounded-md border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 text-sm"
                />
              </Field>
              <Field label="컨택 이메일">
                <input
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full h-9 px-3 border rounded-md border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 text-sm"
                />
              </Field>
            </div>
            <Field label="주소">
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full h-9 px-3 border rounded-md border-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15 text-sm"
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <Button onClick={submit} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                {loading ? "매칭 중…" : "매칭 실행"}
              </Button>
              <Button variant="outline" onClick={clear}>
                <RefreshCcw className="size-4" /> 초기화
              </Button>
            </div>
            {error && (
              <div className="text-xs text-[color:var(--color-danger)] bg-[color:var(--color-danger-bg)] px-3 py-2 rounded-md">
                {error}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>샘플 케이스 — 한 번에 로드</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSample(s.id)}
                className={cn(
                  "w-full text-left rounded-md border border-[color:var(--color-border)] px-3 py-2.5 hover:border-[color:var(--color-brand-ink)] transition",
                  activeSample === s.id && "border-[color:var(--color-brand-ink)] bg-[color:var(--color-brand-lime-bg)]/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <ChevronRight className="size-3 text-[color:var(--color-muted-foreground)]" />
                </div>
                <div className="text-[11px] text-[color:var(--color-muted-foreground)] mt-0.5">
                  {s.hint}
                </div>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* RESULT PANEL */}
      <div className="lg:col-span-7 space-y-4">
        <ResultHeader result={result} loading={loading} />
        <TierTrace result={result} loading={loading} />
        <FeatureBreakdown result={result} />
        <CandidatesList result={result} />
        <PipelineHelp />
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  children,
}: {
  label: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-[color:var(--color-foreground)]/80 mb-1">
        {label}
        {placeholder && (
          <span className="ml-1.5 text-[color:var(--color-muted-foreground)] font-normal">
            {placeholder}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function ResultHeader({
  result,
  loading,
}: {
  result: MatchDecision | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardBody className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-[color:var(--color-brand-ink)]" />
          <div>
            <div className="font-medium text-sm">매칭 파이프라인 실행 중…</div>
            <div className="text-xs text-[color:var(--color-muted-foreground)]">
              Tier 1 → 2 → 3 순으로 결정론적·확률적 매칭을 수행합니다
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }
  if (!result) {
    return (
      <Card className="bg-[color:var(--color-brand-ink)] text-white">
        <CardBody className="flex items-center gap-4">
          <div className="size-10 rounded-md bg-[color:var(--color-brand-lime)] flex items-center justify-center text-[color:var(--color-brand-ink)]">
            <Search className="size-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">왼쪽 패널에 값을 입력하고 매칭 실행</div>
            <div className="text-xs text-white/65 mt-0.5">
              샘플 케이스를 클릭하면 검증 시나리오가 자동 로드됩니다.
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  const matched = result.tier === 1 || result.tier === 2 || (result.tier === 3 && result.auto);
  const review = result.tier === "review";
  const isNew = result.tier === "new";

  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "size-12 rounded-md flex items-center justify-center",
              matched
                ? "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]"
                : review
                  ? "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]"
                  : "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]",
            )}
          >
            {matched ? <CheckCircle2 className="size-6" /> : review ? <AlertTriangle className="size-6" /> : <Wand2 className="size-6" />}
          </div>
          <div>
            <div className="text-sm text-[color:var(--color-muted-foreground)] font-medium">
              {matched ? "자동 병합 (auto-merge)" : review ? "리뷰 큐 진입" : "신규 CMID 후보"}
            </div>
            <div className="text-xl font-semibold tracking-tight">
              {matched && result.candidates[0]?.canonicalName}
              {matched && (
                <Link
                  href={`/accounts/${result.cmid}`}
                  className="ml-2 text-[color:var(--color-brand-ink)] text-sm underline decoration-dotted"
                >
                  {result.cmid}
                </Link>
              )}
              {review && `${result.candidates[0]?.canonicalName ?? "—"} (검토 필요)`}
              {isNew && "유사 광고주 없음 → 신규 등록 권장"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium">
            매칭 단계 / 신뢰도
          </div>
          <div className="font-bold text-2xl tabular-nums leading-tight">
            <span
              className={cn(
                "px-2 py-0.5 rounded text-base mr-2",
                matched
                  ? "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]"
                  : review
                    ? "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]"
                    : "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]",
              )}
            >
              Tier {String(result.tier)}
            </span>
            {(result.confidence * 100).toFixed(1)}%
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function TierTrace({
  result,
  loading,
}: {
  result: MatchDecision | null;
  loading: boolean;
}) {
  if (!result || loading) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>실행 트레이스</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2.5">
        {[1, 2, 3].map((t) => {
          const tr = result.trace.find((x) => x.tier === t);
          const color =
            tr?.status === "matched"
              ? "success"
              : tr?.status === "no-match"
                ? "danger"
                : "neutral";
          const ringColor =
            tr?.status === "matched"
              ? "ring-[color:var(--color-success)]"
              : tr?.status === "no-match"
                ? "ring-[color:var(--color-danger)]/30"
                : "ring-[color:var(--color-border)]";
          return (
            <div
              key={t}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md border border-[color:var(--color-border)] ring-2 ring-transparent",
                tr?.status === "matched" && "bg-[color:var(--color-success-bg)] ring-[color:var(--color-success)]",
                tr?.status === "skipped" && "opacity-60",
                ringColor,
              )}
            >
              <Badge tone={color === "success" ? "success" : color === "danger" ? "danger" : "neutral"}>
                Tier {t}
              </Badge>
              <div className="text-sm font-medium">
                {t === 1
                  ? "결정론적 강한 키 (사업자번호 / DART)"
                  : t === 2
                    ? "결정론적 약한 키 (정규화 이름 + 도메인)"
                    : "확률적 매칭 (가중 피처 + 임계값)"}
              </div>
              <div className="ml-auto text-xs text-[color:var(--color-muted-foreground)]">
                {tr ? tr.detail : "미실행"}
              </div>
              {tr?.status === "matched" && <Check className="size-4 text-[color:var(--color-success)]" />}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function FeatureBreakdown({ result }: { result: MatchDecision | null }) {
  if (!result || !result.candidates[0]?.features?.length) return null;
  const top = result.candidates[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>피처별 기여도 — Top 후보</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {top.features.map((f) => (
            <div key={f.feature} className="flex items-center gap-3">
              <div className="w-32 text-xs font-medium text-[color:var(--color-foreground)]/80">
                {featureLabel(f.feature)}
              </div>
              <div className="flex-1 h-5 bg-[color:var(--color-muted)] rounded overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-[color:var(--color-brand-ink)]"
                  style={{ width: `${Math.max(0, f.contribution * 100 * 4)}%`, maxWidth: "100%" }}
                />
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 text-[10px] tabular-nums z-10">
                  <span className="text-white drop-shadow-sm mix-blend-difference">
                    raw {f.raw.toFixed(2)} · w {f.weight.toFixed(2)}
                  </span>
                  <span className="font-semibold">
                    +{(f.contribution * 100).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="w-44 text-[11px] text-[color:var(--color-muted-foreground)]">
                {f.evidence}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-[color:var(--color-border)]">
            <div className="w-32 text-xs font-semibold">최종 스코어</div>
            <div className="flex-1 h-2 bg-[color:var(--color-muted)] rounded overflow-hidden">
              <div
                className="h-full bg-[color:var(--color-brand-lime)]"
                style={{ width: `${top.score * 100}%` }}
              />
            </div>
            <div className="w-20 text-sm font-bold tabular-nums">
              {(top.score * 100).toFixed(1)}
            </div>
            <div className="w-24 text-[11px] text-[color:var(--color-muted-foreground)]">
              임계: 92 자동 / 75 검토
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function CandidatesList({ result }: { result: MatchDecision | null }) {
  if (!result || !result.candidates.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top-3 후보 비교</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {result.candidates.slice(0, 3).map((c, i) => (
            <div
              key={c.cmid}
              className="flex items-center justify-between p-3 rounded-md border border-[color:var(--color-border)]"
            >
              <div className="flex items-center gap-3">
                <span className="size-7 rounded-full bg-[color:var(--color-brand-ink)] text-white flex items-center justify-center text-xs font-semibold">
                  {i + 1}
                </span>
                <div>
                  <div className="font-medium text-sm">
                    <Link href={`/accounts/${c.cmid}`} className="hover:underline">
                      {c.canonicalName}
                    </Link>
                  </div>
                  <div className="text-[11px] text-[color:var(--color-muted-foreground)] mt-0.5">
                    {c.cmid} · {c.industryLabel ?? "—"} · {c.domainRoot ?? "—"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums">
                  {(c.score * 100).toFixed(1)}
                </div>
                <div className="text-[10px] text-[color:var(--color-muted-foreground)] uppercase tracking-wider">
                  {c.score >= 0.92 ? "auto" : c.score >= 0.75 ? "review" : "no-match"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function PipelineHelp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>이 파이프라인이 보여주는 것</CardTitle>
      </CardHeader>
      <CardBody className="text-xs leading-relaxed text-[color:var(--color-foreground)]/85 space-y-2">
        <p>
          <b>결정론적 강한 키</b>가 있으면 즉시 매칭하고 (사업자번호·DART 고유번호),
          이 키들이 부재한 경우에만 비용 큰 확률적 매칭을 수행합니다.
        </p>
        <p>
          <b>확률적 단계</b>는 이름 토큰 유사도 · 한글-자모 임베딩 · 도메인 · 별칭 사전 ·
          산업 · 컨택 시그널을 가중합으로 결합. 임계값 0.92 이상은 자동 병합,
          0.75~0.92는 운영자 리뷰 큐로 보냅니다.
        </p>
        <p>
          <b>혼동 케이스 (예: 삼성공구사)</b>는 사업자번호가 다른 것이 신호가 되어 즉시 분리됩니다.
        </p>
      </CardBody>
    </Card>
  );
}

function featureLabel(key: string): string {
  return (
    {
      name_token: "이름 토큰",
      name_sim: "이름 유사도",
      domain: "도메인 일치",
      address: "주소 일치",
      industry: "산업군 일치",
      brand_alias: "별칭 사전",
      contact_signal: "컨택 시그널",
      business_no_exact: "사업자번호 완전일치",
      dart_exact: "DART 완전일치",
      "name+domain": "이름+도메인 일치",
    }[key] ?? key
  );
}
