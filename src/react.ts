import { useEffect, useRef, useState } from "react";
import { closeSelf } from "./complete";
import { completeMsalPopupRedirect } from "./index";
import type { CompletePopupRedirectOptions, PopupRedirectResult } from "./types";

const DEFAULT_CLOSE_GRACE_MS = 600;

export function usePopupRedirect(
  options: CompletePopupRedirectOptions = {},
): PopupRedirectResult | null {
  const [result, setResult] = useState<PopupRedirectResult | null>(null);
  const ran = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    try {
      setResult(completeMsalPopupRedirect(optionsRef.current));
    } catch (error) {
      setResult({
        status: "no-auth-response",
        reason: error instanceof Error ? error.message : String(error),
        navigatedTo: null,
      });
    }
  }, []);

  const forwarded = result?.status === "forwarded" && !result.windowStillOpen;
  const grace = optionsRef.current.closeGraceMs ?? DEFAULT_CLOSE_GRACE_MS;

  useEffect(() => {
    if (!forwarded) return;

    const retry = window.setTimeout(closeSelf, Math.round(grace / 2));
    const giveUp = window.setTimeout(() => {
      setResult((current) =>
        current?.status === "forwarded" ? { ...current, windowStillOpen: true } : current,
      );
    }, grace);

    return () => {
      window.clearTimeout(retry);
      window.clearTimeout(giveUp);
    };
  }, [forwarded, grace]);

  return result;
}
