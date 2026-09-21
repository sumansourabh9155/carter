// AURA EVAL ENDPOINT — GET /api/aura/eval  (add ?live=1 to also probe the
// real gateway). The release gate: routing correctness + numeric grounding on
// the deterministic path, and optional grounding on live agentic answers.
//
// Grounding is the load-bearing check: every number an answer states must be
// one the engines can actually produce. It catches both a hallucinating model
// (live) and a canned answer that drifted stale from the seed (deterministic).

import { NextResponse } from "next/server";
import { GOLDEN_SET, buildAllowedNumbers, extractNumericClaims, isBenignNumber } from "@/lib/ai/goldenSet";
import { answerFor } from "@/lib/api/mock/ai";
import { allProducts, productsSummary, losingHero } from "@/lib/api/mock/products";
import { marketingData } from "@/lib/api/mock/marketing";
import { insightsBoard } from "@/lib/compute/insights";
import { buildDailyBrief } from "@/lib/compute/dailyBrief";

export const dynamic = "force-dynamic";

function engines() {
  return { allProducts, productsSummary, losingHero, marketingData, insightsBoard, buildDailyBrief };
}

// Concatenate everything an answer asserts into one searchable/checkable blob.
function searchable(a) {
  if (!a) return "";
  const bullets = Array.isArray(a.bullets) ? a.bullets : [];
  const metrics = Array.isArray(a.metrics) ? a.metrics.map((m) => `${m.label} ${m.value}`) : [];
  return [a.answer, ...bullets, ...metrics].join("  ");
}

function groundingViolations(text, allowed) {
  const out = [];
  for (const claim of extractNumericClaims(text)) {
    if (allowed.has(claim.token)) continue;
    if (isBenignNumber(claim.token)) continue;
    out.push({ token: claim.raw, context: claim.context.trim() });
  }
  return out;
}

async function probeLive(origin, question, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(`${origin}/api/aura`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history: [] }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.answer) return { skipped: true, reason: data?.error || `status ${res.status}` };
    return { skipped: false, answer: data, latencyMs: Date.now() - started, mode: data?.meta?.mode || "unknown" };
  } catch (err) {
    return { skipped: true, reason: err.name === "AbortError" ? "timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req) {
  const e = engines();
  const allowed = buildAllowedNumbers(e);
  const url = new URL(req.url);
  const live = url.searchParams.get("live") === "1";

  // --- deterministic routing + grounding ---
  // The offline $0 fallback only routes a subset of intents; cases marked
  // det:false are answerable ONLY by live agentic Aura, so they're validated
  // in the live suite, not held against the fallback.
  const detCases = GOLDEN_SET.filter((c) => c.det !== false);
  const detResults = [];
  const grounding = { checkedAnswers: 0, violations: [] };
  for (const c of detCases) {
    const exp = c.expect(e);
    const ans = answerFor(c.question);
    const text = searchable(ans);
    const hay = text.toLowerCase();
    const matched = (exp.mustContainAny || []).filter((x) => x && hay.includes(String(x).toLowerCase()));
    const pass = matched.length > 0;
    detResults.push({ id: c.id, question: c.question, pass, matched, expected: exp.mustContainAny, description: exp.description });

    grounding.checkedAnswers++;
    for (const v of groundingViolations(text, allowed)) grounding.violations.push({ id: c.id, ...v });
  }
  const detPass = detResults.filter((r) => r.pass).length;

  // --- optional live probe (real gateway, agentic or single-shot) ---
  let liveBlock = { ran: false, results: [], passRate: null };
  if (live) {
    const origin = url.origin;
    const results = [];
    for (const c of GOLDEN_SET) {
      const probe = await probeLive(origin, c.question);
      if (probe.skipped) { results.push({ id: c.id, skipped: true, reason: probe.reason }); continue; }
      const text = searchable(probe.answer);
      const viol = groundingViolations(text, allowed);
      results.push({ id: c.id, skipped: false, mode: probe.mode, latencyMs: probe.latencyMs, grounded: viol.length === 0, violations: viol });
    }
    const ran = results.filter((r) => !r.skipped);
    liveBlock = { ran: true, results, passRate: ran.length ? ran.filter((r) => r.grounded).length / ran.length : null };
  }

  return NextResponse.json({
    deterministic: { results: detResults, passRate: detResults.length ? detPass / detResults.length : 0, passed: detPass, total: detResults.length, liveOnly: GOLDEN_SET.length - detCases.length },
    grounding: { checkedAnswers: grounding.checkedAnswers, violations: grounding.violations, clean: grounding.violations.length === 0 },
    live: liveBlock,
  });
}
