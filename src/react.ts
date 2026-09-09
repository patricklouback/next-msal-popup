import { useEffect, useRef, useState } from "react";
import { completeMsalPopupRedirect } from "./index";
import type { CompletePopupRedirectOptions, PopupRedirectResult } from "./types";

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

  return result;
}
