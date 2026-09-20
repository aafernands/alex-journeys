type SocialIconProps = {
  size?: number;
  className?: string;
};

export function SocialInstagramIcon({
  size = 22,
  className,
}: SocialIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SocialYouTubeIcon({
  size = 22,
  className,
}: SocialIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 8.5A3.5 3.5 0 0 1 6 5h12a3.5 3.5 0 0 1 3.5 3.5v7A3.5 3.5 0 0 1 18 19H6a3.5 3.5 0 0 1-3.5-3.5v-7Z" />
      <path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SocialPinterestIcon({
  size = 22,
  className,
}: SocialIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C6.5 2 2 6.3 2 11.6c0 4 2.5 7.4 6.1 8.7-.1-.7-.2-1.9 0-2.7.2-.7 1.2-5 1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.3 1 0.5 1.8 1.5 1.8 1.8 0 3.1-2.2 3.1-4.8 0-2-1.4-3.5-3.9-3.5-2.8 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.7 2.3.1.1.1.2.1.3l-.3 1c0 .1-.1.2-.3.1-1.2-.5-1.8-1.9-1.8-3.4 0-2.6 2.2-5.7 6.6-5.7 3.5 0 5.8 2.5 5.8 5.3 0 3.6-2 6.3-5 6.3-1 0-1.9-.5-2.2-1.2l-.6 2.3c-.2.8-.8 1.8-1.2 2.4.9.3 1.9.4 2.9.4 5.5 0 10-4.3 10-9.6C22 6.3 17.5 2 12 2Z" />
    </svg>
  );
}

export function SocialCoffeeIcon({ size = 22, className }: SocialIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8h13v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
      <path d="M16 8h2.5a3.5 3.5 0 0 1 0 7H16" />
      <path d="M6 2v2M10 2v2M14 2v2" />
    </svg>
  );
}
