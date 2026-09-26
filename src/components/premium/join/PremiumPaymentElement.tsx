"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  loadStripe,
  type Stripe,
  type StripeElements,
  type StripePaymentElement,
} from "@stripe/stripe-js";
import { premiumStripeAppearance, STRIPE_FONTS } from "@/components/premium/join/stripe-appearance";

export type ConfirmInput = {
  clientSecret: string;
  intentType: "payment" | "setup";
  returnUrl: string;
  billing: { email: string; name: string; phone?: string };
};

export type PaymentHandle = {
  /** Validate the fields. Returns an error message, or null when complete. */
  submit: () => Promise<string | null>;
  /** Confirm the intent (3DS runs in Stripe's modal). Error message or null. */
  confirm: (input: ConfirmInput) => Promise<string | null>;
};

type Props = {
  ref?: Ref<PaymentHandle | null>;
  publishableKey: string;
  mode: "subscription" | "setup";
  amount: number;
  currency: string;
  defaults: { email: string; name: string; phone: string };
  onReady: () => void;
  onLoadError: () => void;
};

const stripeByKey = new Map<string, Promise<Stripe | null>>();

function stripeFor(key: string): Promise<Stripe | null> {
  let pending = stripeByKey.get(key);
  if (!pending) {
    pending = loadStripe(key).catch(() => null);
    stripeByKey.set(key, pending);
  }
  return pending;
}

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

const GENERIC = "Your payment couldn’t be completed. Check your details or try another card.";

/**
 * Stripe Payment Element in deferred-intent mode: the fields render before a
 * subscription exists; the subscription is created on Pay and confirmed here.
 * Shows card plus whatever wallets Stripe offers (Apple Pay, Google Pay, Link).
 */
export function PremiumPaymentElement({
  ref,
  publishableKey,
  mode,
  amount,
  currency,
  defaults,
  onReady,
  onLoadError,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const elementRef = useRef<StripePaymentElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const initial = useRef({ mode, amount, currency, defaults, onReady, onLoadError });

  useEffect(() => {
    initial.current.onReady = onReady;
    initial.current.onLoadError = onLoadError;
  }, [onReady, onLoadError]);

  // Mount once per key.
  useEffect(() => {
    let cancelled = false;
    const start = initial.current;
    // No key never reaches step 3 (the page falls back to hosted Checkout).
    if (!publishableKey) return;
    const timeout = window.setTimeout(() => {
      if (!cancelled && !elementRef.current) {
        setFailed(true);
        initial.current.onLoadError();
      }
    }, 15_000);

    void stripeFor(publishableKey).then((stripe) => {
      if (cancelled) return;
      if (!stripe || !host.current) {
        setFailed(true);
        initial.current.onLoadError();
        return;
      }
      stripeRef.current = stripe;
      const elements = stripe.elements({
        mode: start.mode,
        currency: start.currency,
        ...(start.mode === "subscription" ? { amount: start.amount } : {}),
        appearance: premiumStripeAppearance(isDark()),
        fonts: STRIPE_FONTS,
      });
      const element = elements.create("payment", {
        layout: { type: "tabs", defaultCollapsed: false },
        business: { name: "Alex Journeys" },
        defaultValues: {
          billingDetails: {
            email: start.defaults.email,
            name: start.defaults.name,
            ...(start.defaults.phone ? { phone: start.defaults.phone } : {}),
          },
        },
      });
      element.on("ready", () => {
        window.clearTimeout(timeout);
        setReady(true);
        initial.current.onReady();
      });
      element.on("loaderror", () => {
        window.clearTimeout(timeout);
        setFailed(true);
        initial.current.onLoadError();
      });
      element.mount(host.current);
      elementsRef.current = elements;
      elementRef.current = element;
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      elementRef.current?.destroy();
      elementRef.current = null;
      elementsRef.current = null;
    };
  }, [publishableKey]);

  // Plan switch changes the amount shown to wallets.
  useEffect(() => {
    const elements = elementsRef.current;
    if (!elements) return;
    elements.update(
      mode === "subscription" ? { mode, amount, currency } : { mode, currency },
    );
  }, [mode, amount, currency]);

  // Follow the site's light/dark appearance.
  useEffect(() => {
    const root = document.documentElement;
    let dark = isDark();
    const observer = new MutationObserver(() => {
      const next = isDark();
      if (next === dark) return;
      dark = next;
      elementsRef.current?.update({ appearance: premiumStripeAppearance(next) });
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const elements = elementsRef.current;
        if (!elements) return "The card form isn’t ready yet.";
        const { error } = await elements.submit();
        return error ? error.message || GENERIC : null;
      },
      async confirm({ clientSecret, intentType, returnUrl, billing }) {
        const stripe = stripeRef.current;
        const elements = elementsRef.current;
        if (!stripe || !elements) return "The card form isn’t ready yet.";
        const confirmParams = {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              email: billing.email,
              name: billing.name,
              ...(billing.phone ? { phone: billing.phone } : {}),
            },
          },
        };
        if (intentType === "setup") {
          const result = await stripe.confirmSetup({
            elements,
            clientSecret,
            confirmParams,
            redirect: "if_required",
          });
          if (result.error) return result.error.message || GENERIC;
          const status = result.setupIntent?.status;
          return status === "succeeded" || status === "processing" ? null : GENERIC;
        }
        const result = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams,
          redirect: "if_required",
        });
        if (result.error) return result.error.message || GENERIC;
        const status = result.paymentIntent?.status;
        return status === "succeeded" || status === "processing" ? null : GENERIC;
      },
    }),
    [],
  );

  return (
    <div className="pj-element-wrap">
      {!ready && !failed && publishableKey ? (
        <div className="pj-element-skeleton" role="status" aria-label="Loading secure payment form">
          <span className="pj-skel pj-skel-tabs" />
          <span className="pj-skel pj-skel-label" />
          <span className="pj-skel pj-skel-input" />
          <div className="grid grid-cols-2 gap-3">
            <span className="pj-skel pj-skel-input" />
            <span className="pj-skel pj-skel-input" />
          </div>
          <p className="pj-skel-note">Loading secure payment form…</p>
        </div>
      ) : null}
      <div ref={host} className={ready ? undefined : "pj-element-hidden"} />
    </div>
  );
}
