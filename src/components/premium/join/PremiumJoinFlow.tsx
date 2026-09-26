"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";
import { ArrowLeft, Check, Lock, ShieldCheck } from "lucide-react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { usePremium } from "@/components/premium/usePremium";
import { openPremiumPortal, useHostedCheckout } from "@/components/premium/useHostedCheckout";
import {
  PremiumPaymentElement,
  type PaymentHandle,
} from "@/components/premium/join/PremiumPaymentElement";
import { PREMIUM_EXAMPLE_PATH, type PremiumPlan } from "@/lib/membership";
import {
  isStripeSubscriptionId,
  validateJoinEmail,
  validateJoinName,
  type JoinFieldErrors,
} from "@/lib/premium-join";

export type JoinPrices = {
  monthlyCents: number;
  yearlyCents: number;
  monthlyLabel: string;
  yearlyLabel: string;
  currency: string;
};

type Props = {
  initialPlan: PremiumPlan;
  prices: JoinPrices;
  trialDays: number;
  checkoutConfigured: boolean;
  publishableKey: string | null;
};

type Step = 1 | 2 | 3;
type Screen =
  | { kind: "loading" }
  | { kind: "step"; step: Step }
  | { kind: "confirming" }
  | { kind: "done"; synced: boolean }
  | { kind: "member"; signedIn: boolean }
  | { kind: "hosted" };

type SavedForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  plan: PremiumPlan;
  subscriptionId?: string;
};

const STORAGE_KEY = "aj-premium-join";

function readSaved(): SavedForm | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SavedForm>;
    return {
      email: typeof data.email === "string" ? data.email : "",
      firstName: typeof data.firstName === "string" ? data.firstName : "",
      lastName: typeof data.lastName === "string" ? data.lastName : "",
      phone: typeof data.phone === "string" ? data.phone : "",
      plan: data.plan === "monthly" ? "monthly" : "yearly",
      subscriptionId: isStripeSubscriptionId(data.subscriptionId) ? data.subscriptionId : undefined,
    };
  } catch {
    return null;
  }
}

function writeSaved(form: SavedForm | null) {
  try {
    if (!form) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // Private mode. The flow still works in one page view.
  }
}

function splitName(name: string | null | undefined): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] ?? "" };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ——— Small building blocks ——— */

