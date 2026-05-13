// Rule engine (RFP Task 3 core).
//   Parses DMN-style YAML rule definitions, resolves inputs from KB,
//   evaluates the decision table, optionally dispatches outputs to the DB.

import yaml from "js-yaml";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { evalCondition, evalSafe } from "@/lib/rules/ast";

const RuleInputSchema = z
  .object({
    alias: z.string(),
    source: z.string().optional(),
    expr: z.string().optional(),
    default: z.unknown().optional(),
  })
  .refine((v) => Boolean(v.source) !== Boolean(v.expr) || v.default !== undefined, {
    message: "input must have either source or expr (or default)",
  });

const RuleCaseSchema = z.union([
  z.object({
    if: z.string(),
    then: z.record(z.string(), z.unknown()),
  }),
  z.object({
    else: z.object({ then: z.record(z.string(), z.unknown()) }),
  }),
]);

const RuleOutputSchema = z.object({
  write: z.string().optional(),
  emit_event: z.string().optional(),
  when: z.string().optional(),
  requires_approval: z.boolean().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  via: z.string().optional(),
  note: z.string().optional(),
});

export const RuleDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number().int().default(1),
  status: z.string().default("active"),
  description: z.string().optional(),
  owner_team: z.string().optional(),
  trigger: z.unknown().optional(),
  inputs: z.array(RuleInputSchema),
  logic: z.object({
    type: z.string().default("decision_table"),
    hit_policy: z.string().default("priority"),
    rules: z.array(RuleCaseSchema),
  }),
  outputs: z.array(RuleOutputSchema).default([]),
  sla: z.unknown().optional(),
  exceptions: z.array(z.unknown()).optional(),
  audit: z.unknown().optional(),
});

export type RuleDef = z.infer<typeof RuleDefSchema>;

export function parseRule(yamlText: string): RuleDef {
  const obj = yaml.load(yamlText);
  return RuleDefSchema.parse(obj);
}

// ---- Input resolution ----
// Allowed `source` dot-paths map to KB columns / derived selectors.
// `expr` selectors are predefined named helpers, NOT generic SQL.

export interface RuleContext {
  cmid: string;
  account?: AccountSnapshot;
}

export interface AccountSnapshot {
  cmid: string;
  canonicalName: string;
  industryLabel: string | null;
  customerTier: string | null;
  marketingBudgetKrw: bigint | null;
  annualRevenueKrw: bigint | null;
  relationshipScore: number | null;
  lastTouchedAt: Date | null;
  leadStage: string | null;
}

export async function loadAccountContext(cmid: string): Promise<AccountSnapshot | null> {
  const a = await prisma.account.findUnique({
    where: { cmid },
    select: {
      cmid: true,
      canonicalName: true,
      industryLabel: true,
      customerTier: true,
      marketingBudgetKrw: true,
      annualRevenueKrw: true,
      relationshipScore: true,
      lastTouchedAt: true,
      leadStage: true,
    },
  });
  return a;
}

export async function resolveInputs(
  rule: RuleDef,
  ctx: RuleContext,
): Promise<Record<string, unknown>> {
  const account =
    ctx.account ?? (await loadAccountContext(ctx.cmid)) ?? undefined;

  const out: Record<string, unknown> = {};
  for (const input of rule.inputs) {
    let value: unknown = null;
    if (input.source) {
      value = readSource(input.source, account);
    } else if (input.expr) {
      value = await execNamedExpr(input.expr, ctx);
    }
    if (value == null && input.default !== undefined) value = input.default;
    out[input.alias] = value;
  }
  return out;
}

