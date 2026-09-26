import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminPublicChrome,
  AdminSectionEdit,
} from "@/components/admin/AdminPublicChrome";
import { PostBookingBox } from "@/components/blog/PostBookingBox";
import { PostContent } from "@/components/blog/PostContent";
import { PinnableImage } from "@/components/pinterest/PinnableImage";
import { PostItineraryTimeline } from "@/components/blog/PostItineraryTimeline";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { CommentSection } from "@/components/blog/CommentSection";
import { PostActions } from "@/components/blog/PostActions";
import { RecordView } from "@/components/account/RecordView";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { JsonLd } from "@/components/JsonLd";
import {
  formatPostDate,
  getPostBySlug,
  getRelatedPosts,
  postUpdatedDisplayDate,
} from "@/lib/posts";
import { publicPostPath } from "@/lib/public-paths";
import {
  resolvedSeoDescription,
  resolvedSeoTitle,
} from "@/lib/post-seo";
import { blogPostingJsonLd } from "@/lib/seo";
import { site } from "@/data/content";
import { cmsEditPostHref } from "@/lib/admin-edit";
import { bookingDestinationLabel } from "@/lib/post-types";
import { auth } from "@/auth";
import { PremiumGate } from "@/components/premium/PremiumGate";
import { isPremium } from "@/lib/membership";
import { getReaderMembership } from "@/lib/membership-store";

/** Pull simple TOC from h2 text in HTML when present */
function extractToc(html: string): { id: string; label: string }[] {
  const headings: { id: string; label: string }[] = [];
  const re = /<h2[^>]*>(.*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, "").trim();
    if (!label) continue;
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    headings.push({ id, label });
  }
  return headings.slice(0, 8);
}

type BlogPostViewProps = {
  slug: string;
};

