"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export function ConfirmEmailClient({ token }: { token: string | null }) {
  const { data: session, update, status } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const statusRef = useRef(status);
  statusRef.current = status;
  const [state, setState] = useState<
    "idle" | "loading" | "success" | "error"
  >(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Confirming your new email…" : "Missing confirmation token.",
  );
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/auth/change-email/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          error?: string;
          message?: string;
          userId?: string;
          email?: string;
          name?: string | null;
          image?: string | null;
        };
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          setMessage(data.error || "Could not confirm email change.");
          return;
        }
        setState("success");
        setMessage(data.message || "Email updated.");
        setEmail(typeof data.email === "string" ? data.email : null);
        const liveSession = sessionRef.current;
        if (
          statusRef.current === "authenticated" &&
          data.userId &&
          liveSession?.user?.id === data.userId
        ) {
          try {
            await update({
              email: data.email,
              name: data.name,
              image: data.image,
            });
          } catch {
            /* session refresh is best-effort; page still shows success */
          }
        }
      } catch {
        if (cancelled) return;
        setState("error");
        setMessage("Network error. Try again or request a new link.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Intentionally once per token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="panel p-6 md:p-8">
      <h1 className="font-display text-2xl font-bold text-heading">
        Confirm email
      </h1>
      {state === "loading" ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
      {state === "success" ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-heading" role="status">
            {message}
            {email ? (
              <>
                {" "}
                Your account email is now{" "}
                <span className="font-semibold">{email}</span>.
              </>
            ) : null}
          </p>
          <p className="text-sm text-muted">
            If the header still shows the old address, refresh the page or sign
            out and back in.
          </p>
          <Link href="/account" className="btn btn-secondary inline-flex">
            Back to account
          </Link>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-medium text-red-600" role="alert">
            {message}
          </p>
          <Link href="/account" className="btn btn-secondary inline-flex">
            Back to account
          </Link>
        </div>
      ) : null}
    </div>
  );
}
