# Mobidays AI Demo — Sales KB & Agent

> 모비데이즈 RFP(AI Agent / Knowledge Base) 응답용 통합 PoC 데모.
> Next.js 16 + TypeScript + Prisma + SQLite + Tailwind v4 + shadcn-style UI 스택.

본 데모는 RFP 4-4의 **3개 기술 검증 과제**(통합 ID, 비정형 처리, 룰 엔진 연계)와
**Sales Solution Agent 워크플로**(추천 → 메시지 → 액션)를 한 앱 안에서 라이브 시연합니다.

---

## 0. 한 화면 미리보기

| 영역 | 경로 | 핵심 시연 포인트 |
|---|---|---|
| 홈 | `/` | 데모 진입 + KPI + 5계층 아키텍처 |
| KB 개요 | `/kb` | Bronze → Gold → AI-Ready 흐름 |
| 통합 ID 매칭 (RFP 4-4 ①) | `/kb/match` | Tier 1/2/3 라이브 매칭 + 피처 기여도 시각화 |
| 비정형 처리 (RFP 4-4 ②) | `/kb/extract` | 7단계 파이프라인 시연, JSON·청크·임베딩·PII |
| 룰 엔진 (RFP 4-4 ③) | `/kb/rules` | YAML 빌더 + 단건 실행 + 영향 시뮬레이션 |
| 광고주 360 | `/accounts/[cmid]` | 분산 데이터 통합 + 출처 칩 + lineage |
| Agent 대시보드 | `/agent` | D-Day, KPI, Lead 칸반, 보류 액션 |
| 추천 워크플로 | `/agent/recommend` | 구조화 니즈 → 후보 + 사유 + 매칭 + 전략 |
| 메시지 초안 | `/agent/messages` | 초청/제안/팔로업 초안 + HITL + Gmail 발송 |
| 액션 큐 | `/agent/actions` | 룰 기반 자동 생성된 다음 액션 |
| 거버넌스 | `/admin/*` | DQ · MDM 리뷰 · 감사 로그 |

---

## 1. 빠른 실행 (5분)

```bash
cd mobidays-demo
npm install
npx prisma db push                  # 스키마 적용
npx tsx prisma/seed.ts              # 시드 데이터 적재
npm run dev                         # http://localhost:3000
```

이후 시드를 초기화하고 싶다면:

```bash
npx prisma db push --force-reset --accept-data-loss
npx tsx prisma/seed.ts
```

> 환경 변수 없음 — 모든 LLM 호출은 **결정론적 mock**으로 대체됩니다. 외부 API 키 불필요.

---

## 2. 추천 시연 동선 (5분 라이브 데모)

1. **홈 (30s)** — 22개 광고주, 7개 미팅록, 3개 룰이 적재된 데모 환경 안내.
2. **`/kb/match` (90s)** — "삼성전자" 4가지 표기를 Tier 1 → 2 → 3 순으로 매칭. `삼성공구사` 케이스로 사촌 법인 분리 검증.
3. **`/kb/extract` (75s)** — 미팅록 한 건 붙여넣고 [파이프라인 실행]. PII 마스킹·구조 추출·청크·임베딩이 7단계로 시각화.
4. **`/kb/rules` (75s)** — `customer_tier_v1.yaml` 선택 → 삼성전자에 단건 실행 (Tier A 도출). YAML 일부 수정 후 시뮬레이션 → 영향받는 광고주 수 변화 미리보기.
5. **`/accounts/mb_acc_samsung` (45s)** — 통합된 광고주 360 뷰: 별칭, SF·Sheet·Drive 출처 칩, 활동 타임라인, lineage.
6. **`/agent/recommend` (45s)** — `초청 대상 발굴` + `Game` + `CTV`로 추천 실행 → 상위 후보 추천 사유 + 매칭 세션/상품 + 접근 전략.

---

## 3. 디렉터리 구조

