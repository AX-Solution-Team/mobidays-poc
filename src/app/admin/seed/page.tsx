import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function SeedPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin · Demo Utilities"
        title="시드 데이터 관리"
        description="시연 중 데이터를 변경한 경우, CLI에서 시드를 다시 실행하여 초기 상태로 되돌릴 수 있습니다."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/admin", label: "Admin" },
          { label: "Seed" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>리셋 절차</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <ol className="list-decimal list-inside text-sm space-y-2 text-[color:var(--color-foreground)]/85">
            <li>터미널에서 프로젝트 루트로 이동.</li>
            <li>
              <code className="bg-[color:var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                npx prisma db push --force-reset --accept-data-loss
              </code>{" "}
              로 스키마를 깨끗하게 재적용.
            </li>
            <li>
              <code className="bg-[color:var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                npx tsx prisma/seed.ts
              </code>{" "}
              로 시드 데이터를 다시 적재.
            </li>
            <li>이 페이지를 새로고침하여 상태를 확인.</li>
          </ol>
          <div className="text-xs text-[color:var(--color-muted-foreground)] bg-[color:var(--color-muted)] rounded p-3 mt-3">
            <b>안전 안내</b> · 이 데모는 단일 SQLite 파일(<code>prisma/dev.db</code>)을 사용하므로
            리셋 시 모든 변경이 사라집니다. 데모 환경 외에서는 절대 실행하지 마세요.
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <Card>
          <CardBody>
            <div className="font-semibold mb-1">기본 시드 구성</div>
            <ul className="list-disc list-inside text-[color:var(--color-muted-foreground)] space-y-0.5">
              <li>22개 광고주 (Samsung·NeoFlight 등)</li>
              <li>11개 Salesforce 원본 / 8개 Sheet 원본</li>
              <li>7개 미팅록 + 3개 이메일 활동</li>
              <li>5개 과거 제안, 3개 비딩</li>
              <li>3개 활성 룰 (등급/리마인드/비딩)</li>
              <li>2개 MDM 리뷰 후보</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="font-semibold mb-1">분산·중복 시나리오</div>
            <ul className="list-disc list-inside text-[color:var(--color-muted-foreground)] space-y-0.5">
              <li>삼성전자 · 삼성 전자 · Samsung Electronics · 삼성전자(주)</li>
              <li>NeoFlight Studios / 네오플라잇</li>
              <li>삼성공구사 — 사촌 법인 (분리 검증)</li>
              <li>NAVER vs 네이버 — 영문/한글 별칭</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="font-semibold mb-1">실 환경 이관 시 변경</div>
            <ul className="list-disc list-inside text-[color:var(--color-muted-foreground)] space-y-0.5">
              <li>SQLite → PostgreSQL + pgvector</li>
              <li>Mock LLM → Claude / Voyage 호출</li>
              <li>Prisma 마이그레이션 + RLS 설정</li>
              <li>Salesforce / Sheets / Drive CDC 연결</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
