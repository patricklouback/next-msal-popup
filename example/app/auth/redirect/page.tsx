"use client";

import { usePopupRedirect } from "next-msal-popup/react";
import styles from "./redirect.module.css";

export default function AuthRedirectPage() {
  const result = usePopupRedirect();

  if (result?.status === "no-auth-response") {
    return (
      <main className={styles.shell}>
        <div className={styles.panel}>
          <div className={styles.label}>next-msal-popup</div>
          <p className={`${styles.line} ${styles.failLine}`}>No auth response on this URL</p>
          <div className={styles.reason}>{result.reason}</div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.label}>next-msal-popup</div>
        <p className={styles.line}>Handing the response to the parent window</p>
        <div className={styles.track}>
          <div className={styles.bar} />
        </div>
      </div>
    </main>
  );
}
