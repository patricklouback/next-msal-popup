import { BrowserUtils, InteractionType } from "@azure/msal-browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserDeps, completePopupRedirect } from "./complete";

function msalState(id: string, interactionType = InteractionType.Popup): string {
  const libraryState = { id, meta: { interactionType } };
  return Buffer.from(JSON.stringify(libraryState), "utf-8").toString("base64");
}

function landOnRedirectPage(search: string): void {
  window.history.replaceState({}, "", `/auth/redirect${search}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
  landOnRedirectPage("");
});

describe("interop with the real msal-browser", () => {
  it("real parseAuthResponseFromUrl recovers the channel id we post on", () => {
    const id = "library-state-id-from-msal";
    landOnRedirectPage(`?code=some-auth-code&state=${encodeURIComponent(msalState(id))}`);

    const parsed = BrowserUtils.parseAuthResponseFromUrl();

    expect(parsed.libraryState.id).toBe(id);
    expect(parsed.payload).toContain("code=some-auth-code");
  });

  it("real isInPopup agrees that this url describes a popup interaction", () => {
    landOnRedirectPage(`?code=c&state=${encodeURIComponent(msalState("chan-abc"))}`);

    expect(BrowserUtils.isInPopup()).toBe(true);
  });

  it("reports a readable reason when the url has no auth response at all", () => {
    landOnRedirectPage("");

    const result = completePopupRedirect(
      { navigateOnMiss: false },
      browserDeps(BrowserUtils.parseAuthResponseFromUrl),
    );

    expect(result.status).toBe("no-auth-response");
  });
});
