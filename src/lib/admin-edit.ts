/** CMS destinations for public-site admin shortcuts (links only). */

export type AdminEditLink = {
  href: string;
  label: string;
};

export function cmsEditPostHref(slug: string, draft = false): string {
  const path = `/cms/edit/${slug}`;
  return draft ? `${path}?draft=1` : path;
}

export function cmsEditPageHref(slug: string): string {
  return `/cms/pages/edit/${slug}`;
}

export function cmsEditDestinationHref(slug: string): string {
  return `/cms/destinations/edit/${slug}`;
}

export const CMS_HOME_HREF = "/cms";
export const CMS_COMMENTS_HREF = "/cms/comments";
export const CMS_DESIGN_HREF = "/cms/design";
export const CMS_DESTINATIONS_HREF = "/cms/destinations";
