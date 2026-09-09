import {
  type CompletePopupRedirectOptions,
  NotInBrowserError,
  type PopupRedirectDeps,
  type PopupRedirectResult,
} from "./types";

const DEFAULTS = { homeUrl: "/", closeWindow: true, messageVersion: 1 } as const;

function reasonFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function completePopupRedirect(
  options: CompletePopupRedirectOptions,
  deps: PopupRedirectDeps,
): PopupRedirectResult {
  const homeUrl = options.homeUrl ?? DEFAULTS.homeUrl;
  const shouldClose = options.closeWindow ?? DEFAULTS.closeWindow;
  const messageVersion = options.messageVersion ?? DEFAULTS.messageVersion;

  if (!deps.isPopupWindow()) {
    deps.navigate(homeUrl);
    return { status: "not-a-popup", navigatedTo: homeUrl };
  }

  let parsed: ReturnType<PopupRedirectDeps["parseAuthResponse"]>;
  try {
    parsed = deps.parseAuthResponse();
  } catch (error) {
    return { status: "no-auth-response", reason: reasonFrom(error) };
  }

  const channelId = parsed.libraryState?.id;
  if (typeof channelId !== "string" || channelId === "") {
    return {
      status: "no-auth-response",
      reason: "the state parameter carries no library state id",
    };
  }

  const channel = deps.openChannel(channelId);
  try {
    channel.postMessage({ payload: parsed.payload, v: messageVersion });
  } finally {
    channel.close();
  }

  if (shouldClose) deps.closeWindow();

  return { status: "forwarded", channelId };
}

export function browserDeps(
  parseAuthResponse: () => ReturnType<PopupRedirectDeps["parseAuthResponse"]>,
): PopupRedirectDeps {
  if (typeof window === "undefined") throw new NotInBrowserError();

  return {
    isPopupWindow: () => Boolean(window.opener) && window.opener !== window,
    parseAuthResponse,
    openChannel: (channelId) => new BroadcastChannel(channelId),
    navigate: (url) => {
      window.location.replace(url);
    },
    closeWindow: () => {
      window.close();
    },
  };
}