function ProgressHeader({
  step,
  onBack,
  backLabel,
}: {
  step: Step | null;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="pj-header">
      <button type="button" className="pj-back" onClick={onBack} aria-label={backLabel}>
        <ArrowLeft size={20} strokeWidth={2.25} aria-hidden="true" />
      </button>
      {step ? (
        <div className="min-w-0 flex-1">
          <p className="pj-step-label" aria-live="polite">
            Step {step} of 3
          </p>
          <div
            className="pj-progress"
            role="progressbar"
            aria-label="Checkout progress"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={step}
          >
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= step ? "is-filled" : undefined} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  optional,
  error,
  hint,
  children,
  id,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="pj-field">
      <label htmlFor={id} className="pj-label">
        {label}
        {optional ? <span className="pj-optional"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="pj-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pj-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SecureNote() {
  return (
    <p className="pj-secure">
      <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
      Secure, encrypted checkout
    </p>
  );
}

/* ——— The flow ——— */

export function PremiumJoinFlow({
  initialPlan,
  prices,
  trialDays,
  checkoutConfigured,
  publishableKey,
}: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const premium = usePremium();
  const openSignIn = useReaderLoginPrompt();
  const fieldId = useId();

  const onsite = checkoutConfigured && Boolean(publishableKey);
  const [screenState, setScreen] = useState<Screen>({ kind: "loading" });
  const [plan, setPlan] = useState<PremiumPlan>(initialPlan);
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<JoinFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const paymentRef = useRef<PaymentHandle | null>(null);
  const initialized = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const sessionEmail = session?.user?.email?.trim().toLowerCase() || "";
  const signedIn = status === "authenticated";
  const emailLocked = signedIn && Boolean(sessionEmail);

  const hosted = useHostedCheckout({
    enabled: checkoutConfigured,
    isPremium: premium.isPremium,
    premiumLoading: premium.loading,
    returnTo: `/premium/join?plan=${plan}`,
  });

  // Signed-in members never see the form.
  const screen: Screen =
    screenState.kind === "step" && !premium.loading && premium.isPremium
      ? { kind: "member", signedIn: true }
      : screenState;

  const priceCents = plan === "yearly" ? prices.yearlyCents : prices.monthlyCents;
  const priceLabel = plan === "yearly" ? prices.yearlyLabel : prices.monthlyLabel;
  const unit = plan === "yearly" ? "year" : "month";
  const trialing = trialDays > 0;

  const confirmSubscription = useCallback(async (subscriptionId: string) => {
    setScreen({ kind: "confirming" });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const res = await fetch("/api/premium/subscribe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId }),
        });
        if (res.ok) {
          const data = (await res.json()) as { isPremium?: boolean };
          if (data.isPremium) {
            setScreen({ kind: "done", synced: true });
            return;
          }
        }
      } catch {
        // Try again below.
      }
      await sleep(1200 + attempt * 800);
    }
    // Stripe already confirmed on this page. The webhook finishes the sync.
    setScreen({ kind: "done", synced: false });
  }, []);

  // Decide the first screen once the session is known. Reads the URL (3DS
  // return) and sessionStorage, which only exist in the browser.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialized.current || status === "loading") return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const saved = readSaved();
    const sub = params.get("sub");
    const redirectStatus = params.get("redirect_status");

    if (saved) {
      setEmail(saved.email);
      setConfirmEmail(saved.email);
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      setPhone(saved.phone);
    }
    if (sessionEmail) {
      setEmail(sessionEmail);
      setConfirmEmail(sessionEmail);
    }
    if (signedIn && !saved?.firstName) {
      const name = splitName(session?.user?.name);
      setFirstName(name.first);
      setLastName(name.last);
    }

    if (!checkoutConfigured) {
      setScreen({ kind: "hosted" });
      return;
    }
    if (!onsite) {
      setScreen({ kind: "hosted" });
      return;
    }

    // Back from a 3DS or wallet redirect.
    if (sub && isStripeSubscriptionId(sub) && redirectStatus) {
      if (saved?.plan) setPlan(saved.plan);
      window.history.replaceState(null, "", `/premium/join?plan=${saved?.plan ?? initialPlan}`);
      if (redirectStatus === "succeeded" || redirectStatus === "processing") {
        void confirmSubscription(sub);
        return;
      }
      setFormError("Your payment wasn’t completed. Try again or use another card.");
      setScreen({ kind: "step", step: 3 });
      return;
    }

    setScreen({ kind: "step", step: sessionEmail ? 2 : 1 });
  }, [status, sessionEmail, signedIn, session, checkoutConfigured, onsite, initialPlan, confirmSubscription]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Move focus to the new heading on each step for screen readers.
  const screenKey = screen.kind === "step" ? `step-${screen.step}` : screen.kind;
  useEffect(() => {
    if (screen.kind === "loading") return;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [screenKey, screen.kind]);

  // Keep the URL's plan in sync without a navigation.
  useEffect(() => {
    if (screen.kind !== "step") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("plan") !== plan) {
      url.searchParams.set("plan", plan);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [plan, screen.kind]);

  function persist(extra?: Partial<SavedForm>) {
    writeSaved({
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      plan,
      ...extra,
    });
  }

  function goStep(step: Step) {
    setFormError(null);
    setScreen({ kind: "step", step });
  }

  function onBack() {
    if (screen.kind !== "step") {
      router.push("/premium");
      return;
    }
    if (screen.step === 3) goStep(2);
    else if (screen.step === 2 && !emailLocked) goStep(1);
    else router.push("/premium");
  }

  function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    const next = validateJoinEmail(email, confirmEmail);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setEmail(email.trim().toLowerCase());
    persist({ email: email.trim().toLowerCase() });
    goStep(2);
  }

  function submitName(event: React.FormEvent) {
    event.preventDefault();
    const next = validateJoinName({ firstName, lastName, phone });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    persist();
    goStep(3);
  }

  async function changeAccount() {
    if (!emailLocked) {
      goStep(1);
      return;
    }
    await signOut({ redirect: false });
    setEmail("");
    setConfirmEmail("");
    writeSaved(null);
    goStep(1);
    router.refresh();
  }

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    const handle = paymentRef.current;
    if (!handle || paying) return;
    setFormError(null);
    setPaying(true);
    try {
      const submitted = await handle.submit();
      if (submitted) {
        setFormError(submitted);
        return;
      }
      const res = await fetch("/api/premium/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email, firstName, lastName, phone }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        subscriptionId?: string;
        clientSecret?: string;
        intentType?: "payment" | "setup";
        complete?: boolean;
        alreadyMember?: boolean;
        signedIn?: boolean;
        fallback?: boolean;
        error?: string;
      };
      if (data.alreadyMember) {
        setScreen({ kind: "member", signedIn: Boolean(data.signedIn) });
        return;
      }
      if (data.fallback) {
        setScreen({ kind: "hosted" });
        return;
      }
      if (!res.ok || !data.subscriptionId) {
        setFormError(data.error || "Checkout isn’t available right now. Please try again.");
        return;
      }
      persist({ subscriptionId: data.subscriptionId });
      if (data.complete) {
        await confirmSubscription(data.subscriptionId);
        return;
      }
      if (!data.clientSecret || !data.intentType) {
        setFormError("Checkout isn’t available right now. Please try again.");
        return;
      }
      const returnUrl = `${window.location.origin}/premium/join?plan=${plan}&sub=${encodeURIComponent(data.subscriptionId)}`;
      const failure = await handle.confirm({
        clientSecret: data.clientSecret,
        intentType: data.intentType,
        returnUrl,
        billing: {
          email,
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim() || undefined,
        },
      });
      if (failure) {
        setFormError(failure);
        return;
      }
      await confirmSubscription(data.subscriptionId);
    } catch {
      setFormError("Something went wrong. You haven’t been charged. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  async function manage() {
    setPortalPending(true);
    const failed = await openPremiumPortal();
    if (failed) {
      setFormError(failed);
      setPortalPending(false);
    }
  }

  function promptSignIn(intro: string) {
    openSignIn({
      returnTo: "/account?section=settings&premium=welcome",
      intro,
      onAuthenticated: () => router.push("/account?section=settings&premium=welcome"),
    });
  }

  const payLabel = paying
    ? "Processing…"
    : trialing
      ? `Start ${trialDays}-day free trial`
      : `Pay ${priceLabel}`;

  /* ——— Screens ——— */

  let body: ReactNode = null;
  let headerStep: Step | null = null;

  if (screen.kind === "loading") {
    body = <div className="pj-loading" aria-busy="true" aria-label="Loading checkout" />;
  } else if (screen.kind === "hosted") {
    body = (
      <section className="pj-panel text-center">
        <h1 ref={headingRef} tabIndex={-1} className="pj-title">
          {checkoutConfigured ? "Join Alex Journeys Premium" : "Joining isn’t open yet"}
        </h1>
        <p className="pj-lead">
          {checkoutConfigured
            ? "Checkout continues on Stripe’s secure page. Sign in first so your membership lands on your account."
            : "Premium is almost ready. Check back soon."}
        </p>
        {checkoutConfigured ? (
          <>
            <button
              type="button"
              className="btn btn-primary pj-cta mt-8"
              disabled={hosted.pending}
              onClick={() => void hosted.start(plan)}
            >
              <Lock size={18} aria-hidden="true" />
              {hosted.pending ? "Opening checkout…" : "Continue to secure checkout"}
            </button>
            {hosted.error ? (
              <p className="pj-error mt-3" role="alert">
                {hosted.error}
              </p>
            ) : null}
            <SecureNote />
          </>
        ) : (
          <Link href="/premium" className="btn btn-secondary pj-cta mt-8">
            Back to Premium
          </Link>
        )}
      </section>
    );
  } else if (screen.kind === "confirming") {
    body = (
      <section className="pj-panel text-center" aria-busy="true">
        <span className="pj-spinner" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="pj-title mt-6">
          Confirming your membership…
        </h1>
        <p className="pj-lead">This takes a few seconds. Please keep this page open.</p>
      </section>
    );
  } else if (screen.kind === "done") {
    const buyerEmail = sessionEmail || email || readSaved()?.email || "";
    body = (
      <section className="pj-panel text-center">
        <span className="pj-success" aria-hidden="true">
          <Check size={30} strokeWidth={3} />
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="pj-title mt-6">
          Welcome to Premium
        </h1>
        <p className="pj-lead">
          {trialing
            ? `Your ${trialDays}-day free trial has started. You won’t be charged until it ends, and you can cancel anytime before then.`
            : "Your membership is active. Thanks for supporting the journal."}
          {buyerEmail ? (
            <>
              {" "}
              Your membership is linked to{" "}
              <strong className="text-heading [overflow-wrap:anywhere]">{buyerEmail}</strong>.
            </>
          ) : null}
        </p>
        {!screen.synced ? (
          <p className="pj-hint mt-3">It can take a minute to show on your account.</p>
        ) : null}

        {signedIn ? (
          <div className="pj-actions">
            <Link href="/account?section=settings&premium=welcome" className="btn btn-primary pj-cta">
              Go to your account
            </Link>
            <Link href={PREMIUM_EXAMPLE_PATH} className="btn btn-secondary pj-cta">
              Read a members-only story
            </Link>
          </div>
        ) : (
          <div className="pj-signin-card">
            <p className="font-display text-lg font-bold text-heading">One more step</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-text">
              Sign in or create your free account with{" "}
              <strong className="text-heading [overflow-wrap:anywhere]">{buyerEmail || "the email you used"}</strong>{" "}
              to unlock member stories, guides, and the rest of your perks.
            </p>
            <button
              type="button"
              className="btn btn-primary pj-cta mt-5"
              onClick={() =>
                promptSignIn(
                  buyerEmail
                    ? `Use ${buyerEmail}, the email you subscribed with.`
                    : "Use the email you subscribed with.",
                )
              }
            >
              Sign in to unlock Premium
            </button>
            <Link
              href="/login?mode=signup&callbackUrl=%2Faccount%3Fsection%3Dsettings%26premium%3Dwelcome"
              className="btn btn-ghost pj-cta mt-2"
            >
              Create an account
            </Link>
          </div>
        )}
      </section>
    );
  } else if (screen.kind === "member") {
    body = (
      <section className="pj-panel text-center">
        <span className="pj-success" aria-hidden="true">
          <Check size={30} strokeWidth={3} />
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="pj-title mt-6">
          You’re already a member
        </h1>
        <p className="pj-lead">
          {screen.signedIn
            ? "Premium is active on your account. Change your plan, update your card, or cancel from Manage membership."
            : "This email already has Premium. Sign in with it to see your perks and manage the membership."}
        </p>
        <div className="pj-actions">
          {screen.signedIn ? (
            <>
              <button
                type="button"
                className="btn btn-primary pj-cta"
                disabled={portalPending}
                onClick={() => void manage()}
              >
                {portalPending ? "Opening…" : "Manage membership"}
              </button>
              <Link href="/account?section=settings" className="btn btn-secondary pj-cta">
                Go to your account
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary pj-cta"
                onClick={() => promptSignIn(`Sign in with ${email} to manage Premium.`)}
              >
                Sign in
              </button>
              <button type="button" className="btn btn-ghost pj-cta" onClick={() => goStep(1)}>
                Use a different email
              </button>
            </>
          )}
        </div>
        {formError ? (
          <p className="pj-error mt-3" role="alert">
            {formError}
          </p>
        ) : null}
      </section>
    );
  } else if (screen.step === 1) {
    headerStep = 1;
    const emailId = `${fieldId}-email`;
    const confirmId = `${fieldId}-confirm`;
    body = (
      <form className="pj-panel" onSubmit={submitEmail} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className="pj-title">
          To get started, what’s your email?
        </h1>
        <div className="pj-fields">
          <Field
            id={emailId}
            label="Email"
            error={errors.email}
            hint="We’ll send your member access and Premium updates here."
          >
            <input
              id={emailId}
              className="pj-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${emailId}-error` : `${emailId}-hint`}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
          </Field>
          <Field id={confirmId} label="Confirm email" error={errors.confirmEmail}>
            <input
              id={confirmId}
              className="pj-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Type it again"
              value={confirmEmail}
              aria-invalid={Boolean(errors.confirmEmail)}
              aria-describedby={errors.confirmEmail ? `${confirmId}-error` : undefined}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
                if (errors.confirmEmail) setErrors((prev) => ({ ...prev, confirmEmail: undefined }));
              }}
            />
          </Field>
        </div>
        <div className="pj-bottom">
          <button type="submit" className="btn btn-primary pj-cta">
            Continue
          </button>
          <SecureNote />
          {!signedIn ? (
            <p className="pj-hint text-center">
              Already have an account?{" "}
              <button
                type="button"
                className="pj-link"
                onClick={() =>
                  openSignIn({
                    returnTo: `/premium/join?plan=${plan}`,
                    intro: "Sign in and we’ll fill in your details.",
                  })
                }
              >
                Sign in
              </button>
            </p>
          ) : null}
        </div>
      </form>
    );
  } else if (screen.step === 2) {
    headerStep = 2;
    const firstId = `${fieldId}-first`;
    const lastId = `${fieldId}-last`;
    const phoneId = `${fieldId}-phone`;
    body = (
      <form className="pj-panel" onSubmit={submitName} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className="pj-title">
          What should we call you?
        </h1>
        <p className="pj-as">
          Subscribing as <strong className="text-heading [overflow-wrap:anywhere]">{email}</strong>{" "}
          <button type="button" className="pj-link" onClick={() => void changeAccount()}>
            {emailLocked ? "not you?" : "change"}
          </button>
        </p>
        <div className="pj-fields">
          <Field id={firstId} label="First name" error={errors.firstName}>
            <input
              id={firstId}
              className="pj-input"
              autoComplete="given-name"
              value={firstName}
              maxLength={60}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? `${firstId}-error` : undefined}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: undefined }));
              }}
            />
          </Field>
          <Field id={lastId} label="Last name" error={errors.lastName}>
            <input
              id={lastId}
              className="pj-input"
              autoComplete="family-name"
              value={lastName}
              maxLength={60}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? `${lastId}-error` : undefined}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: undefined }));
              }}
            />
          </Field>
          <Field id={phoneId} label="Phone" optional error={errors.phone}>
            <input
              id={phoneId}
              className="pj-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              value={phone}
              maxLength={24}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${phoneId}-error` : undefined}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
            />
          </Field>
        </div>
        <div className="pj-bottom">
          <button type="submit" className="btn btn-primary pj-cta">
            Go to payment
          </button>
          <SecureNote />
        </div>
      </form>
    );
  } else {
    headerStep = 3;
    body = (
      <form className="pj-panel" onSubmit={pay} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className="pj-title">
          How would you like to pay?
        </h1>

        <div className="pj-summary">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="pj-eyebrow">Selected plan</p>
              <p className="mt-1.5 font-display text-lg font-bold leading-tight text-heading">
                Alex Journeys Premium
              </p>
              <p className="mt-0.5 text-[0.9375rem] text-muted">
                {plan === "yearly" ? "Yearly" : "Monthly"}
                {" · "}
                <button
                  type="button"
                  className="pj-link text-[0.875rem]"
                  aria-expanded={changingPlan}
                  onClick={() => setChangingPlan((open) => !open)}
                >
                  change
                </button>
              </p>
            </div>
            <p className="shrink-0 text-right font-display text-xl font-bold leading-tight text-heading">
              {priceLabel}
              <span className="font-sans text-sm font-medium text-muted"> / {unit}</span>
            </p>
          </div>
          {trialing ? (
            <p className="pj-trial">
              <Check size={16} strokeWidth={3} aria-hidden="true" />
              {trialDays} days free, then {priceLabel}/{unit}
            </p>
          ) : null}
          {changingPlan ? (
            <div className="pj-plan-options" role="radiogroup" aria-label="Plan">
              {(["monthly", "yearly"] as const).map((option) => {
                const selected = option === plan;
                const label = option === "yearly" ? prices.yearlyLabel : prices.monthlyLabel;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`pj-plan-option${selected ? " is-selected" : ""}`}
                    onClick={() => {
                      setPlan(option);
                      setChangingPlan(false);
                      persist({ plan: option });
                    }}
                  >
                    <span className="font-semibold text-heading">
                      {option === "yearly" ? "Yearly" : "Monthly"}
                    </span>
                    <span className="text-sm text-muted">
                      {label} / {option === "yearly" ? "year" : "month"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="pj-payment">
          <PremiumPaymentElement
            ref={paymentRef}
            publishableKey={publishableKey ?? ""}
            mode={trialing ? "setup" : "subscription"}
            amount={priceCents}
            currency={prices.currency}
            defaults={{
              email,
              name: `${firstName} ${lastName}`.trim(),
              phone: phone.trim(),
            }}
            onReady={() => {
              setPaymentReady(true);
              setPaymentFailed(false);
            }}
            onLoadError={() => setPaymentFailed(true)}
          />
          {paymentFailed ? (
            <div className="pj-payment-fallback">
              <p>The card form couldn’t load. You can finish on Stripe’s secure checkout page instead.</p>
              <button
                type="button"
                className="btn btn-primary pj-cta mt-4"
                disabled={hosted.pending}
                onClick={() => void hosted.start(plan)}
              >
                <Lock size={18} strokeWidth={2.25} aria-hidden="true" />
                {hosted.pending ? "Opening checkout…" : "Continue on Stripe Checkout"}
              </button>
              {hosted.error ? (
                <p className="pj-error" role="alert">
                  {hosted.error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {formError ? (
          <p className="pj-error pj-form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="pj-bottom">
          {paymentFailed ? null : (
            <button
              type="submit"
              className="btn btn-primary pj-cta"
              disabled={paying || !paymentReady}
            >
              <Lock size={18} strokeWidth={2.25} aria-hidden="true" />
              {payLabel}
            </button>
          )}
          <p className="pj-terms">
            {trialing
              ? `You won’t be charged today. After ${trialDays} days, Premium renews automatically at ${priceLabel}/${unit} until you cancel.`
              : `Premium renews automatically at ${priceLabel}/${unit} until you cancel.`}{" "}
            Cancel anytime from your account. By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2">
              Terms
            </Link>
            .
          </p>
          <SecureNote />
        </div>
      </form>
    );
  }

  const showHeader = screen.kind === "step" || screen.kind === "hosted";

  return (
    <div className="pj-shell">
      {showHeader ? (
        <ProgressHeader
          step={headerStep}
          onBack={onBack}
          backLabel={
            screen.kind === "step" && (screen.step === 3 || (screen.step === 2 && !emailLocked))
              ? "Back to the previous step"
              : "Back to Premium"
          }
        />
      ) : null}
      {body}
    </div>
  );
}
