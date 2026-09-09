"use client";

import { usePopupRedirect } from "next-msal-popup/react";

export default function AuthRedirectPage() {
  const result = usePopupRedirect();

  if (result?.status === "no-auth-response") {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Sign-in did not complete.</p>
        <p>{result.reason}</p>
      </main>
    );
  }

  return <p style={{ padding: 24, fontFamily: "system-ui" }}>Signing you in...</p>;
}
