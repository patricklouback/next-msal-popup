import { afterEach, describe, expect, it, vi } from "vitest";
import { browserDeps, completePopupRedirect } from "./complete";

const PAYLOAD = "code=the-code&state=abc%7Cuser";

function stubPopupWindow(search: string) {
  const close = vi.fn();
  const replace = vi.fn();
  vi.stubGlobal("window", { location: { hash: "", search, replace }, close });
  return { close, replace };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the message the parent actually reads", () => {
  it("arrives on a channel named after the library state id, shaped the way msal reads it", async () => {
    const channelId = "chan-round-trip";
    const { close } = stubPopupWindow(`?${PAYLOAD}`);

    const parent = new BroadcastChannel(channelId);
    const received = new Promise<{ payload: string; v: number }>((resolve) => {
      parent.onmessage = (event) => resolve(event.data);
    });

    const result = completePopupRedirect(
      {},
      {
        ...browserDeps(() => ({ payload: PAYLOAD, libraryState: { id: channelId } })),
      },
    );

    const message = await received;
    parent.close();

    expect(result).toEqual({ status: "forwarded", channelId, windowStillOpen: false });
    expect(message.payload).toBe(PAYLOAD);
    expect(message.v).toBe(1);
    expect(close).toHaveBeenCalledOnce();
  });

  it("still forwards when window.opener is gone, which is what broke before", () => {
    const channelId = "chan-no-opener";
    const { close } = stubPopupWindow(`?${PAYLOAD}`);

    const result = completePopupRedirect(
      {},
      browserDeps(() => ({ payload: PAYLOAD, libraryState: { id: channelId } })),
    );

    expect(result).toEqual({ status: "forwarded", channelId, windowStillOpen: false });
    expect(close).toHaveBeenCalledOnce();
  });

  it("sends the visitor home when there is no auth response to forward", () => {
    const { replace } = stubPopupWindow("");

    const result = completePopupRedirect(
      { homeUrl: "/signin" },
      browserDeps(() => {
        throw new Error("no auth payload found in the url");
      }),
    );

    expect(result.status).toBe("no-auth-response");
    expect(replace).toHaveBeenCalledWith("/signin");
  });

  it("throws a named error when there is no window at all, which is the SSR case", async () => {
    vi.stubGlobal("window", undefined);
    const { NotInBrowserError } = await import("./types");

    expect(() => browserDeps(() => ({ payload: "", libraryState: { id: "x" } }))).toThrow(
      NotInBrowserError,
    );
  });
});
