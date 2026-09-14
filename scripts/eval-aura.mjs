#!/usr/bin/env node
// Aura eval runner — hits the /api/aura/eval endpoint of a RUNNING dev server
// and prints a pass/fail report. Exits non-zero if any deterministic case
// fails or any grounding violation exists, so it can gate CI.
//
//   node scripts/eval-aura.mjs           # deterministic + grounding
//   node scripts/eval-aura.mjs --live    # also probe the real gateway
//   PORT=3001 node scripts/eval-aura.mjs
//
// Plain Node ESM — no repo imports (the "@/" alias won't resolve here).

const PORT = process.env.PORT || 3000;
const LIVE = process.argv.includes("--live");
const BASE = process.env.EVAL_BASE || `http://localhost:${PORT}`;
const URL = `${BASE}/api/aura/eval${LIVE ? "?live=1" : ""}`;

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m",
};
const ok = (s) => `${c.green}${s}${c.reset}`;
const bad = (s) => `${c.red}${s}${c.reset}`;
const warn = (s) => `${c.yellow}${s}${c.reset}`;

async function main() {
  process.stdout.write(`${c.dim}→ ${URL}${c.reset}\n\n`);
  let data;
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(LIVE ? 300000 : 30000) });
    data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  } catch (err) {
    console.error(bad(`Could not reach the eval endpoint: ${err.message}`));
    console.error(c.gray + `Is the dev server running on ${BASE}? (npm run dev)` + c.reset);
    process.exit(2);
  }

  const { deterministic: det, grounding: g, live } = data;

  // --- deterministic routing ---
  console.log(`${c.bold}Deterministic routing${c.reset}  ${det.passed}/${det.total} passed`);
  for (const r of det.results) {
    const tag = r.pass ? ok("PASS") : bad("FAIL");
    console.log(`  ${tag}  ${c.cyan}${r.id}${c.reset}  ${c.gray}${r.description}${c.reset}`);
    if (!r.pass) {
      console.log(`        ${c.gray}q:${c.reset} ${r.question}`);
      console.log(`        ${c.gray}wanted any of:${c.reset} ${JSON.stringify(r.expected)}`);
    }
  }

  // --- grounding ---
  console.log(`\n${c.bold}Grounding${c.reset}  ${g.checkedAnswers} answers checked  ${g.clean ? ok("no violations") : bad(`${g.violations.length} violation(s)`)}`);
  for (const v of g.violations) {
    console.log(`  ${bad("UNGROUNDED")}  ${c.cyan}${v.id}${c.reset}  token ${bad(v.token)}  ${c.gray}…${v.context}…${c.reset}`);
  }

  // --- live ---
  if (live?.ran) {
    const ran = live.results.filter((r) => !r.skipped);
    const skipped = live.results.filter((r) => r.skipped);
    const rate = live.passRate == null ? "n/a" : `${Math.round(live.passRate * 100)}%`;
    console.log(`\n${c.bold}Live gateway${c.reset}  ${ran.length} probed, ${skipped.length} skipped  grounded ${rate}`);
    for (const r of live.results) {
      if (r.skipped) { console.log(`  ${warn("SKIP")}  ${c.cyan}${r.id}${c.reset}  ${c.gray}${r.reason}${c.reset}`); continue; }
      const tag = r.grounded ? ok("GROUNDED") : bad("UNGROUNDED");
      console.log(`  ${tag}  ${c.cyan}${r.id}${c.reset}  ${c.gray}${r.mode}, ${r.latencyMs}ms${c.reset}`);
      for (const v of r.violations || []) console.log(`        token ${bad(v.token)}  ${c.gray}…${v.context}…${c.reset}`);
    }
  } else if (LIVE) {
    console.log(`\n${warn("Live requested but the endpoint reported no live run.")}`);
  }

  const detFailed = det.results.some((r) => !r.pass);
  const groundingFailed = !g.clean;
  const liveFailed = live?.ran && live.results.some((r) => !r.skipped && !r.grounded);

  console.log("");
  if (detFailed || groundingFailed || liveFailed) {
    console.log(bad(`✗ eval failed${detFailed ? " · routing" : ""}${groundingFailed ? " · grounding" : ""}${liveFailed ? " · live grounding" : ""}`));
    process.exit(1);
  }
  console.log(ok("✓ all eval checks passed"));
  process.exit(0);
}

main();
