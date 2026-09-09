"use client";

import { useMsal } from "@azure/msal-react";

export default function Home() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  if (account) {
    return (
      <main style={{ padding: 32, fontFamily: "system-ui" }}>
        <p>
          Signed in as <strong>{account.username}</strong>
        </p>
        <button type="button" onClick={() => instance.logoutPopup()}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <button
        type="button"
        onClick={() => {
          instance.loginPopup({ scopes: ["User.Read"] }).catch((error) => {
            console.error(error);
          });
        }}
      >
        Sign in with Microsoft
      </button>
    </main>
  );
}
