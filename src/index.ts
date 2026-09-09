import { BrowserUtils } from "@azure/msal-browser";
import { browserDeps, completePopupRedirect } from "./complete";
import type { CompletePopupRedirectOptions, PopupRedirectResult } from "./types";

export { browserDeps, closeSelf, completePopupRedirect } from "./complete";
export type {
  CompletePopupRedirectOptions,
  ParsedAuthResponse,
  PopupChannel,
  PopupRedirectDeps,
  PopupRedirectResult,
} from "./types";
export { NotInBrowserError } from "./types";

export function completeMsalPopupRedirect(
  options: CompletePopupRedirectOptions = {},
): PopupRedirectResult {
  return completePopupRedirect(options, browserDeps(BrowserUtils.parseAuthResponseFromUrl));
}
