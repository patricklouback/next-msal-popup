import {
  type CompletePopupRedirectOptions,
  NotInBrowserError,
  type PopupRedirectDeps,
  type PopupRedirectResult,
} from "./types";

const DEFAULTS = {
  homeUrl: "/",
  closeWindow: true,
  messageVersion: 1,
  navigateOnMiss: true,
} as const;

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
  const navigateOnMiss = options.navigateOnMiss ?? DEFAULTS.navigateOnMiss;

  const miss = (reason: string): PopupRedirectResult => {
    if (!navigateOnMiss) return { status: "no-auth-response", reason, navigatedTo: null };
    deps.navigate(homeUrl);
    return { status: "no-auth-response", reason, navigatedTo: homeUrl };
  };

  let parsed: ReturnType<PopupRedirectDeps["parseAuthResponse"]>;
  try {
    parsed = deps.parseAuthResponse();
  } catch (error) {
    return miss(reasonFrom(error));
  }

  const channelId = parsed.libraryState?.id;
  if (typeof channelId !== "string" || channelId === "") {
    return miss("the state parameter carries no library state id");
  }

  const channel = deps.openChannel(channelId);
  try {
    channel.postMessage({ payload: parsed.payload, v: messageVersion });
  } finally {
    channel.close();
  }

  if (shouldClose) deps.closeWindow();

  return { status: "forwarded", channelId, windowStillOpen: false };
}

export function closeSelf(): void {
  if (typeof window === "undefined") return;
  window.close();
}

export function browserDeps(
  parseAuthResponse: () => ReturnType<PopupRedirectDeps["parseAuthResponse"]>,
): PopupRedirectDeps {
  if (typeof window === "undefined") throw new NotInBrowserError();

  return {
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
