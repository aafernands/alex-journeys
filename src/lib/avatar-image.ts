/**
 * Profile photo hosts that next/image may optimize.
 * Keep in step with `images.remotePatterns` in next.config.ts.
 *
 * Google photos already go through next/image. X photos must too: a plain
 * img request to pbs.twimg.com / abs.twimg.com is often blocked, so the
 * account page showed initials while the header avatar rendered.
 */

const OPTIMIZED_AVATAR_HOSTS: { host: string; pathnamePrefix: string }[] = [
  { host: "lh3.googleusercontent.com", pathnamePrefix: "/" },
  { host: "pbs.twimg.com", pathnamePrefix: "/profile_images/" },
  {
    host: "abs.twimg.com",
    pathnamePrefix: "/sticky/default_profile_images/",
  },
];

export function isOptimizedAvatarSrc(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return OPTIMIZED_AVATAR_HOSTS.some(
    (rule) =>
      url.hostname === rule.host && url.pathname.startsWith(rule.pathnamePrefix),
  );
}
