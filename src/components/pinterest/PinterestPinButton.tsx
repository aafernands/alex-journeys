import { SocialPinterestIcon } from "@/components/icons/SocialIcons";
import { buildPinterestShareUrl } from "@/lib/pinterest";

type Props = {
  pageUrl: string;
  mediaUrl: string;
  description?: string;
};

/** Lightweight Pin control — a share link, not the official Pinterest widget. */
export function PinterestPinButton({
  pageUrl,
  mediaUrl,
  description,
}: Props) {
  const href = buildPinterestShareUrl({ pageUrl, mediaUrl, description });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Pin on Pinterest"
      className="pinterest-pin-btn"
    >
      <SocialPinterestIcon size={16} />
    </a>
  );
}
