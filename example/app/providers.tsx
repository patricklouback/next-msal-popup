"use client";

import { MsalProvider } from "@azure/msal-react";
import { type ReactNode, useEffect, useState } from "react";
import { msalInstance } from "../lib/msal";

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    msalInstance.initialize().then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