```
mobidays-demo/
├── prisma/
│   ├── schema.prisma           # KB canonical · MDM · rules · agent 17개 모델
│   ├── seed.ts                 # 분산/중복 시나리오를 포함한 시드
│   └── dev.db                  # SQLite (gitignored 권장)
├── src/
│   ├── app/
│   │   ├── page.tsx            # 홈
│   │   ├── kb/                 # /kb, /kb/match, /kb/extract, /kb/rules
│   │   ├── accounts/           # 광고주 리스트 + 360
│   │   ├── agent/              # 대시보드 · 추천 · 메시지 · 액션
│   │   ├── admin/              # DQ · MDM · 감사 · 시드
│   │   └── api/                # match · extract · rules · recommend · draft
│   ├── components/
│   │   ├── layout/app-shell.tsx
│   │   └── ui/                 # Button · Card · Badge · Stat · SourceTag · ...
│   └── lib/
│       ├── mdm/                # normalize · similarity · match (Tier 1/2/3)
│       ├── rules/              # ast (safe eval) · engine (resolve+evaluate)
│       ├── extract/            # pii · chunk · extract-mock
│       ├── agent/              # recommend · message draft
│       ├── db.ts               # Prisma client
│       └── utils.ts            # cn, fmtKrw, relTime, ...
```

---

## 4. 핵심 알고리즘 요약

### 4.1 통합 ID 매칭 (`src/lib/mdm/match.ts`)

```
Tier 1 — 결정론적 강한 키
  ↳ business_no / dart_corp_code / corporate_no 완전 일치 → conf 0.99 자동 병합

Tier 2 — 결정론적 약한 키
  ↳ 정규화 이름 + 도메인 동시 일치 → conf 0.95
  ↳ 별칭 사전(부분 포함) + 도메인 → conf 0.93
  ↳ 정규화 이름 단일 매칭 (도메인 없음) → conf 0.90

Tier 3 — 확률적 매칭
  blocking (도메인 / 이름 prefix / 산업)
  → 피처 가중합: name_token(0.25) + name_sim(0.20) + domain(0.15)
                + address(0.10) + industry(0.10) + alias(0.10) + contact(0.10)
  → ≥ 0.92 자동 / 0.75~0.92 review_queue / < 0.75 new
```

이름 유사도는 ① token_sort_ratio ② 한글 자모 분해 후 Levenshtein ③ 정규화 후 Levenshtein
세 가지의 **best-of**를 사용. 사업자번호가 다르면 동일 이름이라도 즉시 분리됩니다.

### 4.2 룰 엔진 (`src/lib/rules/engine.ts` + `ast.ts`)

- **DMN-style YAML** → js-yaml + zod로 파싱·검증
- **안전한 AST 평가기** (~250 LoC) — `eval()` 사용 금지. 허용 연산자: 비교/산술/논리/멤버 접근. 함수 호출·할당·객체 리터럴 금지.
- **Input Resolver** — `source` 경로는 화이트리스트(`canonical.accounts.*`)만, `expr`은 사전 정의된 selector (`proposals.count(12_months)`, `days_since_last_touch` 등)
- **Decision Table** — priority hit policy. trail에 매칭된 if문 기록.
- **Output Dispatcher** — `requires_approval` 시 HITL 큐, 아니면 즉시 KB write. 모든 실행이 `RuleExecution`에 inputs/decision/outputs 스냅샷과 함께 영속화.

### 4.3 비정형 데이터 처리 (`src/lib/extract/`)

7단계 파이프라인:
1. **파싱** — 마크다운 정리, 헤더/푸터 제거
2. **PII 마스킹** — regex 우선, 4종(email/phone/rrn/card) + 계좌. 원본 별도 보관.
3. **구조 추출** — Claude Tool Use 가정한 결정론적 mock (`extract-mock.ts`). 회사·참석자·토픽·액션·예산 시그널 등 11개 필드.
4. **엔티티 링킹** — 참석자/회사 → CMID/PMID. 미매칭 시 review_queue.
5. **Semantic chunking** — 마크다운 헤더 우선 분할 + 800±200자 윈도우 + 80자 overlap.
6. **임베딩** — `voyage-multilingual-2` (1024d) 호출 시뮬레이션.
7. **인덱싱** — `documents` + `doc_chunks` 영속화.

