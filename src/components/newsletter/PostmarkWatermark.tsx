/** Decorative postal cancel / postmark for the newsletter slab. */
export function PostmarkWatermark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      {/* Outer ring */}
      <circle
        cx="160"
        cy="160"
        r="148"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="10 8"
        opacity="0.55"
      />
      <circle
        cx="160"
        cy="160"
        r="132"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
      />
      {/* Curved text path */}
      <defs>
        <path
          id="postmark-arc-top"
          d="M 40 160 A 120 120 0 0 1 280 160"
        />
        <path
          id="postmark-arc-bottom"
          d="M 280 160 A 120 120 0 0 1 40 160"
        />
      </defs>
      <text
        fill="currentColor"
        fontSize="16"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="4"
        opacity="0.7"
      >
        <textPath href="#postmark-arc-top" startOffset="50%" textAnchor="middle">
          ALEX JOURNEYS
        </textPath>
      </text>
      <text
        fill="currentColor"
        fontSize="13"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        letterSpacing="3"
        opacity="0.55"
      >
        <textPath
          href="#postmark-arc-bottom"
          startOffset="50%"
          textAnchor="middle"
        >
          FROM THE ROAD · EST. JOURNAL
        </textPath>
      </text>
      {/* Center date stamp */}
      <text
        x="160"
        y="148"
        textAnchor="middle"
        fill="currentColor"
        fontSize="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        letterSpacing="2"
        opacity="0.65"
      >
        POST
      </text>
      <text
        x="160"
        y="178"
        textAnchor="middle"
        fill="currentColor"
        fontSize="14"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        letterSpacing="3"
        opacity="0.5"
      >
        MARK
      </text>
      {/* Cancel bars */}
      <g opacity="0.35" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <line x1="20" y1="70" x2="300" y2="95" />
        <line x1="15" y1="90" x2="305" y2="115" />
        <line x1="25" y1="225" x2="295" y2="250" />
        <line x1="20" y1="245" x2="300" y2="270" />
      </g>
    </svg>
  );
}

export function PostageStamp({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative max-w-full overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      <div className="relative overflow-hidden rounded-sm border-2 border-dashed border-hero-type/35 bg-accent/90 px-3 py-2 text-center shadow-lg shadow-black/20">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-heading">
          AIR MAIL
        </p>
        <p className="mt-1 font-display text-2xl font-extrabold leading-none text-heading">
          AJ
        </p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-heading/70">
          JOURNAL
        </p>
        <span className="absolute left-0 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-heading/80" />
        <span className="absolute right-0 top-1/2 size-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-heading/80" />
      </div>
    </div>
  );
}
