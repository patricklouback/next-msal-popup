# Example: Microsoft popup sign-in in the Next.js App Router

Five files. Copy them into a Next.js app that uses the App Router.

```bash
npm install @azure/msal-browser @azure/msal-react next-msal-popup
```

Then set two environment variables in `.env.local`:

```
NEXT_PUBLIC_AZURE_CLIENT_ID=the-application-id-from-entra
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id-or-common
```

In the Entra portal, open your app registration, go to Authentication, and add
`http://localhost:PORT/auth/redirect` as a **Single-page application** redirect URI. It has to be
the SPA platform, not Web, or you get a CORS error instead of a token.

Check the port before you type it. `next dev` uses 3000, but Nx's `@nx/next:server` serves on
**4200**, and the redirect URI has to match exactly, port included. The server prints the URL it
picked.

Run the dev server, click the button, sign in. The popup closes on its own and the parent page
shows the account.

## Why the provider is in the root layout

`app/auth/redirect/page.tsx` needs to render inside `MsalProvider`. If the provider sits in a
route group like `app/(app)/layout.tsx`, the redirect page renders outside it and MSAL is not
there. The root layout covers both.

## Files

| File | Job |
| --- | --- |
| `lib/msal.ts` | the `PublicClientApplication`, with `redirectUri` pointing at the page below |
| `app/providers.tsx` | calls `initialize()` before rendering, which v5 requires |
| `app/layout.tsx` | puts the provider at the root so the redirect page is covered |
| `app/page.tsx` | the sign-in button, plus a live log of MSAL's own events |
| `app/auth/redirect/page.tsx` | the whole point: one hook call |
| `app/global.css`, `*.module.css` | light and dark from `prefers-color-scheme`, no toggle |

The home page prints the redirect URI it resolved, so you can copy that exact string into Entra
instead of guessing the port. It also subscribes to `instance.addEventCallback` and lists what MSAL
reports, which is the fastest way to see where a broken flow stopped.

## No Entra tenant handy

The library's own test suite proves the mechanism without Azure. `src/msal-interop.spec.ts` builds
a `state` the way MSAL builds one and parses it with the real `parseAuthResponseFromUrl`, and
`src/channel-interop.spec.ts` has a listener read the message off a real `BroadcastChannel` the
same way MSAL's `waitForBridgeResponse` does. `npm test` runs both.