function readSource(path: string, a: AccountSnapshot | undefined): unknown {
  if (!a) return null;
  // Allow "canonical.accounts.X" or "accounts.X" or bare "X"
  const cleaned = path.replace(/^canonical\./, "").replace(/^accounts\./, "");
  switch (cleaned) {
    case "marketing_budget_krw":
      return a.marketingBudgetKrw != null ? Number(a.marketingBudgetKrw) : 0;
    case "annual_revenue_krw":
      return a.annualRevenueKrw != null ? Number(a.annualRevenueKrw) : 0;
    case "industry_label":
      return a.industryLabel;
    case "customer_tier":
      return a.customerTier;
    case "lead_stage":
      return a.leadStage;
    case "last_touched_at":
      return a.lastTouchedAt;
    case "relationship_scores.latest.score":
    case "relationship_score":
      return a.relationshipScore ?? 0;
    case "canonical_name":
      return a.canonicalName;
  }
  return null;
}

async function execNamedExpr(expr: string, ctx: RuleContext): Promise<unknown> {
  // Pre-defined helpers — sandbox.
  const trimmed = expr.replace(/\s+/g, " ").trim();
  if (/proposals\.count\b.*12.?months/i.test(trimmed)) {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    return prisma.proposal.count({
      where: { cmid: ctx.cmid, submittedAt: { gte: since } },
    });
  }
  if (/activities\.count\b.*90.?days/i.test(trimmed)) {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    return prisma.activity.count({
      where: { cmid: ctx.cmid, occurredAt: { gte: since } },
    });
  }
  if (/days_since_last_touch/i.test(trimmed)) {
    const a = await prisma.account.findUnique({
      where: { cmid: ctx.cmid },
      select: { lastTouchedAt: true },
    });
    if (!a?.lastTouchedAt) return null;
    return Math.floor(
      (Date.now() - a.lastTouchedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
  if (/bidding_score/i.test(trimmed)) {
    const b = await prisma.bidding.findFirst({
      where: { cmid: ctx.cmid },
      orderBy: { issuedAt: "desc" },
    });
    return b?.decisionScore ?? null;
  }
  return null;
}

// ---- Decision table evaluation ----
export interface RuleTrailEntry {
  if?: string;
  else?: boolean;
  matched: boolean;
  then?: Record<string, unknown>;
}

export interface RuleEvalResult {
  decision: Record<string, unknown> | null;
  trail: RuleTrailEntry[];
  inputs: Record<string, unknown>;
}

export function evalDecisionTable(
  rule: RuleDef,
  inputs: Record<string, unknown>,
): RuleEvalResult {
  const trail: RuleTrailEntry[] = [];
  for (const c of rule.logic.rules) {
    if ("if" in c) {
      let matched = false;
      try {
        matched = evalCondition(c.if, inputs);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        trail.push({ if: c.if, matched: false });
        throw new Error(`Condition failed: ${c.if} — ${msg}`);
      }
      trail.push({ if: c.if, matched, then: matched ? c.then : undefined });
      if (matched) {
        return { decision: c.then, trail, inputs };
      }
    } else if ("else" in c) {
      trail.push({ else: true, matched: true, then: c.else.then });
      return { decision: c.else.then, trail, inputs };
    }
  }
  return { decision: null, trail, inputs };
}

// ---- Top-level run ----

export interface RuleRunOptions {
  trigger: "api" | "simulate" | "event" | "cron";
  dryRun?: boolean; // simulate writes
  applyOutputs?: boolean;
}

export interface RuleRunRecord {
  executionId: string;
  ruleId: string;
  ruleVersion: number;
  cmid: string;
  inputs: Record<string, unknown>;
  decision: Record<string, unknown> | null;
  trail: RuleTrailEntry[];
  outputs: Array<{
    target?: string;
    before?: unknown;
    after?: unknown;
    applied: boolean;
    reason?: string;
  }>;
  status: "ok" | "skipped" | "failed";
  error?: string;
  latencyMs: number;
}

export async function runRule(
  ruleYaml: string,
  ctx: RuleContext,
  opts: RuleRunOptions,
): Promise<RuleRunRecord> {
  const started = Date.now();
  const execId = `exec_${started.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  try {
    const rule = parseRule(ruleYaml);
    const inputs = await resolveInputs(rule, ctx);
    const { decision, trail } = evalDecisionTable(rule, inputs);

    const outputs: RuleRunRecord["outputs"] = [];
    if (decision && (opts.applyOutputs ?? !opts.dryRun)) {
      for (const out of rule.outputs) {
        if (out.when) {
          const ok = evalCondition(out.when, { ...decision, ...inputs });
          if (!ok) {
            outputs.push({
              target: out.write,
              applied: false,
              reason: `when 조건 미충족: ${out.when}`,
            });
            continue;
          }
        }
        if (out.requires_approval) {
          outputs.push({
            target: out.write,
            applied: false,
            reason: "승인 필요 → pending_approval 큐에 적재 (PoC: 미적용)",
          });
          continue;
        }
        if (out.write) {
          const path = out.write.replace(/^canonical\./, "").replace(/^accounts\./, "");
          const decisionValue = pickValueForWrite(path, decision);
          if (decisionValue === undefined) {
            outputs.push({
              target: out.write,
              applied: false,
              reason: `decision에 ${path} 키 없음`,
            });
            continue;
          }
          const before = await readAccountField(ctx.cmid, path);
          if (!opts.dryRun) {
            await writeAccountField(ctx.cmid, path, decisionValue);
          }
          outputs.push({
            target: out.write,
            before,
            after: decisionValue,
            applied: !opts.dryRun,
            reason: opts.dryRun ? "dryRun" : undefined,
          });
        } else if (out.emit_event) {
          outputs.push({
            target: `event:${out.emit_event}`,
            after: out.payload,
            applied: !opts.dryRun,
          });
        }
      }
    }

    const latencyMs = Date.now() - started;
    // Persist execution record (skip simulations to avoid audit log spam).
    // Single-rule executions are always audited — even dry-runs — because
    // they represent intentional operator actions that need traceability.
    if (opts.trigger !== "simulate") {
      await prisma.ruleExecution
        .create({
          data: {
            id: execId,
            ruleId: rule.id,
            ruleVersion: rule.version,
            trigger: opts.trigger,
            triggerPayloadJson: JSON.stringify({ cmid: ctx.cmid, dryRun: !!opts.dryRun }),
            inputsSnapshotJson: JSON.stringify(inputs, jsonReplacer),
            decisionJson: JSON.stringify(decision),
            outputsJson: JSON.stringify(outputs, jsonReplacer),
            status: "ok",
            startedAt: new Date(started),
            endedAt: new Date(),
            latencyMs,
          },
        })
        .catch(() => null);
    }

    return {
      executionId: execId,
      ruleId: rule.id,
      ruleVersion: rule.version,
      cmid: ctx.cmid,
      inputs,
      decision,
      trail,
      outputs,
      status: "ok",
      latencyMs,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const latencyMs = Date.now() - started;
    return {
      executionId: execId,
      ruleId: "(parse-error)",
      ruleVersion: 0,
      cmid: ctx.cmid,
      inputs: {},
      decision: null,
      trail: [],
      outputs: [],
      status: "failed",
      error: msg,
      latencyMs,
    };
  }
}

function pickValueForWrite(
  path: string,
  decision: Record<string, unknown>,
): unknown {
  // The 'write' target like 'accounts.customer_tier' picks the matching key in decision.
  const key = path.split(".").pop()!;
  // Common renames between snake_case keys and camelCase columns.
  const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return decision[key] ?? decision[camelKey];
}

async function readAccountField(cmid: string, path: string): Promise<unknown> {
  const a = await prisma.account.findUnique({ where: { cmid } });
  if (!a) return null;
  const key = path.split(".").pop()!;
  const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  // @ts-expect-error dynamic key access
  return a[camelKey] ?? a[key];
}

async function writeAccountField(
  cmid: string,
  path: string,
  value: unknown,
): Promise<void> {
  const key = path.split(".").pop()!;
  const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const data: Record<string, unknown> = {};
  if (camelKey === "marketingBudgetKrw" || camelKey === "annualRevenueKrw") {
    data[camelKey] = BigInt(Math.floor(Number(value)));
  } else {
    data[camelKey] = value;
  }
  await prisma.account.update({ where: { cmid }, data });
}

function jsonReplacer(_k: string, v: unknown) {
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  return v;
}
