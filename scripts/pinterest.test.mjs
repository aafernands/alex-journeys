import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPinterestShareUrl,
  isPinnableImageSrc,
  toAbsoluteMediaUrl,
  wrapHtmlImagesWithPinterestPins,
} from "../src/lib/pinterest.ts";

describe("toAbsoluteMediaUrl", () => {
  it("resolves site-relative media paths against the site origin", () => {
    assert.equal(
      toAbsoluteMediaUrl("/media/falls.jpg"),
      "https://www.fernandesjourneys.com/media/falls.jpg",
    );
  });

  it("leaves absolute http(s) URLs unchanged", () => {
    assert.equal(
      toAbsoluteMediaUrl("https://cdn.example.com/photo.jpg"),
      "https://cdn.example.com/photo.jpg",
    );
  });

  it("normalizes protocol-relative URLs", () => {
    assert.equal(
      toAbsoluteMediaUrl("//cdn.example.com/photo.jpg"),
      "https://cdn.example.com/photo.jpg",
    );
  });
});

describe("buildPinterestShareUrl", () => {
  it("encodes url, media, and description", () => {
    const href = buildPinterestShareUrl({
      pageUrl: "https://www.fernandesjourneys.com/niagara-falls",
      mediaUrl: "/media/photo.jpg",
      description: "Niagara Falls & mist",
    });

    assert.ok(
      href.startsWith("https://www.pinterest.com/pin/create/button/?"),
    );
    assert.ok(
      href.includes(
        "url=" +
          encodeURIComponent(
            "https://www.fernandesjourneys.com/niagara-falls",
          ),
      ),
    );
    assert.ok(
      href.includes(
        "media=" +
          encodeURIComponent(
            "https://www.fernandesjourneys.com/media/photo.jpg",
          ),
      ),
    );
    assert.ok(
      href.includes("description=" + encodeURIComponent("Niagara Falls & mist")),
    );
  });
});

describe("isPinnableImageSrc", () => {
  it("allows story media", () => {
    assert.equal(isPinnableImageSrc("/media/migrated/iceland.jpg"), true);
  });

  it("rejects brand logos and author photos", () => {
    assert.equal(isPinnableImageSrc("/brand/logo-alex-journly.png"), false);
    assert.equal(isPinnableImageSrc("/brand/alex-fernandes.jpg"), false);
  });

  it("rejects tiny decorative images", () => {
    assert.equal(
      isPinnableImageSrc("/media/dot.png", { width: 16, height: 16 }),
      false,
    );
  });
});

describe("wrapHtmlImagesWithPinterestPins", () => {
  const pageUrl = "https://www.fernandesjourneys.com/iceland";

  it("wraps content images with a Pin control using alt text", () => {
    const html =
      '<figure><img src="/media/blue-lagoon.jpg" alt="Blue Lagoon steam" width="640" height="853" loading="lazy" /></figure>';
    const out = wrapHtmlImagesWithPinterestPins(html, {
      pageUrl,
      description: "Iceland trip",
    });

    assert.match(out, /class="pinnable-image"/);
    assert.match(out, /aria-label="Pin on Pinterest"/);
    assert.match(out, /target="_blank"/);
    assert.match(out, /rel="noopener noreferrer"/);
    assert.match(
      out,
      new RegExp(
        encodeURIComponent("https://www.fernandesjourneys.com/media/blue-lagoon.jpg"),
      ),
    );
    assert.match(out, new RegExp(encodeURIComponent("Blue Lagoon steam")));
    assert.ok(out.includes('loading="lazy"'));
  });

  it("skips logos and already-wrapped images", () => {
    const html =
      '<img src="/brand/logo-alex-journly.png" alt="Fernandes Journeys" width="180" height="54" />';
    const out = wrapHtmlImagesWithPinterestPins(html, { pageUrl });
    assert.equal(out, html);

    const wrapped =
      '<span class="pinnable-image"><img src="/media/a.jpg" alt="A" /></span>';
    assert.equal(
      wrapHtmlImagesWithPinterestPins(wrapped, { pageUrl }),
      wrapped,
    );
  });

  it("keeps a linked image valid by pinning beside the anchor", () => {
    const html =
      '<a href="/media/full.jpg"><img src="/media/full.jpg" alt="Falls" width="800" height="600" /></a>';
    const out = wrapHtmlImagesWithPinterestPins(html, { pageUrl });
    assert.match(out, /<span class="pinnable-image"><a href="\/media\/full.jpg">/);
    assert.ok(
      !/<a href="\/media\/full.jpg">[\s\S]*<a class="pinterest-pin-btn"[\s\S]*<\/a>\s*<\/a>/i.test(
        out,
      ),
    );
    assert.match(out, /<\/a><a class="pinterest-pin-btn"/);
  });
});
