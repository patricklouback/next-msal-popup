import { beforeEach, describe, expect, it, vi } from "vitest";
import { completePopupRedirect } from "./complete";
import type { PopupRedirectDeps } from "./types";

function makeDeps(overrides: Partial<PopupRedirectDeps> = {}) {
  const posted: unknown[] = [];
  const channel = { postMessage: (m: unknown) => posted.push(m), close: vi.fn() };
  const deps: PopupRedirectDeps = {
    parseAuthResponse: () => ({ payload: "code=abc&state=xyz", libraryState: { id: "chan-1" } }),
    openChannel: vi.fn(() => channel),
    navigate: vi.fn(),
    closeWindow: vi.fn(),
    ...overrides,
  };
  return { deps, channel, posted };
}

describe("completePopupRedirect", () => {
  let context: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    context = makeDeps();
  });

  it("posts the raw payload on the channel named after the library state id", () => {
    const result = completePopupRedirect({}, context.deps);

    expect(context.deps.openChannel).toHaveBeenCalledWith("chan-1");
    expect(context.posted).toEqual([{ payload: "code=abc&state=xyz", v: 1 }]);
    expect(result).toEqual({ status: "forwarded", channelId: "chan-1" });
  });

  it("forwards without asking whether window.opener survived", () => {
    const surface = Object.keys(context.deps);

    expect(surface).not.toContain("isPopupWindow");
    expect(completePopupRedirect({}, context.deps).status).toBe("forwarded");
  });

  it("closes the channel and then the window", () => {
    completePopupRedirect({}, context.deps);

    expect(context.channel.close).toHaveBeenCalledOnce();
    expect(context.deps.closeWindow).toHaveBeenCalledOnce();
  });

  it("leaves the window open when asked to", () => {
    completePopupRedirect({ closeWindow: false }, context.deps);

    expect(context.deps.closeWindow).not.toHaveBeenCalled();
  });

  it("honours a custom message version", () => {
    completePopupRedirect({ messageVersion: 2 }, context.deps);

    expect(context.posted).toEqual([{ payload: "code=abc&state=xyz", v: 2 }]);
  });

  it("sends the visitor home when the url has no auth response", () => {
    const { deps } = makeDeps({
      parseAuthResponse: () => {
        throw new Error("no auth payload found in the url");
      },
    });

    const result = completePopupRedirect({}, deps);

    expect(deps.navigate).toHaveBeenCalledWith("/");
    expect(deps.openChannel).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "no-auth-response",
      reason: "no auth payload found in the url",
      navigatedTo: "/",
    });
  });

  it("respects a custom home url", () => {
    const { deps } = makeDeps({
      parseAuthResponse: () => {
        throw new Error("nope");
      },
    });

    completePopupRedirect({ homeUrl: "/signin" }, deps);

    expect(deps.navigate).toHaveBeenCalledWith("/signin");
  });

  it("stays put when navigateOnMiss is off, so the url stays readable", () => {
    const { deps } = makeDeps({
      parseAuthResponse: () => {
        throw new Error("nope");
      },
    });

    const result = completePopupRedirect({ navigateOnMiss: false }, deps);

    expect(deps.navigate).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "no-auth-response", reason: "nope", navigatedTo: null });
  });

  it("treats a state with no library state id as a miss", () => {
    const { deps } = makeDeps({
      parseAuthResponse: () => ({ payload: "code=abc", libraryState: { id: "" } }),
    });

    const result = completePopupRedirect({}, deps);

    expect(result.status).toBe("no-auth-response");
    expect(deps.openChannel).not.toHaveBeenCalled();
  });

  it("does not close the window on a miss, so the error stays visible", () => {
    const { deps } = makeDeps({
      parseAuthResponse: () => {
        throw new Error("boom");
      },
    });

    completePopupRedirect({ navigateOnMiss: false }, deps);

    expect(deps.closeWindow).not.toHaveBeenCalled();
  });

  it("closes the channel even when postMessage throws", () => {
    const channel = {
      postMessage: () => {
        throw new Error("channel is closed");
      },
      close: vi.fn(),
    };
    const { deps } = makeDeps({ openChannel: () => channel });

    expect(() => completePopupRedirect({}, deps)).toThrow("channel is closed");
    expect(channel.close).toHaveBeenCalledOnce();
  });

  it("never calls handleRedirectPromise, which is the whole point", () => {
    expect(Object.keys(context.deps)).not.toContain("handleRedirectPromise");
  });
});
