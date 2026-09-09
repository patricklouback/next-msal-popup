import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeMsalPopupRedirect = vi.fn();
const closeSelf = vi.fn();

vi.mock("./index", () => ({ completeMsalPopupRedirect }));
vi.mock("./complete", () => ({ closeSelf }));

const { usePopupRedirect } = await import("./react");

describe("usePopupRedirect", () => {
  beforeEach(() => {
    completeMsalPopupRedirect.mockReset();
    closeSelf.mockReset();
    vi.useRealTimers();
  });

  it("returns null on the first render and the outcome after the effect", () => {
    completeMsalPopupRedirect.mockReturnValue({
      status: "forwarded",
      channelId: "chan-1",
      windowStillOpen: false,
    });

    const { result } = renderHook(() => usePopupRedirect());

    expect(result.current).toEqual({
      status: "forwarded",
      channelId: "chan-1",
      windowStillOpen: false,
    });
  });

  it("forwards only once even when the effect runs twice under StrictMode", () => {
    completeMsalPopupRedirect.mockReturnValue({
      status: "forwarded",
      channelId: "chan-1",
      windowStillOpen: false,
    });

    const { rerender } = renderHook(() => usePopupRedirect());
    rerender();
    rerender();

    expect(completeMsalPopupRedirect).toHaveBeenCalledOnce();
  });

  it("passes the options through", () => {
    completeMsalPopupRedirect.mockReturnValue({ status: "not-a-popup", navigatedTo: "/login" });

    renderHook(() => usePopupRedirect({ homeUrl: "/login" }));

    expect(completeMsalPopupRedirect).toHaveBeenCalledWith({ homeUrl: "/login" });
  });

  it("turns a thrown error into a readable result instead of crashing the page", () => {
    completeMsalPopupRedirect.mockImplementation(() => {
      throw new Error("needs a browser");
    });

    const { result } = renderHook(() => usePopupRedirect());

    expect(result.current).toEqual({
      status: "no-auth-response",
      reason: "needs a browser",
      navigatedTo: null,
    });
  });

  it("retries the close, then admits the window is still open", async () => {
    completeMsalPopupRedirect.mockReturnValue({
      status: "forwarded",
      channelId: "chan-1",
      windowStillOpen: false,
    });

    const { result } = renderHook(() => usePopupRedirect({ closeGraceMs: 40 }));

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "forwarded",
        channelId: "chan-1",
        windowStillOpen: true,
      });
    });
    expect(closeSelf).toHaveBeenCalled();
  });

  it("does not chase a close when there was no auth response", async () => {
    completeMsalPopupRedirect.mockReturnValue({
      status: "no-auth-response",
      reason: "nope",
      navigatedTo: "/",
    });

    renderHook(() => usePopupRedirect({ closeGraceMs: 20 }));
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(closeSelf).not.toHaveBeenCalled();
  });
});
