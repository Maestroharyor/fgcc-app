"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a stable, debounced version of `callback`. Each call resets a timer;
 * the callback fires `delay` ms after the last call. The latest `callback` is
 * always used (kept in a ref) so closures over fresh props/state don't go stale,
 * and the pending timer is cleared on unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
) {
  const cbRef = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => cbRef.current(...args), delay);
    },
    [delay],
  );
}
