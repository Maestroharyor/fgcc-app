import { useEffect, useRef } from "react";

/**
 * Shared dismiss behaviour for custom overlays (modal, drawer). While `active`:
 * Escape closes via `onClose`, and the document body is scroll-locked. Cleans
 * up on close/unmount. SSR-safe.
 *
 * `onClose` is read through a ref so the effect only re-runs when `active`
 * flips — callers can pass an inline closure without re-binding listeners.
 */
export function useOverlayDismiss(active: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
