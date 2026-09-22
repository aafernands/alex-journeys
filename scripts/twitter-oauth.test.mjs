import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Auth, skipCSRFCheck } from "@auth/core";
import Twitter from "@auth/core/providers/twitter";
import {
  TWITTER_AUTHORIZE_URL,
  TWITTER_OAUTH_SCOPE,
  twitterAuthorization,
} from "../src/lib/twitter-oauth.ts";

describe("twitterAuthorization", () => {
  it("asks X for profile and refresh only", () => {
    assert.equal(twitterAuthorization.url, TWITTER_AUTHORIZE_URL);
    assert.equal(twitterAuthorization.params.scope, TWITTER_OAUTH_SCOPE);
    assert.equal(twitterAuthorization.params.scope.includes("tweet.read"), false);
    assert.equal(typeof twitterAuthorization.url, "string");
  });

  it("keeps client_id, redirect_uri, state, and PKCE on the X authorize URL", async () => {
    const response = await Auth(
      new Request("https://www.fernandesjourneys.com/api/auth/signin/twitter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Auth-Return-Redirect": "1",
        },
        body: new URLSearchParams({
          callbackUrl: "https://www.fernandesjourneys.com/account",
        }),
      }),
      {
        providers: [
          Twitter({
            clientId: "client-id-123",
            clientSecret: "client-secret-456",
            authorization: twitterAuthorization,
          }),
        ],
        secret: "test-secret-test-secret-test-secret-test",
        trustHost: true,
        skipCSRFCheck,
        basePath: "/api/auth",
      },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    const url = new URL(payload.url);
    assert.equal(url.origin + url.pathname, TWITTER_AUTHORIZE_URL);
    assert.equal(url.searchParams.get("scope"), "users.read offline.access");
    assert.equal(url.searchParams.get("scope")?.includes("tweet.read"), false);
    assert.equal(url.searchParams.get("client_id"), "client-id-123");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "https://www.fernandesjourneys.com/api/auth/callback/twitter",
    );
    assert.ok(url.searchParams.get("state"));
    assert.ok(url.searchParams.get("code_challenge"));
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");

    const cookieNames = response.headers.getSetCookie().map((cookie) =>
      cookie.split("=")[0],
    );
    assert.ok(cookieNames.some((name) => name.includes("pkce.code_verifier")));
    assert.ok(cookieNames.some((name) => name.endsWith("authjs.state")));
  });
});
