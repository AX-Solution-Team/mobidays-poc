"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Book,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSearch,
  GitMerge,
  Info,
  Lightbulb,
  ListChecks,
  Map,
  MessagesSquare,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

const TOC: Section[] = [
  { id: "welcome", label: "환영합니다", icon: Rocket, group: "시작하기" },
  { id: "tour", label: "5분 둘러보기", icon: Map, group: "시작하기" },
  { id: "demo-flow", label: "추천 시연 동선", icon: Workflow, group: "시작하기" },

  { id: "kb-match", label: "통합 ID 매칭", icon: GitMerge, group: "Knowledge Base" },
  { id: "kb-extract", label: "비정형 데이터 처리", icon: FileSearch, group: "Knowledge Base" },
  { id: "kb-rules", label: "룰 엔진 연계", icon: Network, group: "Knowledge Base" },
  { id: "kb-360", label: "광고주 360 뷰", icon: Target, group: "Knowledge Base" },

  { id: "agent-dash", label: "Agent 대시보드", icon: Sparkles, group: "Sales Agent" },
  { id: "agent-recommend", label: "추천 워크플로", icon: Target, group: "Sales Agent" },
  { id: "agent-message", label: "메시지 초안", icon: MessagesSquare, group: "Sales Agent" },
  { id: "agent-actions", label: "액션 큐", icon: ListChecks, group: "Sales Agent" },

  { id: "gov-dq", label: "데이터 품질", icon: ShieldCheck, group: "거버넌스" },
  { id: "gov-mdm", label: "MDM 리뷰", icon: GitMerge, group: "거버넌스" },
  { id: "gov-audit", label: "감사 로그", icon: Book, group: "거버넌스" },

  { id: "ops-reset", label: "데이터 초기화", icon: Database, group: "운영" },
  { id: "faq", label: "자주 묻는 질문", icon: Info, group: "운영" },
];

