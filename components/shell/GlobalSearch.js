"use client";

/*
  GLOBAL SEARCH — previously an input with no handler.

  It sat on every screen, full width, inviting the first thing anyone does in
  an unfamiliar tool: type the name of the thing they came to look at. Nothing
  happened. That is the same defect as the date picker that changed no data —
  a control that lies about being a control, and the fastest way to make a
  polished product feel fake.

  It searches the three things this product has entities for — products,
  channels and campaigns — plus categories, because at catalogue scale the
  category is what a director actually opens. Everything is matched against
  data already loaded by the facade, so there is no new fetch and no index to
  keep in sync.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Radio, Megaphone, Layers, CornerDownLeft } from "lucide-react";
import { getProducts, getMarketing } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { money, multiple } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND = {
  product: { icon: Package, label: "Product" },
  category: { icon: Layers, label: "Category" },
  channel: { icon: Radio, label: "Channel" },
  campaign: { icon: Megaphone, label: "Campaign" },
};

// Ranked so an exact prefix beats a word-start beats a loose contains. Without
// it, typing "meta" surfaces every campaign containing the letters before the
// channel itself.
function score(haystack, q) {
  const h = haystack.toLowerCase();
  if (h === q) return 100;
  if (h.startsWith(q)) return 80;
  if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(h)) return 60;
  if (h.includes(q)) return 30;
  return 0;
}

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const { data: products } = useAsync(() => getProducts(), []);
  const { data: mkt } = useAsync(() => getMarketing(), []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out = [];

    for (const p of products ?? []) {
      const s = Math.max(score(p.name, term), score(p.sku ?? "", term));
      if (s) {
        out.push({
          kind: "product", id: p.id, title: p.name,
          sub: `${p.sku} · ${money(p.cm2)} CM2 · ${multiple(p.cmRoas)} CM-ROAS`,
          href: `/products/${p.id}`, score: s,
          flag: p.mediaLosing ? "Ads underwater" : null,
        });
      }
    }

    const cats = [...new Set((products ?? []).map((p) => p.category).filter(Boolean))];
    for (const c of cats) {
      const s = score(c, term);
      if (s) {
        const members = products.filter((p) => p.category === c);
        out.push({
          kind: "category", id: c, title: c,
          sub: `${members.length} SKUs · ${money(members.reduce((a, p) => a + p.cm2, 0))} CM2`,
          href: `/products?category=${encodeURIComponent(c)}`, score: s + 5,
        });
      }
    }

    for (const c of mkt?.channels ?? []) {
      const s = score(c.name, term);
      if (s) {
        out.push({
          kind: "channel", id: c.id, title: c.name,
          sub: c.spend > 0 ? `${money(c.spend)} spend · ${multiple(c.cmRoas)} CM-ROAS` : "No spend this period",
          href: "/insights?view=channels", score: s + 5,
          flag: c.cmRoas != null && c.cmRoas < 1 ? "Below break-even" : null,
        });
      }
      for (const k of c.campaigns ?? []) {
        const ks = score(k.name, term);
        if (ks) {
          out.push({
            kind: "campaign", id: `${c.id}-${k.name}`, title: k.name,
            sub: `${c.name} · ${money(k.spend)} · ${multiple(k.cmRoas)} CM-ROAS`,
            href: "/insights?view=channels", score: ks,
            flag: k.cmRoas != null && k.cmRoas < 1 ? "Below break-even" : null,
          });
        }
      }
    }

    return out.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [q, products, mkt]);

  useEffect(() => setActive(0), [q]);

  // Close on outside click, and on Escape from anywhere in the box.
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(r) {
    if (!r) return;
    setOpen(false);
    setQ("");
    router.push(r.href);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") return setOpen(false);
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
    if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
  }

  return (
    <div ref={boxRef} className="relative ml-4 hidden min-w-0 max-w-[520px] flex-1 lg:block">
      <div className="flex h-8 items-center gap-2 rounded-nav bg-brand-800 px-2.5">
        <Search className="size-3.5 shrink-0 text-brand-200/70" />
        <input
          type="search"
          aria-label="Search Carter"
          placeholder="Search products, campaigns, channels"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[12px] leading-4 text-white outline-none placeholder:text-brand-200/60"
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-9 z-50 overflow-hidden rounded-card bg-card shadow-mid">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-muted-foreground">
              Nothing matches &ldquo;{q.trim()}&rdquo; in products, categories, channels or campaigns.
            </p>
          ) : (
            results.map((r, i) => {
              const Icon = KIND[r.kind].icon;
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    i === active ? "bg-ia-gray-faded" : "hover:bg-ia-gray-faded"
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-button bg-ia-gray-faded text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium">{r.title}</span>
                      {r.flag && (
                        <span className="shrink-0 rounded-full bg-ia-negative-faded px-1.5 py-px text-[10px] font-semibold text-destructive">
                          {r.flag}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">{r.sub}</span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {KIND[r.kind].label}
                  </span>
                  {i === active && <CornerDownLeft className="size-3 shrink-0 text-muted-foreground" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
