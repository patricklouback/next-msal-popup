export interface ParsedAuthResponse {
  payload: string;
  libraryState: { id: string };
}

export interface PopupChannel {
  postMessage(message: unknown): void;
  close(): void;
}

export interface PopupRedirectDeps {
  isPopupWindow: () => boolean;
  parseAuthResponse: () => ParsedAuthResponse;
  openChannel: (channelId: string) => PopupChannel;
  navigate: (url: string) => void;
  closeWindow: () => void;
}

export interface CompletePopupRedirectOptions {
  homeUrl?: string;
  closeWindow?: boolean;
  messageVersion?: number;
}

export type PopupRedirectResult =
  | { status: "forwarded"; channelId: string }
  | { status: "not-a-popup"; navigatedTo: string }
  | { status: "no-auth-response"; reason: string };

export class NotInBrowserError extends Error {
  constructor() {
    super(
      "completePopupRedirect needs a browser. In the Next.js App Router the redirect page has to be a client component.",
    );
    this.name = "NotInBrowserError";
  }
}
