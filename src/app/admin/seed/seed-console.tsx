"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

type Counts = {
  accounts: number;
  sfAccounts: number;
  sheetProspects: number;
  documents: number;
  activities: number;
  rules: number;
  executions: number;
  mdmCandidates: number;
};

type SeedResult =
  | { ok: true; latencyMs: number; counts: Counts }
  | { ok: false; error: string };

export function SeedConsole({ requireSecret }: { requireSecret: boolean }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState<SeedResult | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  // Initial counts on mount
  useEffect(() => {
    refreshCounts();
  }, []);

  async function refreshCounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seed", { cache: "no-store" });
      const json = await res.json();
      if (json.counts) setCounts(json.counts);
    } finally {
      setLoading(false);
    }
  }

  async function runSeed() {
    setSeeding(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed", {
        method: "POST",
        headers: requireSecret ? { "x-seed-secret": secret } : {},
      });
      const json = (await res.json()) as SeedResult;
      setResult(json);
      if (res.ok && "counts" in json && json.counts) {
        setCounts(json.counts);
      }
      setConfirmStep(false);
    } catch (e: unknown) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "오류",
      });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>현재 데이터 상태</span>
              <Button variant="ghost" size="sm" onClick={refreshCounts} disabled={loading}>
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                새로고침
              </Button>
            </CardTitle>
          </CardHeader>
          <CardBody>
            {!counts ? (
              <div className="text-xs text-[color:var(--color-muted-foreground)]">
                불러오는 중…
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Tile label="광고주" value={counts.accounts} />
                <Tile label="Salesforce 원본" value={counts.sfAccounts} />
                <Tile label="Sheet 원본" value={counts.sheetProspects} />
                <Tile label="미팅록·문서" value={counts.documents} />
                <Tile label="활동 이력" value={counts.activities} />
                <Tile label="활성 룰" value={counts.rules} />
                <Tile label="감사 로그" value={counts.executions} />
                <Tile label="MDM 큐" value={counts.mdmCandidates} />
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
              데모 데이터 초기화 (Hard Reset)
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-[color:var(--color-foreground)]/85 leading-relaxed">
              모든 광고주·룰 실행 로그·메시지 초안·MDM 후보를 삭제하고 처음 상태로 되돌립니다.
              본 데모는 시연용이라 누가 만지든 자유롭게 리셋할 수 있도록 설계되어 있습니다.
            </p>

            {requireSecret && (
              <div>
                <label className="block">
                  <div className="text-xs font-medium mb-1">SEED_SECRET</div>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="환경변수에 설정한 값"
                    className="w-full h-9 px-3 border rounded-md border-[color:var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-ink)]/15"
                  />
                </label>
                <div className="text-[11px] text-[color:var(--color-muted-foreground)] mt-1 flex items-center gap-1">
                  <ShieldAlert className="size-3" />
                  공개 데모이므로 토큰 한 개로 무차별 리셋을 막고 있습니다.
                </div>
              </div>
            )}

            {!confirmStep && (
              <Button
                variant="danger"
                onClick={() => setConfirmStep(true)}
                disabled={seeding}
              >
                <RefreshCcw className="size-4" /> 데이터 초기화…
              </Button>
            )}

            {confirmStep && !seeding && (
              <div className="flex items-center gap-2 rounded-md border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-bg)] px-3 py-2 text-sm">
                <AlertTriangle className="size-4 text-[color:var(--color-danger)]" />
                <span>정말 리셋하시겠어요? 현재 데이터가 모두 삭제됩니다.</span>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirmStep(false)}>
                    취소
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={runSeed}
                    disabled={requireSecret && !secret}
                  >
                    실행
                  </Button>
                </div>
              </div>
            )}

            {seeding && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                <span>시드 실행 중… (최대 60초)</span>
              </div>
            )}

            {result && (
              <div
                className={
                  result.ok
                    ? "flex items-start gap-2 rounded-md border border-[color:var(--color-success)]/30 bg-[color:var(--color-success-bg)] px-3 py-2 text-sm"
                    : "flex items-start gap-2 rounded-md border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-bg)] px-3 py-2 text-sm"
                }
              >
                {result.ok ? (
                  <CheckCircle2 className="size-4 text-[color:var(--color-success)] mt-0.5" />
                ) : (
                  <AlertTriangle className="size-4 text-[color:var(--color-danger)] mt-0.5" />
                )}
                <div className="flex-1">
                  {result.ok ? (
                    <>
                      <div className="font-medium">
                        시드 완료 · {result.latencyMs}ms
                      </div>
                      <div className="text-[11px] text-[color:var(--color-success)]">
                        광고주 {result.counts.accounts}, 미팅록 {result.counts.documents}, 룰 {result.counts.rules}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">시드 실패</div>
                      <div className="text-[11px]">{result.error}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>기본 시드 구성</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="list-disc list-inside text-xs text-[color:var(--color-foreground)]/85 space-y-1">
              <li>22개 광고주 (Samsung · NeoFlight 등)</li>
              <li>11개 Salesforce 원본 / 8개 Sheet 원본</li>
              <li>7개 미팅록 + 3개 이메일 활동</li>
              <li>5개 과거 제안, 3개 비딩</li>
              <li>3개 활성 룰 (등급 / 리마인드 / 비딩)</li>
              <li>2개 MDM 리뷰 후보</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>분산·중복 시나리오</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="list-disc list-inside text-xs text-[color:var(--color-foreground)]/85 space-y-1">
              <li>삼성전자 · 삼성 전자 · Samsung Electronics · 삼성전자(주)</li>
              <li>NeoFlight Studios / 네오플라잇</li>
              <li>삼성공구사 — 사촌 법인 (분리 검증용)</li>
              <li>NAVER vs 네이버 — 영문/한글 별칭</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CLI에서도 가능</CardTitle>
          </CardHeader>
          <CardBody>
            <pre className="text-[11px] bg-[color:var(--color-brand-ink)] text-white p-3 rounded font-mono leading-relaxed overflow-x-auto scrollbar-thin">
{`# 로컬 또는 원격 DB에 시드
DATABASE_URL=<url> npx tsx prisma/seed.ts

# 또는 npm 스크립트
npm run seed`}
            </pre>
            <Badge tone="neutral" className="mt-2">
              결과는 동일합니다 (API 호출 = CLI 실행)
            </Badge>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium">
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