export function HelpBook() {
  const [active, setActive] = useState("welcome");

  // Scroll-spy: which section is currently in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(e.target.id);
            break;
          }
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    for (const s of TOC) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const groups: Record<string, Section[]> = {};
  for (const s of TOC) {
    (groups[s.group] ??= []).push(s);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_220px] gap-8 xl:gap-10">
      {/* LEFT — TOC (sticky) */}
      <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
        <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-3 flex items-center gap-1.5">
          <Book className="size-3" /> 가이드북
        </div>
        <nav className="space-y-4">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]/70 font-medium mb-1.5 px-1">
                {group}
              </div>
              <ul className="space-y-0.5">
                {items.map((s) => {
                  const Icon = s.icon;
                  const isActive = active === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1 text-[13px] transition",
                          isActive
                            ? "bg-[color:var(--color-brand-ink)] text-white"
                            : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span>{s.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* CENTER — Long-scroll content */}
      <article className="min-w-0 prose-mb max-w-2xl mx-auto lg:mx-0">
        <Eyebrow>모비데이즈 AI 데모 · 사용 가이드북</Eyebrow>
        <H1>Mobidays AI Demo 사용 안내서</H1>
        <Lead>
          이 문서는 데모의 모든 기능을 어떻게 사용하면 가장 효과적인지를 단계별로 설명합니다.
          시연 자리에서 곧바로 활용할 수 있는 멘트 예시도 함께 들어 있어요. 처음이시라면 위에서부터,
          이미 둘러보셨다면 좌측 목차에서 필요한 곳으로 바로 점프하세요.
        </Lead>

        {/* WELCOME */}
        <Section id="welcome" title="환영합니다" icon={Rocket}>
          <P>
            이 데모는 모비데이즈가 검토 중인 두 가지 RFP — <Strong>AI-ready Sales Knowledge Base</Strong>와{" "}
            <Strong>Sales Solution Agent</Strong> — 의 시제품입니다. 분산된 세일즈 데이터를 하나의
            KB로 통합하고, 그 KB 위에서 Agent가 추천·메시지·다음 액션을 만들어내는 흐름을 한 화면 안에서 보여줍니다.
          </P>
          <Callout tone="info">
            이 데모의 모든 LLM 호출은 <Strong>결정론적 mock</Strong>입니다. 외부 API 키 없이도 같은
            입력에 대해 같은 결과가 나오므로, 시연 중 외부 의존성으로 인한 불안 요소가 없습니다.
          </Callout>
          <H3>지금 어떤 데이터가 들어있나요?</H3>
          <Grid cols={3}>
            <Stat label="통합 광고주" value="22" hint="삼성·현대·네이버·넥슨 등" />
            <Stat label="원본 레코드" value="19" hint="SFDC 11 + Sheet 8" />
            <Stat label="문서·활동" value="17" hint="미팅록 7 + 이메일 10" />
            <Stat label="활성 룰" value="3" hint="등급/리마인드/비딩" />
            <Stat label="리뷰 큐" value="2" hint="MDM Tier 3 후보" />
            <Stat label="이벤트" value="1" hint="Max Summit 2026" />
          </Grid>
        </Section>

        {/* TOUR */}
        <Section id="tour" title="5분 둘러보기" icon={Map}>
          <P>
            처음 들어오셨다면, 좌측 네비게이션을 따라 위에서부터 천천히 내려가보세요. 각 페이지는
            독립적으로 사용 가능하지만, 다음 순서로 보시면 "데이터가 모이고 → AI가 그 위에서 일한다"는
            데모 전체의 스토리가 자연스럽게 흐릅니다.
          </P>
          <Steps>
            <Step n={1} title="홈 (/)">
              22개 광고주, 7개 미팅록 등 시드 카운트와 5계층 데이터 아키텍처를 확인하세요.
              화면 가운데의 <Strong>3개 RFP 카드</Strong>가 본격 시연의 출입구입니다.
            </Step>
            <Step n={2} title="KB 개요 (/kb)">
              Bronze → Silver → Gold → AI-Ready → Serving 계층이 어떻게 쌓이는지 한 페이지로 봅니다.
            </Step>
            <Step n={3} title="3개 RFP 데모 (/kb/match · /kb/extract · /kb/rules)">
              핵심 기술 검증 과제. 각각 라이브로 입력 → 결과를 보여줍니다. 자세한 사용법은 아래
              섹션에 정리해두었어요.
            </Step>
            <Step n={4} title="광고주 360 뷰 (/accounts/[cmid])">
              위 3가지 KB 기능이 만들어내는 최종 산출물 — 통합된 광고주 단일 화면.
            </Step>
            <Step n={5} title="Agent 흐름 (/agent · /agent/recommend)">
              그 KB 위에서 AI Agent가 어떻게 추천·메시지·액션을 만드는지 데모.
            </Step>
            <Step n={6} title="거버넌스 (/admin)">
              DQ · MDM · 감사 로그로 운영 안정성을 보여줍니다.
            </Step>
          </Steps>
        </Section>

        {/* DEMO FLOW */}
        <Section id="demo-flow" title="추천 시연 동선" icon={Workflow}>
          <P>
            라이브 시연에서 가장 임팩트가 큰 흐름입니다. 총 약 5분 정도가 적당하며, 각 페이지에서
            <Strong> "이 한 가지만 보세요"</Strong> 식으로 한 가지 핵심 포인트만 강조하면 됩니다.
          </P>
          <FlowTable
            rows={[
              ["00:00", "홈", "데이터 22개·미팅록 7개·룰 3개가 이미 적재된 상태입니다"],
              ["00:30", "/kb/match", "삼성전자 4가지 표기 → 단일 CMID. 사촌 법인 자동 분리"],
              ["02:00", "/kb/extract", "미팅록 1건 붙여넣고 7단계 파이프라인 실행"],
              ["03:15", "/kb/rules", "고객 분류 룰 라이브 실행 + 영향 시뮬레이션"],
              ["04:30", "/accounts/mb_acc_samsung", "출처 칩 · 활동 타임라인 · 신선도"],
              ["04:45", "/agent/recommend", "Game + CTV로 추천 → 사유 + 매칭 + 전략"],
            ]}
          />
          <Callout tone="success">
            시연 중 룰을 한 번 실행하고 곧바로 <Code>/admin/audit</Code>를 보여주면 "실제로 시스템이
            살아있다"는 느낌을 강하게 줍니다. 즉시 새 감사 로그 행이 보이거든요.
          </Callout>
        </Section>

        {/* KB MATCH */}
        <Section id="kb-match" title="통합 ID 매칭" icon={GitMerge}>
          <SubBadge>RFP 4-4 ①</SubBadge>
          <P>
            한 광고주가 여러 시스템에서 서로 다른 표기로 적혀 있어도, 이 페이지는 그것들을 자동으로
            하나의 <Code>CMID</Code>로 묶어줍니다. 그리고 똑같이 생긴 다른 법인은 자동으로 분리하죠.
          </P>
          <H3>3가지 시도해보기</H3>
          <Steps>
            <Step n={1} title="좌측 [샘플 케이스] 클릭">
              "삼성전자 (Tier 1 — 사업자번호)"를 클릭. 폼이 자동으로 채워집니다.
            </Step>
            <Step n={2} title="[매칭 실행]">
              우측에서 매칭 트레이스가 그려지고 — Tier 1이 즉시 성공해서 0.99 신뢰도로 자동 병합되는
              모습이 보입니다.
            </Step>
            <Step n={3} title="다른 케이스도 시도">
              <UL>
                <li><Strong>삼성 전자</Strong> (Tier 2 — 이름+도메인): 한글 표기가 달라도 매칭 ✓</li>
                <li><Strong>Samsung Electronics</Strong> (Tier 2 — 별칭+도메인): 영문도 매칭 ✓</li>
                <li><Strong>삼성전자(주)</Strong>: 법인 접미사 제거 후 정규화 매칭 ✓</li>
                <li><Strong>삼성공구사</Strong>: 이름은 비슷해도 사업자번호가 달라 자동 분리 ✓</li>
              </UL>
            </Step>
          </Steps>
          <H3>3-Tier 알고리즘 핵심</H3>
          <Callout tone="info">
            <Strong>Tier 1</Strong> 결정론적 강한 키 (사업자번호 · DART) → 99% 자동 병합<br />
            <Strong>Tier 2</Strong> 정규화 이름 + 도메인 → 93~95% 자동 병합<br />
            <Strong>Tier 3</Strong> 가중 피처 (이름 토큰·자모 임베딩·도메인·별칭) → 92% 이상 자동, 75~92% 리뷰 큐, 그 미만 신규
          </Callout>
          <P>
            우측 패널의 <Strong>피처별 기여도</Strong>를 확인하면 각 신호가 점수에 어떻게 기여하는지
            막대그래프로 볼 수 있어요. 매칭이 어떻게 결정됐는지 운영자에게 명확히 설명할 수 있다는
            점이 이 데모의 가장 큰 차별점입니다.
          </P>
        </Section>

        {/* KB EXTRACT */}
        <Section id="kb-extract" title="비정형 데이터 처리" icon={FileSearch}>
          <SubBadge>RFP 4-4 ②</SubBadge>
          <P>
            미팅록·이메일 같은 비정형 텍스트를 어떻게 AI가 활용할 수 있는 형태로 변환하는지
            <Strong> 7단계 파이프라인</Strong>으로 시각화한 페이지입니다.
          </P>
          <H3>사용법</H3>
          <Steps>
            <Step n={1} title="좌측 텍스트박스">
              샘플 미팅록이 이미 들어 있습니다. 직접 수정하거나 새로운 미팅록을 붙여넣어도 됩니다.
            </Step>
            <Step n={2} title="[파이프라인 실행]">
              7단계가 좌측에 차례로 ✓ 표시되고, 우측에 결과가 쌓입니다.
            </Step>
            <Step n={3} title="결과 패널 확인">
              <UL>
                <li><Strong>구조화 JSON</Strong> — 참석자·토픽·액션·예산 시그널이 자동 추출됨</li>
                <li><Strong>엔티티 링킹</Strong> — 참석자/회사명을 CMID로 매칭</li>
                <li><Strong>PII 마스킹</Strong> — 휴대폰·이메일·계좌가 마스킹된 본문</li>
                <li><Strong>청크 & 임베딩</Strong> — Voyage 1024d 벡터화 결과 (mock)</li>
              </UL>
            </Step>
          </Steps>
          <Callout tone="warning">
            샘플 텍스트의 휴대폰 번호 <Code>010-1234-9921</Code>이 <Code>010-XXXX-9921</Code>로
            마스킹되는 걸 보여주면 좋습니다. 원본은 별도 보호 버킷에 저장되고, 인덱스/임베딩은
            마스킹본을 사용한다는 점이 핵심.
          </Callout>
        </Section>

        {/* KB RULES */}
        <Section id="kb-rules" title="룰 엔진 연계" icon={Network}>
          <SubBadge>RFP 4-4 ③</SubBadge>
          <P>
            DMN-style YAML로 정의된 비즈니스 룰이 어떻게 KB의 데이터를 안전하게 조회해서 결정을
            내리고, 그 결과를 다시 KB에 돌려쓰는지 보여줍니다.
          </P>
          <H3>사용법</H3>
          <Steps>
            <Step n={1} title="좌측에서 룰 선택">
              "광고주 등급 자동 분류"를 클릭. YAML 본문이 우측 아래에 펼쳐집니다.
            </Step>
            <Step n={2} title="중앙에서 광고주 선택 → [실행]">
              예) 삼성전자 선택. 우측에 다음 4가지가 나옵니다:
              <UL>
                <li><Strong>Inputs</Strong> — KB에서 자동으로 조회된 budget·revenue·rel_score 등</li>
                <li><Strong>Decision Path</Strong> — 어떤 if 조건이 매칭됐는지 라인 단위로 강조</li>
                <li><Strong>Decision</Strong> — <Code>customer_tier: A</Code> 같은 출력 결과</li>
                <li><Strong>Outputs</Strong> — 어디에 어떻게 적용됐는지 (현재는 dry-run)</li>
              </UL>
            </Step>
            <Step n={3} title="[시뮬레이션] 클릭">
              현재 YAML을 전체 22개 광고주에 dry-run 적용. Tier A/B/C/D 분포와 변경되는 광고주 리스트가
              나옵니다. YAML의 임계값(예: <Code>5_000_000_000</Code>)을 살짝 바꾼 뒤 다시 시뮬레이션하면
              <Strong> 영향이 즉시 미리보기</Strong>됩니다.
            </Step>
          </Steps>
          <Callout tone="success">
            안전한 평가기를 직접 구현했기 때문에 <Code>eval()</Code> 사용 없이 비교/산술/논리 연산만
            허용합니다. 함수 호출이나 객체 리터럴은 차단되며, 시뮬레이션은 절대 KB를 변경하지 않습니다.
          </Callout>
        </Section>

        {/* KB 360 */}
        <Section id="kb-360" title="광고주 360 뷰" icon={Target}>
          <P>
            매칭·추출·룰을 거쳐서 만들어진 최종 산출물입니다. 한 광고주의 모든 데이터가 출처와 함께
            한 화면에 모이는 모습을 보여주세요.
          </P>
          <Steps>
            <Step n={1} title="삼성전자 카드 클릭">
              <Code>/accounts</Code>에서 삼성전자를 클릭하거나, 좌측 메뉴 "광고주 360" → 삼성전자.
            </Step>
            <Step n={2} title="별칭·외부 ID 카드 확인">
              5개 별칭 (한·영문, 브랜드) + 4개 외부 ID (SFDC, Sheet 2건, DART)가 어떻게 연결됐는지
              한눈에 보입니다.
            </Step>
            <Step n={3} title="활동 타임라인">
              각 활동에 <Strong>출처 칩</Strong> (Drive · Gmail · Sheet)이 붙어 있어, 어디서 온
              데이터인지 즉시 식별 가능합니다.
            </Step>
          </Steps>
        </Section>

        {/* AGENT DASHBOARD */}
        <Section id="agent-dash" title="Agent 대시보드" icon={Sparkles}>
          <P>
            세일즈 매니저가 매일 아침 가장 먼저 보게 될 화면입니다. Max Summit 행사 D-Day, 이번 주 KPI,
            Lead Stage 칸반, 보류 액션 3가지가 한눈에 정리됩니다.
          </P>
          <Callout tone="info">
            "응답 없는 초청", "장기 무접점 고가치", "미배정 A등급" 세 가지 카드는 룰 엔진이 자동으로
            매일 04:00 KST에 산정해서 큐에 넣어준 것입니다. 카드의 광고주명을 클릭하면 360 뷰로 이동.
          </Callout>
        </Section>

        {/* AGENT RECOMMEND */}
        <Section id="agent-recommend" title="추천 워크플로" icon={Target}>
          <P>
            세일즈 담당자가 구조화된 니즈를 입력하면 Agent가 후보 탐색 → 우선순위 산정 → 추천 사유
            → 매칭 세션/상품 → 접근 전략 → 메시지 초안을 한 번에 만들어줍니다.
          </P>
          <Steps>
            <Step n={1} title="목적 선택">
              "초청 대상 발굴 (Max Summit)" — 데모에선 이게 가장 자연스러워요.
            </Step>
            <Step n={2} title="필터">
              산업군 "Game" 토글 + 관심 주제 "CTV" 토글.
            </Step>
            <Step n={3} title="[추천 실행]">
              우측에 추천 카드들이 점수 순으로 나옵니다. 카드를 클릭하면 사유·세션·전략이 펼쳐져요.
            </Step>
            <Step n={4} title="[초청 메일 초안]">
              상단 우측의 버튼으로 그 자리에서 메시지 초안 페이지로 이동. 광고주·세션이 자동 전달됩니다.
            </Step>
          </Steps>
        </Section>

        {/* AGENT MESSAGE */}
        <Section id="agent-message" title="메시지 초안" icon={MessagesSquare}>
          <P>
            초청·제안·리마인드·팔로업·행사 후 다섯 가지 용도별로 한국어 메시지 초안이 자동 생성됩니다.
            사용자가 검토·수정 후 Gmail Deep-link로 직접 발송하는 <Strong>HITL 구조</Strong>예요.
          </P>
          <Steps>
            <Step n={1} title="좌측에서 광고주·용도·톤 선택" />
            <Step n={2} title="[AI로 초안 생성]">
              우측에 제목·본문이 펼쳐집니다. 자유롭게 수정 가능.
            </Step>
            <Step n={3} title="[승인 요청] → [매니저 승인]">
              승인 흐름이 좌측 카드에 시각화됩니다. 데모이므로 한 사용자가 양쪽 모두 클릭 가능.
            </Step>
            <Step n={4} title="[Gmail에서 열기]">
              Gmail Compose 화면이 새 탭에서 열리고, 제목·본문이 미리 채워진 상태입니다.
            </Step>
          </Steps>
        </Section>

        {/* AGENT ACTIONS */}
        <Section id="agent-actions" title="액션 큐" icon={ListChecks}>
          <P>
            룰이 KB 상태를 매일 스캔해서 자동으로 만들어낸 &ldquo;다음에 해야 할 일&rdquo; 리스트입니다.
          </P>
          <UL>
            <li>초청 후 7일 무응답 → 리마인드</li>
            <li>고가치 무접점 → 재컨택</li>
            <li>A등급 미배정 → 담당자 배정</li>
            <li>참석 확정 후 미팅 미설정 → 미팅 제안</li>
          </UL>
        </Section>

        {/* DQ */}
        <Section id="gov-dq" title="데이터 품질 모니터" icon={ShieldCheck}>
          <P>
            Great Expectations 스타일로 source/silver/gold 각 계층에 expectation suite를 배치합니다.
            현재 데모에는 2개 suite가 적재되어 있어요.
          </P>
        </Section>

        {/* MDM */}
        <Section id="gov-mdm" title="MDM 리뷰 큐" icon={GitMerge}>
          <P>
            확률적 매칭(Tier 3)이 자동 병합 임계(0.92) 아래로 떨어진 후보들을 운영자가 직접 보고
            병합·분리·보류를 결정하는 화면입니다.
          </P>
          <Callout tone="warning">
            현재 데모에서는 병합 버튼이 비활성화되어 있습니다. 실제 운영 환경에서는 30일 grace
            unmerge가 적용되어 잘못된 병합도 되돌릴 수 있습니다.
          </Callout>
        </Section>

        {/* AUDIT */}
        <Section id="gov-audit" title="감사 로그" icon={Book}>
          <P>
            룰 엔진의 모든 단건 실행은 자동으로 이 페이지에 기록됩니다. inputs / decision / outputs
            전체 스냅샷이 보관되어, 어떤 의사결정이 언제·어떤 데이터를 기준으로 내려졌는지 완전히
            재현 가능해요.
          </P>
          <Callout tone="info">
            <Strong>dry-run</Strong> 배지가 붙은 항목은 실제 KB에 적용되지 않은 시연 실행입니다.
            시뮬레이션(전체 영향 평가)은 로그 spam을 막기 위해 기록하지 않습니다.
          </Callout>
        </Section>

        {/* RESET */}
        <Section id="ops-reset" title="데이터 초기화" icon={Database}>
          <P>
            시연 중 데이터가 변경되어 원래대로 되돌리고 싶다면 터미널에서 시드를 다시 실행하세요.
          </P>
          <CodeBlock>{`# 프로젝트 루트에서
npx prisma db push --force-reset --accept-data-loss
npx tsx prisma/seed.ts`}</CodeBlock>
          <P>
            또는 npm 스크립트로:
          </P>
          <CodeBlock>{`npm run db:reset`}</CodeBlock>
        </Section>

        {/* FAQ */}
        <Section id="faq" title="자주 묻는 질문" icon={Info}>
          <Faq q="이 데모는 인터넷 없이도 작동하나요?">
            네, LLM 호출이 mock이므로 외부 API 키나 인터넷이 없어도 모든 기능이 동작합니다.
            (한글 폰트만 Pretendard CDN을 쓰지만, 끊겨도 시스템 폰트로 fallback됩니다.)
          </Faq>
          <Faq q="실제 운영 환경으로 가려면 뭘 바꿔야 하나요?">
            DB를 PostgreSQL + pgvector로 교체하고, Mock LLM 함수를 Claude / Voyage 호출로 바꾸면 됩니다.
            나머지 비즈니스 로직은 그대로 유지됩니다. README의 6번 표 참고.
          </Faq>
          <Faq q="시연 중 가장 좋은 시작 화면은?">
            <Strong>홈</Strong>에서 시작하는 걸 권장합니다. KPI 한 줄을 가리키며 "이미 22개 광고주가
            통합되어 있다"를 짚어주신 뒤, 가운데 RFP 카드 3개로 자연스럽게 넘어갑니다.
          </Faq>
          <Faq q="DB를 직접 보고 싶어요">
            <Code>npx prisma studio</Code>를 실행하면 브라우저에서 28개 테이블을 GUI로 탐색할 수 있습니다.
          </Faq>
          <Faq q="시연 중 룰 YAML을 망가뜨렸어요">
            걱정 마세요. YAML 카드 우측 상단 <Strong>[되돌리기]</Strong> 버튼이 원본 YAML을 복원합니다.
          </Faq>
        </Section>

        <div className="mt-16 mb-8 pt-6 border-t border-[color:var(--color-border)] text-xs text-[color:var(--color-muted-foreground)] flex items-center justify-between">
          <span>가이드북 v0.1 · 모비데이즈 AI Demo</span>
          <Link href="/" className="hover:underline">홈으로 돌아가기 →</Link>
        </div>
      </article>

      {/* RIGHT — Mini on-this-page nav (xl only) */}
      <aside className="hidden xl:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
        <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-2 flex items-center gap-1">
          <ChevronRight className="size-3" /> 이 페이지에서
        </div>
        <ul className="space-y-1 text-xs">
          {TOC.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "block py-0.5 border-l-2 pl-2 transition",
                  active === s.id
                    ? "border-[color:var(--color-brand-lime)] text-[color:var(--color-foreground)] font-medium"
                    : "border-transparent text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]",
                )}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

// =========================================================
// Mini typographic primitives — minimal but consistent
// =========================================================

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-2 flex items-center gap-1.5">
      <Lightbulb className="size-3" /> {children}
    </div>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight leading-tight">
      {children}
    </h1>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-muted-foreground)]">
      {children}
    </p>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="text-xl lg:text-[22px] font-semibold tracking-tight flex items-center gap-2 mb-3 pb-2 border-b border-[color:var(--color-border)]">
        <Icon className="size-5 text-[color:var(--color-brand-ink)]" />
        {title}
      </h2>
      <div className="space-y-3 text-[14px] leading-relaxed text-[color:var(--color-foreground)]/85">
        {children}
      </div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-tight mt-5 mb-1 text-[color:var(--color-foreground)]">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-[color:var(--color-foreground)]">{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-[color:var(--color-muted)] text-[color:var(--color-foreground)] px-1.5 py-0.5 rounded text-[12px] font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-[color:var(--color-brand-ink)] text-white px-4 py-3 rounded-md text-[12px] font-mono leading-relaxed overflow-x-auto scrollbar-thin my-2">
      {children}
    </pre>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside ml-1 space-y-1 my-1">{children}</ul>;
}

function SubBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[color:var(--color-brand-lime)] text-[color:var(--color-brand-ink)] px-2 py-0.5 rounded text-[11px] font-semibold tracking-tight mb-2">
      {children}
    </span>
  );
}

function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const icon =
    tone === "warning" ? <AlertTriangle className="size-4 mt-0.5 shrink-0" /> :
    tone === "success" ? <CheckCircle2 className="size-4 mt-0.5 shrink-0" /> :
    <Info className="size-4 mt-0.5 shrink-0" />;
  const bg =
    tone === "warning" ? "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)] border-[color:var(--color-warning)]/30" :
    tone === "success" ? "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)] border-[color:var(--color-success)]/30" :
    "bg-[color:var(--color-info-bg)] text-[color:var(--color-info)] border-[color:var(--color-info)]/30";
  return (
    <div className={cn("flex gap-2 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed my-3", bg)}>
      {icon}
      <div className="flex-1 [&_strong]:text-current">{children}</div>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-3 my-3">{children}</ol>;
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 size-7 rounded-full bg-[color:var(--color-brand-ink)] text-[color:var(--color-brand-lime)] flex items-center justify-center text-[12px] font-bold">
        {n}
      </span>
      <div className="flex-1 pt-0.5">
        <div className="font-medium text-[color:var(--color-foreground)]">{title}</div>
        {children && (
          <div className="mt-1 text-[13px] text-[color:var(--color-foreground)]/80 leading-relaxed">
            {children}
          </div>
        )}
      </div>
    </li>
  );
}

function FlowTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] overflow-hidden my-3">
      <table className="w-full text-[13px]">
        <thead className="bg-[color:var(--color-muted)]">
          <tr className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            <th className="px-3 py-2 text-left w-16">시간</th>
            <th className="px-3 py-2 text-left w-44">페이지</th>
            <th className="px-3 py-2 text-left">강조 포인트</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([t, p, d], i) => (
            <tr key={i} className="border-t border-[color:var(--color-border)]">
              <td className="px-3 py-2 tabular-nums font-mono text-[12px] text-[color:var(--color-muted-foreground)]">{t}</td>
              <td className="px-3 py-2 font-mono text-[12px]">{p}</td>
              <td className="px-3 py-2">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Grid({
  cols,
  children,
}: {
  cols: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid gap-2 my-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium">{label}</div>
      <div className="text-xl font-semibold tabular-nums tracking-tight mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-[color:var(--color-muted-foreground)] mt-0.5">{hint}</div>}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-[color:var(--color-border)] my-2 group">
      <summary className="cursor-pointer list-none p-3 flex items-center justify-between gap-2 text-[14px] font-medium hover:bg-[color:var(--color-muted)]/50 transition">
        <span>{q}</span>
        <ChevronRight className="size-4 text-[color:var(--color-muted-foreground)] group-open:rotate-90 transition-transform" />
      </summary>
      <div className="px-3 pb-3 text-[13px] text-[color:var(--color-foreground)]/85 leading-relaxed">
        {children}
      </div>
    </details>
  );
}
