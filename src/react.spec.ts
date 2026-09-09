import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeMsalPopupRedirect = vi.fn();

vi.mock("./index", () => ({ completeMsalPopupRedirect }));

const { usePopupRedirect } = await import("./react");

describe("usePopupRedirect", () => {
  beforeEach(() => {
    completeMsalPopupRedirect.mockReset();
  });

  it("returns null on the first render and the outcome after the effect", () => {
    completeMsalPopupRedirect.mockReturnValue({ status: "forwarded", channelId: "chan-1" });

    const { result } = renderHook(() => usePopupRedirect());

    expect(result.current).toEqual({ status: "forwarded", channelId: "chan-1" });
  });

  it("forwards only once even when the effect runs twice under StrictMode", () => {
    completeMsalPopupRedirect.mockReturnValue({ status: "forwarded", channelId: "chan-1" });

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

    expect(result.current).toEqual({ status: "no-auth-response", reason: "needs a browser" });
  });
});
