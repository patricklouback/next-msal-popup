# next-msal-popup

You wire up `loginPopup()` with MSAL Browser v5 in a Next.js App Router app. The popup opens,
Entra asks for the password, the popup lands on your redirect URI page, and then nothing happens.
The popup just sits there. The parent window keeps waiting until it times out.

So you do what MSAL v4 taught everyone to do and call `handleRedirectPromise()` on the redirect
page. Now you get `no_token_request_cache_error`, which reads like your config is broken. It
isn't. The popup has no token request in its cache, because the parent is the window that made
the request and the parent still has it.

Here's what actually changed in v5. `loginPopup()` opens a `BroadcastChannel` named after the
library state id it packed into the `state` parameter, and waits there for a message with the raw
response payload on it. Nothing in the popup does that for you, and MSAL never closes the popup
either. The redirect page has one job, and this package is that job.

## Install

```bash
npm install next-msal-popup
```

`@azure/msal-browser` v5 is a peer dependency, so it uses the copy you already have. React is an
optional peer, needed only for the hook.

## Use it

The redirect page has to be a client component, and it should render something, because a person
does look at it for a few hundred milliseconds.

```tsx
"use client";

import { usePopupRedirect } from "next-msal-popup/react";

export default function AuthRedirectPage() {
  const result = usePopupRedirect();

  if (result?.status === "no-auth-response") {
    return <p>Sign-in did not complete: {result.reason}</p>;
  }

  return <p>Signing you in...</p>;
}
```

That's it. On a real popup it forwards the response and closes the window. If somebody opens the
redirect URL directly, which happens the moment it lands in a bookmark, it sends them to `/`
instead of leaving them on a blank page.

Without React:

```ts
import { completeMsalPopupRedirect } from "next-msal-popup";

const result = completeMsalPopupRedirect({ homeUrl: "/signin" });
```

## What it returns

| status | what happened |
| --- | --- |
| `forwarded` | the payload went out on the channel, and `windowStillOpen` says whether the close took |
| `no-auth-response` | the URL had no auth response, so the visitor went to `homeUrl` |

Options are `homeUrl` (default `/`), `closeWindow` (default `true`), `navigateOnMiss` (default
`true`, set it to `false` while debugging so the URL stays on screen), `closeGraceMs` (default
`600`) and `messageVersion` (default `1`, which is what MSAL reads today).

## The browser may refuse to close the popup

`window.close()` is a request, not a command, and a browser is free to ignore it. When that
happens the popup sits there spinning while the sign-in has in fact already succeeded, which looks
far worse than it is.

So the hook checks. It asks to close, retries once, and if the page is still running after
`closeGraceMs` it flips `windowStillOpen` to `true`. Render that state and tell the person they can
close the window, the way `example/` does. The sign-in is already done at that point: the payload
went out the moment the page loaded.

## Do not gate this on window.opener

The first version of this package checked `window.opener` to decide whether it was running in a
popup, and it was wrong. By the time the popup comes back from Microsoft, that reference can
already be gone, and then the check fails, the page sends itself to your home URL, and you watch a
popup sitting on your own landing page while the parent waits for a message that never arrives.

So the question this package asks is whether the URL carries a parseable MSAL auth response. If it
does, forward it. If it does not, this is somebody opening a bookmark, so send them home. The
opener never enters into it, which is the same conclusion MSAL reached: `BroadcastChannel` exists
precisely so the popup does not need a handle on the window that opened it.

`BrowserUtils.isInPopup()` is not the answer either. It reads `meta.interactionType` out of the
`state` parameter, so a bookmarked URL with a stale `state` still answers `true`.

## One more thing that will bite you

If your `MsalProvider` lives inside a route group, the redirect page probably sits outside it and
renders with no MSAL context. Put the provider in the root layout.

## Why it exists

I hit this building Microsoft sign-in for a Next.js app and lost an afternoon to
`no_token_request_cache_error` before reading `waitForBridgeResponse` in the MSAL source and
finding the channel. The fix is about twenty lines. Finding it was the expensive part, so here it
is packaged up.

The interesting part of the test suite runs against real `@azure/msal-browser`: it builds a
`state` the way MSAL builds one, parses it with the real `parseAuthResponseFromUrl`, and has a
listener read the message off a real `BroadcastChannel` the same way `waitForBridgeResponse` does.
If Microsoft changes the shape, those tests break instead of your login.

## A working example

`example/` has the five files of a Next.js App Router app that signs in with Microsoft, plus what
to put in the Entra portal. The redirect page there is the same eight lines shown above.

## Status

Version 0.2, ESM only, Node 20 or newer. Tested against `@azure/msal-browser` 5.21.

0.2.0 dropped the `window.opener` check described above, which means the `not-a-popup` status is
gone and `no-auth-response` now carries `navigatedTo`. If you were matching on `not-a-popup`,
match on `no-auth-response`.

## License

MIT
