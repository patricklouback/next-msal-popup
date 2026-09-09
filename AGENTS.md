# next-msal-popup

A single small package: the redirect-page half of an MSAL Browser v5 popup login. ESM only, built
with plain `tsc`, no bundler.

## Commands

| What you want | Command |
| --- | --- |
| all tests | `npm test` |
| one file | `npx vitest run src/complete.spec.ts` |
| typecheck | `npm run typecheck` |
| lint and format check | `npm run lint` |
| fix lint and formatting | `npm run lint:fix` |
| compile to `dist` | `npm run build` |

## Layout

- `src/complete.ts` holds the logic and takes every browser capability through the
  `PopupRedirectDeps` object. That is why the tests need no DOM. `browserDeps()` is the only place
  that touches `window` or constructs a `BroadcastChannel`.
- `src/index.ts` is the public entry. It wires `browserDeps` to the real
  `BrowserUtils.parseAuthResponseFromUrl` and exports `completeMsalPopupRedirect`.
- `src/react.ts` is the `./react` entry, a hook over the same function.
- `src/types.ts` has the shared types and `NotInBrowserError`.

Test files run in three environments on purpose, set by `environmentMatchGlobs` in
`vitest.config.ts`. Adding a test file that needs a DOM means adding it to that list.

## Decisions and traps

**Never call `handleRedirectPromise()` on the redirect page.** It throws
`no_token_request_cache_error`, because the token request lives in the parent's cache, not the
popup's. This is the bug the package exists to prevent, so there is a test asserting the dependency
surface has no such function on it.

**The message shape is `{ payload, v }` and it is not ours to choose.** MSAL's
`waitForBridgeResponse` reads `event.data.payload` and, for telemetry only, `event.data.v`. The
channel name has to be `libraryState.id` from the parsed `state`. If a future MSAL renames either,
`src/channel-interop.spec.ts` and `src/msal-interop.spec.ts` fail, which is the point of them.

**Node's `BroadcastChannel` and jsdom do not mix.** Node's implementation calls `dispatchEvent`
with its own `MessageEvent`, and under jsdom that throws
`The "event" argument must be an instance of Event`. So the channel round trip lives in
`src/channel-interop.spec.ts` in the node environment with a stubbed `window`, and only the MSAL
parsing assertions run under jsdom in `src/msal-interop.spec.ts`. Do not merge those two files
back together.

**The popup deliberately stays open when something fails.** Closing it on the error path throws
away the URL, which is the only evidence of what went wrong. Only the `forwarded` path closes, and
`navigateOnMiss: false` keeps the URL on screen while debugging.

**Nothing here may depend on `window.opener`, and 0.1.x did.** That version gated on
`Boolean(window.opener) && window.opener !== window`. In a real Next.js app the popup came back
from Microsoft with that reference already gone, the guard decided it was a direct visit, and
`window.location.replace("/")` put the app's own landing page inside the popup while the parent sat
waiting on a channel that never got a message. From the outside it reads as a hung login.

The gate is now the auth response itself: parse it, and if the URL has one, forward it. A parse
failure means somebody opened a bookmark, which is the only case that navigates to `homeUrl`. This
is the same conclusion MSAL reached, and it is why `BroadcastChannel` exists in v5 instead of
`postMessage` to the opener. `BrowserUtils.isInPopup()` is not a substitute: it reads
`meta.interactionType` out of the `state`, so a stale bookmarked URL answers `true`.

`src/channel-interop.spec.ts` has a check named for this, stubbing a `window` with no `opener` at
all and asserting the payload still goes out.

**The hook guards with a ref, not with a dependency array.** React StrictMode runs effects twice
in development, and posting the same auth response twice is a real bug rather than a cosmetic one.

**`window.close()` can be refused, so never build a UI that assumes it worked.** Confirmed against
a real Entra tenant: the handshake succeeded, MSAL reported `loginSuccess` in the parent, and the
popup stayed on screen anyway. A page that only renders "closing..." leaves the person staring at a
spinner after a sign-in that already worked. `usePopupRedirect` asks to close, retries once at half
the grace period, and then sets `windowStillOpen` so the page can say so out loud.

Why the browser refused it is still open. Microsoft's authorize endpoint sends
`Cross-Origin-Opener-Policy-Report-Only`, which reports without severing, so COOP is not the
explanation. Do not write a cause into the docs until there is a measurement behind it.

**No comments in the source.** Reasoning goes here.
