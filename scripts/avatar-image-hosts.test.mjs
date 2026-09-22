import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Twitter from "@auth/core/providers/twitter";
import { isOptimizedAvatarSrc } from "../src/lib/avatar-image.ts";

const PBS_AVATAR =
  "https://pbs.twimg.com/profile_images/1267175364003901441/tBZNFAgA_normal.jpg";
const ABS_DEFAULT =
  "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";

describe("X avatar image hosts", () => {
  it("keeps Auth.js profile_image_url hosts unchanged", () => {
    const provider = Twitter({ clientId: "id", clientSecret: "secret" });
    const uploaded = provider.profile({
      data: {
        id: "1",
        name: "Alex",
        username: "alex",
        profile_image_url: PBS_AVATAR,
      },
    });
    const fallback = provider.profile({
      data: {
        id: "2",
        name: "Alex",
        username: "alex",
        profile_image_url: ABS_DEFAULT,
      },
    });
    assert.equal(uploaded.image, PBS_AVATAR);
    assert.equal(new URL(uploaded.image).hostname, "pbs.twimg.com");
    assert.equal(fallback.image, ABS_DEFAULT);
    assert.equal(new URL(fallback.image).hostname, "abs.twimg.com");
    assert.equal(
      provider.profile({
        data: { id: "3", name: "Alex", username: "alex" },
      }).image,
      undefined,
    );
  });

  it("allowlists those CDN hosts and keeps Google photos", () => {
    const source = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
    assert.match(source, /hostname:\s*"pbs\.twimg\.com"/);
    assert.match(source, /pathname:\s*"\/profile_images\/\*\*"/);
    assert.match(source, /hostname:\s*"abs\.twimg\.com"/);
    assert.match(source, /pathname:\s*"\/sticky\/default_profile_images\/\*\*"/);
    assert.match(source, /hostname:\s*"lh3\.googleusercontent\.com"/);
    assert.match(source, /hostname:\s*"images\.unsplash\.com"/);
  });

  it("sends X account photos through next/image the same way as Google", () => {
    assert.equal(isOptimizedAvatarSrc(PBS_AVATAR), true);
    assert.equal(isOptimizedAvatarSrc(ABS_DEFAULT), true);
    assert.equal(
      isOptimizedAvatarSrc(
        "https://lh3.googleusercontent.com/a/ACg8ocExample=s96-c",
      ),
      true,
    );
    assert.equal(isOptimizedAvatarSrc("data:image/png;base64,aaaa"), false);
    assert.equal(
      isOptimizedAvatarSrc("https://pbs.twimg.com/media/not-a-profile.jpg"),
      false,
    );
    assert.equal(
      isOptimizedAvatarSrc("http://pbs.twimg.com/profile_images/x.jpg"),
      false,
    );
    assert.equal(
      isOptimizedAvatarSrc("https://images.example.com/photo.jpg"),
      false,
    );

    const dashboard = readFileSync(
      new URL("../src/components/account/AccountDashboard.tsx", import.meta.url),
      "utf8",
    );
    const settings = readFileSync(
      new URL("../src/components/ProfileSettingsForm.tsx", import.meta.url),
      "utf8",
    );
    const avatar = readFileSync(
      new URL("../src/components/account/ProfileAvatar.tsx", import.meta.url),
      "utf8",
    );
    assert.match(dashboard, /<ProfileAvatar/);
    assert.match(settings, /<ProfileAvatar/);
    assert.match(avatar, /isOptimizedAvatarSrc/);
    assert.doesNotMatch(dashboard, /src\.includes\("googleusercontent\.com"\)/);
    assert.doesNotMatch(settings, /googleusercontent\.com/);
  });
});
