import Link from "next/link";

/** Quiet "Need help?" line under sign-in and password screens. */
export function NeedHelpLink({ className = "mt-4" }: { className?: string }) {
  return (
    <p className={`${className} text-center text-sm text-muted`}>
      Need help?{" "}
      <Link href="/contact" className="font-semibold text-accent hover:underline">
        Get in touch
      </Link>
    </p>
  );
}
