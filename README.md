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
| `forwarded` | the payload went out on the channel and the window was closed |
| `not-a-popup` | no opener, so the visitor was sent to `homeUrl` |
| `no-auth-response` | the URL had no auth response, and `reason` says why |

Options are `homeUrl` (default `/`), `closeWindow` (default `true`, turn it off while debugging so
you can read the URL) and `messageVersion` (default `1`, which is what MSAL reads today).

On failure the popup stays open on purpose. Closing it would throw away the only place the error
is visible.

## Two things that will bite you anyway

`BrowserUtils.isInPopup()` in v5 decides by reading `meta.interactionType` out of the `state`
parameter, not by looking at `window.opener`. That means a bookmarked redirect URL with a stale
`state` still answers `true`. This package checks `window.opener` instead, which is the question
you actually wanted answered.

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

## Status

Version 0.1, ESM only, Node 20 or newer. Tested against `@azure/msal-browser` 5.21.

## License

MIT
