import { afterEach, describe, expect, it, vi } from "vitest";
import { browserDeps, completePopupRedirect } from "./complete";

const PAYLOAD = "code=the-code&state=abc%7Cuser";

function stubPopupWindow(search: string) {
  const close = vi.fn();
  vi.stubGlobal("window", {
    location: { hash: "", search, replace: vi.fn() },
    opener: { name: "parent" },
    close,
  });
  return { close };
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

    expect(result).toEqual({ status: "forwarded", channelId });
    expect(message.payload).toBe(PAYLOAD);
    expect(message.v).toBe(1);
    expect(close).toHaveBeenCalledOnce();
  });

  it("sends the visitor home instead of posting when there is no opener", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", {
      location: { hash: "", search: "", replace },
      opener: null,
      close: vi.fn(),
    });

    const result = completePopupRedirect(
      { homeUrl: "/signin" },
      browserDeps(() => ({ payload: PAYLOAD, libraryState: { id: "never-used" } })),
    );

    expect(result).toEqual({ status: "not-a-popup", navigatedTo: "/signin" });
    expect(replace).toHaveBeenCalledWith("/signin");
  });

  it("treats a window that opened itself as a direct visit, not a popup", () => {
    const self: Record<string, unknown> = {
      location: { hash: "", search: "", replace: vi.fn() },
      close: vi.fn(),
    };
    self.opener = self;
    vi.stubGlobal("window", self);

    const result = completePopupRedirect(
      {},
      browserDeps(() => ({ payload: PAYLOAD, libraryState: { id: "never-used" } })),
    );

    expect(result.status).toBe("not-a-popup");
  });

  it("throws a named error when there is no window at all, which is the SSR case", async () => {
    vi.stubGlobal("window", undefined);
    const { NotInBrowserError } = await import("./types");

    expect(() => browserDeps(() => ({ payload: "", libraryState: { id: "x" } }))).toThrow(
      NotInBrowserError,
    );
  });
});
