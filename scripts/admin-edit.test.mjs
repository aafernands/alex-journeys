import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CMS_COMMENTS_HREF,
  CMS_DESIGN_HREF,
  CMS_DESTINATIONS_HREF,
  CMS_HOME_HREF,
  cmsEditDestinationHref,
  cmsEditPageHref,
  cmsEditPostHref,
} from "../src/lib/admin-edit.ts";

describe("cms edit hrefs", () => {
  it("builds published post edit URLs", () => {
    assert.equal(cmsEditPostHref("iceland-ring-road"), "/cms/edit/iceland-ring-road");
  });

  it("appends draft=1 when the public view is draft-aware", () => {
    assert.equal(
      cmsEditPostHref("iceland-ring-road", true),
      "/cms/edit/iceland-ring-road?draft=1",
    );
  });

  it("builds CMS page and destination edit URLs", () => {
    assert.equal(cmsEditPageHref("about"), "/cms/pages/edit/about");
    assert.equal(
      cmsEditDestinationHref("iceland"),
      "/cms/destinations/edit/iceland",
    );
  });

  it("exposes compact admin-bar destinations", () => {
    assert.equal(CMS_HOME_HREF, "/cms");
    assert.equal(CMS_COMMENTS_HREF, "/cms/comments");
    assert.equal(CMS_DESIGN_HREF, "/cms/design");
    assert.equal(CMS_DESTINATIONS_HREF, "/cms/destinations");
  });
});
