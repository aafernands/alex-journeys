"use client";

export function Newsletter() {
  return (
    <section
      id="newsletter"
      className="border-b border-sand/50 bg-cream-deep/50"
      aria-labelledby="newsletter-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-sand/70 bg-surface px-6 py-12 shadow-[0_20px_60px_-36px_rgba(28,25,23,0.35)] md:px-14 md:py-16">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-terracotta/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-sage/15 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <p className="sample-badge">Sample CTA · not a live signup</p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
              Newsletter & contact
            </p>
            <h2
              id="newsletter-heading"
              className="font-display mt-2 text-3xl tracking-tight text-ink sm:text-4xl md:text-5xl"
            >
              Letters from the road
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
              Occasional notes on destinations, stays worth booking, and the
              lifestyle details that don’t fit in a caption. Connect your form
              provider when you’re ready — this UI is a polished placeholder.
            </p>

            <form
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
              }}
              aria-label="Newsletter signup placeholder"
            >
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
                className="min-h-12 flex-1 rounded-full border border-sand bg-cream px-5 text-sm text-ink placeholder:text-muted transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/30"
              />
              <button
                type="submit"
                className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-cream transition hover:bg-terracotta focus-visible:outline-offset-4"
              >
                Subscribe
              </button>
            </form>

            <p className="mt-4 text-xs text-muted">
              Or say hello at{" "}
              <a
                href="mailto:hello@alexjournly.com"
                className="font-medium text-ink underline decoration-sand underline-offset-4 transition hover:text-terracotta hover:decoration-terracotta"
              >
                hello@alexjournly.com
              </a>{" "}
              <span className="opacity-70">(placeholder address)</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
