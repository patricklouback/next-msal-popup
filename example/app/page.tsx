"use client";

import { type EventMessage, EventType, InteractionStatus } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Tone = "plain" | "pending" | "ok" | "fail";

interface LogRow {
  id: number;
  time: string;
  event: string;
  detail?: string;
  tone: Tone;
}

const TONE_CLASS: Record<Tone, string> = {
  plain: "",
  pending: styles.tone_pending,
  ok: styles.tone_ok,
  fail: styles.tone_fail,
};

const TONE_BY_EVENT: Partial<Record<EventType, Tone>> = {
  [EventType.LOGIN_START]: "pending",
  [EventType.POPUP_OPENED]: "pending",
  [EventType.LOGIN_SUCCESS]: "ok",
  [EventType.ACQUIRE_TOKEN_SUCCESS]: "ok",
  [EventType.LOGIN_FAILURE]: "fail",
  [EventType.ACQUIRE_TOKEN_FAILURE]: "fail",
  [EventType.LOGOUT_SUCCESS]: "plain",
};

function stamp(): string {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function detailOf(message: EventMessage): string | undefined {
  if (message.error) return message.error.message;
  const payload = message.payload as { account?: { username?: string } } | null;
  return payload?.account?.username;
}

export default function Index() {
  const { instance, accounts, inProgress } = useMsal();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState("");

  const account = accounts[0];
  const busy = inProgress !== InteractionStatus.None;

  useEffect(() => {
    setRedirectUri(`${window.location.origin}/auth/redirect`);
  }, []);

  useEffect(() => {
    const id = instance.addEventCallback((message: EventMessage) => {
      setRows((current) => [
        ...current,
        {
          id: current.length,
          time: stamp(),
          event: message.eventType,
          detail: detailOf(message),
          tone: TONE_BY_EVENT[message.eventType] ?? "plain",
        },
      ]);
    });

    return () => {
      if (id) instance.removeEventCallback(id);
    };
  }, [instance]);

  return (
    <div className={styles.shell}>
      <div className={styles.column}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowName}>next-msal-popup</span>
          <span>popup bridge test</span>
        </div>

        <h1 className={styles.status}>
          {account ? (
            <>
              Signed in as <span className={styles.account}>{account.username}</span>
            </>
          ) : busy ? (
            "Waiting for the popup"
          ) : (
            "Not signed in"
          )}
        </h1>

        <p className={styles.statusNote}>
          {account
            ? "The popup posted its response on the channel and closed itself. That is the whole job."
            : "Sign in, then watch the log below. The popup should close on its own once it hands the response to this window."}
        </p>

        <div className={styles.actions}>
          {account ? (
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => instance.logoutPopup()}
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => {
                setError(null);
                instance
                  .loginPopup({ scopes: ["User.Read"] })
                  .catch((cause: unknown) =>
                    setError(cause instanceof Error ? cause.message : String(cause)),
                  );
              }}
            >
              Sign in with Microsoft
            </button>
          )}
          <button
            type="button"
            className={styles.secondary}
            disabled={rows.length === 0}
            onClick={() => setRows([])}
          >
            Clear log
          </button>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>Redirect URI to register in Entra</div>
          <div className={styles.fieldValue}>{redirectUri || " "}</div>
          <p className={styles.fieldHint}>
            Register it under the Single-page application platform. The port has to match, and Nx
            serves on 4200 rather than the 3000 you get from plain <code>next dev</code>.
          </p>
        </div>

        <div className={styles.logHead}>
          <span>MSAL events</span>
          <span>{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <p className={styles.empty}>Nothing yet. Events land here as the flow runs.</p>
        ) : (
          <ul className={styles.log}>
            {rows.map((row) => (
              <li key={row.id} className={`${styles.row} ${TONE_CLASS[row.tone]}`}>
                <span className={styles.time}>{row.time}</span>
                <span>
                  <span className={styles.event}>{row.event}</span>
                  {row.detail ? <div className={styles.detail}>{row.detail}</div> : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    </div>
  );
}