---

## 5. 데이터 모델 하이라이트

| 테이블 | 목적 |
|---|---|
| `Account` (CMID) | Golden Record. 별칭/외부ID/연락처/활동/제안/비딩/관계점수와 연결. |
| `AccountAlias` | 한글-영문, legal/brand/historical 분류 별칭 사전. |
| `AccountExternalId` | SF / Sheet / DART / Drive 등 원본 시스템 ID 매핑. |
| `Document` + `DocChunk` | 비정형 원문 + 청크 + 임베딩 메타. |
| `RuleDefinition` + `RuleExecution` | YAML 룰 정의 + 실행 스냅샷 (재현 가능). |
| `MdmCandidate` + `MdmMergeLog` | Tier 3 리뷰 큐 + 30일 grace unmerge. |
| `AgentRequest` + `Recommendation` + `Message` + `ActionItem` | Agent 워크플로 산출물. |
| `DqRun` | Great Expectations 스타일 결과 스냅샷. |

---

## 6. 실 운영 이관 시 변경 사항

| 영역 | 현재 (데모) | 운영 |
|---|---|---|
| DB | SQLite | PostgreSQL 16 + pgvector + RLS |
| ORM | Prisma 6 | 동일 (어댑터만 변경) |
| 벡터 검색 | 메모리 코사인 | pgvector HNSW + RRF |
| LLM | Mock 함수 (결정론적) | Claude Sonnet 4.6 (구조 추출), Haiku 4.5 (PII) |
| 임베딩 | Mock 메타만 | Voyage `voyage-multilingual-2` |
| Salesforce / Sheets / Drive | 시드 JSON | Dagster CDC asset graph |
| 룰 엔진 | YAML + AST | 동일 + PR 기반 4-eyes 승인 |
| 인증 | 없음 | Google Workspace OAuth + tenant-aware RLS |
| MCP Server | (없음) | Anthropic MCP — kb.search_accounts, kb.get_card, kb.compute_rule |

---

## 7. Vercel 배포 안내

본 데모는 로컬 SQLite를 사용하므로, Vercel 배포 시에는 다음 변경이 필요합니다:

1. `prisma/schema.prisma` datasource를 PostgreSQL로 변경.
2. Vercel 환경 변수 `DATABASE_URL` 추가 (Neon / Supabase / Turso libSQL 등).
3. `package.json`에 `postinstall: prisma generate` 추가.
4. `vercel.json`에서 API 라우트 `maxDuration` 설정.

`npm run build`로 프로덕션 빌드가 통과하는 것은 이미 확인되어 있습니다.

---

## 8. 한계 + 안내

- 모든 LLM 호출은 mock이므로, 사전에 학습되지 않은 미팅록은 추출 품질이 낮습니다 (시드 7건은 풍부한 결과를 보여줍니다).
- 매칭 ML 스코어러는 휴리스틱 가중치만 사용. 실 환경에서는 `recordlinkage` 또는 LightGBM 기반 학습 모델로 교체 권장.
- 인증·권한 시연 없음. RLS는 운영 이관 시 적용.
- 모든 데이터는 가짜이며 실제 광고주 정보와 무관합니다.

---

## 9. 빠른 트러블슈팅

| 증상 | 해결 |
|---|---|
| `prisma db push` 실패 | Node.js 20.9+ 사용 확인. `rm -rf node_modules && npm install` 시도. |
| 시드 후 `/kb/match`에서 매칭 없음 | `npx tsx prisma/seed.ts`가 정상 종료됐는지 확인 (마지막 줄에 `Seed complete`). |
| 페이지가 한글 폰트 깨짐 | 인터넷 연결 확인 (Pretendard CDN 로드). 오프라인이면 시스템 폰트로 대체됨. |
| Hot reload가 라이브러리 변경 반영 못함 | `pkill -f "next dev" && npm run dev`로 재시작. |

---

## 10. 라이선스

내부 PoC 데모용 비공개 코드. 외부 공유 전 NDA 확인 필요.
