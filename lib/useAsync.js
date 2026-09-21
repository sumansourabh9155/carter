"use client";

import { useEffect, useState } from "react";

/*
  Tiny fetch-with-loading helper for client pages reading the async facade.

  It returns `error` as well as `data`, because without it a rejected promise
  left every consumer sitting on its skeleton forever — visually identical to
  a slow load, and indistinguishable from a broken page. A screen that fails
  should say so.
*/
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(fn)
      .then((d) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        // Logged as well as returned: the message on screen is for the
        // operator, the stack in the console is for whoever debugs it.
        console.error("useAsync failed:", err);
        setError(err);
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}
