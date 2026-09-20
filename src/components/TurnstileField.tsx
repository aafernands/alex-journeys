"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
      appearance?: "always" | "execute" | "interaction-only";
      size?: "normal" | "compact" | "flexible";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
  getResponse?: (widgetId?: string) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileFieldHandle = {
  reset: () => void;
  getToken: () => string | null;
};

type Props = {
  onToken: (token: string | null) => void;
  className?: string;
  /** Called when the widget fails to load or errors. */
  onError?: () => void;
};

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Turnstile script failed to load")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });
}

/**
 * Cloudflare Turnstile widget (managed mode — green check).
 * Renders only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.
 */
export const TurnstileField = forwardRef<TurnstileFieldHandle, Props>(
  function TurnstileField({ onToken, className, onError }, ref) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    const onErrorRef = useRef(onError);
    const reactId = useId();
    const containerId = `cf-turnstile-${reactId.replace(/:/g, "")}`;

    onTokenRef.current = onToken;
    onErrorRef.current = onError;

    const setToken = useCallback((token: string | null) => {
      tokenRef.current = token;
      onTokenRef.current(token);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          setToken(null);
          if (widgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.reset(widgetIdRef.current);
            } catch {
              /* ignore */
            }
          }
        },
        getToken: () => tokenRef.current,
      }),
      [setToken],
    );

    useEffect(() => {
      if (!siteKey || !containerRef.current) return;

      let cancelled = false;

      (async () => {
        try {
          await loadTurnstileScript();
          if (cancelled || !containerRef.current || !window.turnstile) return;

          // Avoid double-render in Strict Mode
          if (widgetIdRef.current) {
            try {
              window.turnstile.remove(widgetIdRef.current);
            } catch {
              /* ignore */
            }
            widgetIdRef.current = null;
          }

          containerRef.current.innerHTML = "";
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "auto",
            size: "normal",
            callback: (token: string) => {
              if (!cancelled) setToken(token);
            },
            "error-callback": () => {
              if (!cancelled) {
                setToken(null);
                onErrorRef.current?.();
              }
            },
            "expired-callback": () => {
              if (!cancelled) setToken(null);
            },
            "timeout-callback": () => {
              if (!cancelled) {
                setToken(null);
                onErrorRef.current?.();
              }
            },
          });
          widgetIdRef.current = id;
        } catch {
          if (!cancelled) {
            setToken(null);
            onErrorRef.current?.();
          }
        }
      })();

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
          widgetIdRef.current = null;
        }
        setToken(null);
      };
    }, [siteKey, setToken]);

    if (!siteKey) {
      if (process.env.NODE_ENV === "development") {
        return (
          <p
            className={`text-xs text-muted ${className ?? ""}`}
            role="status"
          >
            Turnstile not configured (set NEXT_PUBLIC_TURNSTILE_SITE_KEY).
          </p>
        );
      }
      return null;
    }

    return (
      <div className={className}>
        <div
          ref={containerRef}
          id={containerId}
          className="cf-turnstile"
          aria-label="Security verification"
        />
      </div>
    );
  },
);

/** True when the public site key is present (widget will render). */
export function isTurnstileWidgetEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}
