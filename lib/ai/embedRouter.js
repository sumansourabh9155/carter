// $0 client-side semantic intent router.
//
// Runs all-MiniLM-L6-v2 entirely in the browser via Transformers.js, loaded
// from a public CDN at runtime — no API key, no server, no per-query cost, no
// rate limits. The model (~23MB) downloads once and is cached by the browser.
//
// Everything is best-effort: if the library/model can't load (offline, blocked
// CDN, no WASM), callers fall back to keyword matching, so the app never breaks.

const LIB_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm";
const MODEL = "Xenova/all-MiniLM-L6-v2";

let extractorPromise = null;
let intentCache = null;

async function getExtractor() {
  if (typeof window === "undefined") throw new Error("no-browser");
  if (extractorPromise) return extractorPromise;
  extractorPromise = (async () => {
    const url = LIB_URL;
    const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
    if (mod.env) mod.env.allowLocalModels = false;
    return mod.pipeline("feature-extraction", MODEL);
  })();
  return extractorPromise;
}

async function embed(extractor, text) {
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return out.data; // normalized Float32Array
}

// cosine similarity of two already-normalized vectors == dot product
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// intents: [{ id, examples: [phrase, ...] }] → { id, score } of the best match.
export async function routeIntent(message, intents) {
  const extractor = await getExtractor();

  if (!intentCache) {
    intentCache = [];
    for (const it of intents) {
      const phrases = it.examples && it.examples.length ? it.examples : [it.id];
      const vecs = [];
      for (const p of phrases) vecs.push(await embed(extractor, p));
      intentCache.push({ id: it.id, vecs });
    }
  }

  const q = await embed(extractor, message);
  let bestId = null;
  let best = -1;
  for (const it of intentCache) {
    for (const v of it.vecs) {
      const c = dot(q, v);
      if (c > best) {
        best = c;
        bestId = it.id;
      }
    }
  }
  return { id: bestId, score: best };
}

// Optional: warm the model so the first real question feels instant.
export async function warmUp() {
  try {
    const extractor = await getExtractor();
    await embed(extractor, "warm up");
  } catch {
    /* ignore — fallback path handles everything */
  }
}
