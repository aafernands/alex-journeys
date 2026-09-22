"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import type { FlightCardPayment as CardPayment } from "@/lib/flights";

type Props = {
  payment: CardPayment;
  busy: boolean;
  sandbox: boolean;
  onAttempt: () => void;
  onPaid: (transactionId: string) => void;
  onError: (message: string) => void;
};

/**
 * Confirms the Nuitee PaymentIntent in the browser.
 * `clientSecret` and `publishableKey` come from the prebook response.
 */
export function FlightCardPayment({ payment, busy, sandbox, onAttempt, onPaid, onError }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let dead = false;
    let card: StripeCardElement | null = null;
    void loadStripe(payment.publishableKey).then((stripe) => {
      if (dead) return;
      if (!stripe || !mountRef.current) {
        onErrorRef.current(
          "The card form could not be loaded. Search again and pick the flight once more.",
        );
        return;
      }
      stripeRef.current = stripe;
      card = stripe.elements().create("card");
      card.mount(mountRef.current);
      cardRef.current = card;
      setReady(true);
    });
    return () => {
      dead = true;
      card?.unmount();
      cardRef.current = null;
      stripeRef.current = null;
    };
  }, [payment.publishableKey]);

  async function pay() {
    const stripe = stripeRef.current;
    const card = cardRef.current;
    if (!stripe || !card) {
      onError("The card form is still loading.");
      return;
    }
    onAttempt();
    setPaying(true);
    try {
      const result = await stripe.confirmCardPayment(payment.clientSecret, {
        payment_method: { card },
      });
      if (result.error) {
        onError(result.error.message || "The card was declined.");
        return;
      }
      const status = result.paymentIntent?.status;
      if (status !== "succeeded" && status !== "requires_capture") {
        onError("The card payment is not confirmed yet.");
        return;
      }
      onPaid(payment.transactionId);
    } catch {
      onError("The card payment could not be confirmed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="plan-stack">
      {sandbox ? (
        <p className="text-sm text-muted">
          Sandbox card 4242 4242 4242 4242, any future expiry, any CVC. Nuitee does not charge it.
        </p>
      ) : null}
      <div ref={mountRef} className="rounded-md border border-border bg-white px-3 py-3" />
      <div className="plan-actions plan-sticky plan-sticky-page plan-sticky-solo">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || paying || !ready}
          onClick={() => void pay()}
        >
          {paying || busy ? "Confirming payment…" : "Pay and book"}
        </button>
      </div>
    </div>
  );
}
