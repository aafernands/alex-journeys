"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import type { FlightCardPayment as CardPayment } from "@/lib/flights";

type Props = {
  payment: CardPayment;
  busy: boolean;
  onPaid: (transactionId: string) => void;
  onError: (message: string) => void;
};

/**
 * Confirms the Nuitee PaymentIntent in the browser.
 * `clientSecret` and `publishableKey` come from the prebook response.
 */
export function FlightCardPayment({ payment, busy, onPaid, onError }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let dead = false;
    let card: StripeCardElement | null = null;
    void loadStripe(payment.publishableKey).then((stripe) => {
      if (dead || !stripe || !mountRef.current) return;
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
