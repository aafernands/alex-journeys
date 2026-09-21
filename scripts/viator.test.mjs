import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { wrapHtmlImagesWithPinterestPins } from "../src/lib/pinterest.ts";
import {
  VIATOR_PARTNER_ID,
  VIATOR_WIDGET_SCRIPT_SRC,
  htmlHasViatorWidgets,
  isViatorPartnerId,
  isViatorWidgetRef,
  viatorWidgetDiv,
  viatorWidgetMarkup,
} from "../src/lib/viator.ts";
import { cleanHtml } from "./migrate-wp-posts.mjs";

const REF = "W-0765e608-3fdd-49b5-8cf6-72d358a119b7";
const SCRIPT = `<script async src="${VIATOR_WIDGET_SCRIPT_SRC}"></script>`;

const ADVENTURE_REFS = [
  "W-1edf9ef1-efd0-4d5a-b7cb-c4e3911d8c7a",
  "W-ff1377a4-6216-4e8a-87d5-72d15bfb35c9",
  "W-0504ddc1-087d-4d1a-b7c5-094a5c8e9070",
  "W-688f7408-a86a-4dbb-bb68-e6b6305c4fbf",
  "W-5410990a-0354-41bf-8a13-f35ee92dfd46",
  "W-013cda57-3b3e-492b-b173-24261fc00e83",
  "W-f8696a68-82e4-4515-b9ea-3c1ec5c4e5da",
  "W-e241d799-399d-44f3-82cd-4bc148d3e463",
  "W-7e12ac79-fafe-4e08-868f-d6990160a01d",
  "W-da16bc09-2184-4446-80b9-fff68f00980f",
  "W-af86a02b-318a-45a0-abb9-69ea8e2147a6",
  "W-4bbbe6a4-9387-4946-b424-2f0541b8eb89",
  "W-4fa00e4b-73e8-4ede-8098-a54de6db1819",
  "W-2f1f36c5-3fba-4ddd-a561-be05f31cd43e",
  "W-2ff50828-b054-4446-896f-8e1fbc850e04",
  "W-b2d73d78-8db7-4b53-9fe1-5c1880275636",
  "W-9eb6bba4-a590-4141-a060-31e964229d8a",
];

function widgetRefs(html) {
  return [...html.matchAll(/data-vi-widget-ref="([^"]+)"/g)].map((match) => match[1]);
}

describe("viator embeds", () => {
  it("checks widget refs and partner ids before building a card shell", () => {
    assert.equal(isViatorWidgetRef(REF), true);
    assert.equal(isViatorWidgetRef(`  ${REF}`), false);
    assert.equal(isViatorWidgetRef("W-not-a-ref"), false);
    assert.equal(isViatorPartnerId(VIATOR_PARTNER_ID), true);
    assert.equal(isViatorPartnerId("12345"), false);
    assert.equal(viatorWidgetMarkup(REF, VIATOR_PARTNER_ID), viatorWidgetDiv(REF));
    assert.equal(viatorWidgetMarkup(REF, 'P00"><script>').includes("<script>"), false);
  });

  it("builds the partner card shell without inventing tour copy", () => {
    const html = viatorWidgetDiv(REF);
    assert.match(html, new RegExp(`data-vi-partner-id="${VIATOR_PARTNER_ID}"`));
    assert.match(html, new RegExp(`data-vi-widget-ref="${REF}"`));
    assert.equal(html.includes("Book Now"), false);
    assert.equal(htmlHasViatorWidgets(html), true);
    assert.equal(htmlHasViatorWidgets("<p>No widgets here.</p>"), false);
  });

  it("does not wrap a widget div when pinning images", () => {
    const html = `${viatorWidgetDiv(REF)}<p><img src="/media/falls.jpg" alt="Falls" width="640" height="480" /></p>`;
    const wrapped = wrapHtmlImagesWithPinterestPins(html, {
      pageUrl: "https://www.fernandesjourneys.com/toronto-travel-guide",
      description: "Toronto",
    });
    assert.equal(widgetRefs(wrapped).join(","), REF);
    assert.match(wrapped, /pinnable-image/);
    assert.equal(wrapped.indexOf("pinnable-image") > wrapped.indexOf("data-vi-widget-ref"), true);
  });

  it("keeps partner widgets when cleaning a WordPress export", () => {
    const source = [
      "<p>After the fun fact.</p>",
      viatorWidgetDiv(REF),
      SCRIPT,
      '<script src="https://evil.example/track.js"></script>',
      '<div class="viator-noise">drop me</div>',
    ].join("\n");
    const cleaned = cleanHtml(source);
    const cleanedAgain = cleanHtml(source);
    assert.equal(cleanedAgain, cleaned);
    assert.match(cleaned, new RegExp(`data-vi-widget-ref="${REF}"`));
    assert.match(cleaned, /data-vi-partner-id="P00143772"/);
    assert.match(cleaned, /viator\.com\/orion\/partner\/widget\.js/);
    assert.equal(cleaned.includes("evil.example"), false);
    assert.equal(cleaned.includes("viator-noise"), false);
  });

  it("restores Toronto widgets in the Casa Loma and CN Tower sections", () => {
    const html = JSON.parse(
      fs.readFileSync("src/content/posts/toronto-travel-guide.json", "utf8"),
    ).contentHtml;
    assert.deepEqual(widgetRefs(html), [
      "W-0765e608-3fdd-49b5-8cf6-72d358a119b7",
      "W-7420042f-0b5b-46fa-9b9e-d7ea3bc58e96",
    ]);
    const funFact = html.indexOf("iconic movie backdrop.");
    const square = html.indexOf("Nathan Phillips Square");
    const dinner = html.indexOf("as you dine.");
    const menu = html.indexOf("smoked salmon");
    const first = html.indexOf("W-0765e608-3fdd-49b5-8cf6-72d358a119b7");
    const second = html.indexOf("W-7420042f-0b5b-46fa-9b9e-d7ea3bc58e96");
    assert.equal(funFact < first && first < square, true);
    assert.equal(dinner < second && second < menu, true);
  });

  it("restores the 17 adventure widgets after each booked experience", () => {
    const html = JSON.parse(
      fs.readFileSync(
        "src/content/posts/top-adventure-travel-destinations-for-2025.json",
        "utf8",
      ),
    ).contentHtml;
    assert.deepEqual(widgetRefs(html), ADVENTURE_REFS);
    assert.equal(html.includes(`data-vi-partner-id="${VIATOR_PARTNER_ID}"`), true);
    const waterfalls = html.indexOf("<strong>Waterfalls");
    const waterfallsEnd = html.indexOf("</p>", waterfalls);
    const between = html.slice(waterfallsEnd, html.indexOf("<strong>Ice Caves"));
    assert.equal(between.includes("data-vi-widget-ref"), false);
    const ice = html.indexOf("Ice Caves in Vatnajökull");
    const iceWidget = html.indexOf("W-2ff50828-b054-4446-896f-8e1fbc850e04");
    const proTip = html.indexOf("Plan ahead and make reservations");
    assert.equal(ice < iceWidget && iceWidget < proTip, true);
  });
});
