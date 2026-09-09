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
away the URL, which is the only evidence of what went wrong. Only the `forwarded` path closes.

**`window.opener` is the popup check, not `BrowserUtils.isInPopup()`.** In v5 `isInPopup()` reads
`meta.interactionType` out of the `state` parameter, so a bookmarked URL with an old `state`
answers `true` and the page would try to post to a channel nobody is listening on.

**The hook guards with a ref, not with a dependency array.** React StrictMode runs effects twice
in development, and posting the same auth response twice is a real bug rather than a cosmetic one.

**No comments in the source.** Reasoning goes here.