export async function BlogPostView({ slug }: BlogPostViewProps) {
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const toc = extractToc(post.contentHtml);
  const related = getRelatedPosts(slug, 3);
  const updatedAt = postUpdatedDisplayDate(post);
  const jsonLd = blogPostingJsonLd({
    title: resolvedSeoTitle(post),
    description: resolvedSeoDescription(post),
    path: publicPostPath(slug),
    datePublished: post.date,
    dateModified: post.updatedAt ?? post.date,
    image: post.featuredImage?.url ?? null,
  });

  const editHref = cmsEditPostHref(slug);
  const bookingDestination = post.bookingDestination?.trim() ?? "";
  const session = await auth();
  const userId = session?.user?.id?.trim() ?? "";
  let member = false;
  if (post.membersOnly && userId) {
    try {
      member = isPremium({
        membership: await getReaderMembership(userId, session?.user?.email),
      });
    } catch (err) {
      console.warn("[premium] story gate lookup failed:", err);
    }
  }
  const locked = post.membersOnly === true && !member;
  const storyPath = publicPostPath(slug);

  return (
    <main className="journal-page" data-density="comfortable">
      <AdminPublicChrome
        editHref={editHref}
        editLabel="Edit post"
        showChip={false}
      />
      <JsonLd data={jsonLd} />
      {/* White story sheet so Viator cards (always white) sit on white in both themes. */}
      <div className="post-paper">
      {/* Product-style article header — no magazine dark hero */}
      <header className="border-b border-border bg-white">
        <div
          className={`section-shell pt-8 md:pt-10 ${
            post.featuredImage ? "" : "pb-8 md:pb-10"
          }`}
        >
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link
                    href="/"
                    className="text-link transition hover:text-accent"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li>
                  <Link
                    href="/blog"
                    className="text-link transition hover:text-accent"
                  >
                    Stories
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li className="max-w-[12rem] truncate text-text sm:max-w-none">
                  {post.title}
                </li>
              </ol>
            </nav>

            <p className="mt-6 eyebrow">
              {post.membersOnly ? "Members story" : "Journal"}
            </p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-display text-heading">
                {post.title}
              </h1>
              <AdminSectionEdit href={editHref} label="Edit post" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
              <span className="relative inline-flex shrink-0">
                <span
                  className="ig-author-ring-pulse pointer-events-none absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                  aria-hidden="true"
                />
                <OutboundLink
                  href={site.social.instagram}
                  affiliate={false}
                  className="group relative rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2.5px] shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  aria-label={`${site.authorName} on Instagram`}
                >
                  <span className="relative block size-11 overflow-hidden rounded-full bg-white p-[2px] dark:bg-bg">
                    <span className="relative block size-full overflow-hidden rounded-full bg-surface-soft">
                      <Image
                        src={site.authorPhoto}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover object-top transition duration-300 group-hover:scale-105"
                      />
                    </span>
                  </span>
                </OutboundLink>
              </span>
              <div>
                <p className="text-sm font-semibold text-heading">
                  By{" "}
                  <OutboundLink
                    href={site.social.instagram}
                    affiliate={false}
                    className="transition hover:text-accent"
                  >
                    {site.authorName}
                  </OutboundLink>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  <time dateTime={updatedAt}>
                    Updated {formatPostDate(updatedAt)}
                  </time>
                </p>
              </div>
              </div>
              <PostActions slug={slug} title={post.title} />
            </div>
          </div>
        </div>

        {post.featuredImage ? (
          <PinnableImage
            className="relative mt-8 aspect-[16/10] w-full bg-surface md:aspect-auto md:h-[min(48vh,30rem)]"
            pagePath={publicPostPath(slug)}
            mediaSrc={post.featuredImage.url}
            description={post.featuredImage.alt || post.title}
          >
            <Image
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </PinnableImage>
        ) : null}
      </header>

      <article className="section-shell section-band">
        <div className="mx-auto max-w-3xl">
          {post.excerpt ? (
            <p className="text-lead text-text">{post.excerpt}</p>
          ) : null}

          <aside
            className="panel-nested mt-6 bg-surface-soft p-4"
            aria-label="Affiliates disclosure"
          >
            <p className="font-display text-sm font-bold text-heading">
              Affiliates disclosure
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text">
              Some links on this page may be affiliate links. If you book or buy
              through them, I may earn a small commission at no extra cost to
              you — thanks for supporting the journal. Read the{" "}
              <Link
                href="/affiliate-disclosure"
                className="font-semibold text-link hover:text-accent"
              >
                full affiliate disclosure
              </Link>
              .
            </p>
          </aside>

          {!locked && toc.length > 0 ? (
            <nav
              className="panel mt-6 p-4"
              aria-label="Summary"
            >
              <p className="eyebrow">On this page</p>
              <ul className="mt-3 space-y-2">
                {toc.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    <a
                      href={`#${item.id}`}
                      className="text-sm font-medium text-link transition hover:text-accent"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {locked ? (
            <PremiumGate signedIn={Boolean(userId)} returnTo={storyPath} />
          ) : (
            <div className="mt-8">
              <PostContent
                html={post.contentHtml}
                pagePath={publicPostPath(slug)}
                shareDescription={post.title}
              />
            </div>
          )}

          {post.bookingTools?.length && bookingDestination ? (
            <PostBookingBox
              tools={post.bookingTools}
              destination={bookingDestination}
              placeLabel={bookingDestinationLabel(bookingDestination)}
              image={post.featuredImage?.url}
              imageAlt={post.featuredImage?.alt || post.title}
              experienceWidgetHtml={post.experienceWidgetHtml}
            />
          ) : null}

          {!locked && post.itinerary?.enabled && post.itinerary.days.length > 0 ? (
            <PostItineraryTimeline itinerary={post.itinerary} />
          ) : null}

          <aside className="panel-soft mt-10 flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-soft">
              <Image
                src={site.authorPhoto}
                alt={site.authorName}
                fill
                sizes="64px"
                className="object-cover object-top"
              />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-heading">
                I&apos;m Alex
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text">
                Explorer passionate about travel and discovery. This journal —
                Alex Journeys — is where I write down places I&apos;ve been
                so I don&apos;t forget the light, the food, and the roads in
                between.
              </p>
            </div>
          </aside>

          <CommentSection slug={slug} />
          <RecordView kind="story" slug={slug} />

          <footer className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6">
            <Link href="/blog" className="btn btn-secondary">
              ← All posts
            </Link>
            <Link href="/destinations" className="btn btn-ink">
              Destinations
            </Link>
          </footer>
        </div>
      </article>
      </div>

      {related.length > 0 ? (
        <div className="border-t border-border bg-surface-soft">
          <div className="section-shell py-8 md:py-12">
            <RelatedPosts posts={related} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
