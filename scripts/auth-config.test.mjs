import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  grantsCmsAdmin,
  isGoogleAuthConfigured,
  isOauthConfigured,
  isReaderAuthConfigured,
  isTwitterAuthConfigured,
} from "../src/lib/auth-config.ts";
import { oauthOnlySignInMessage } from "../src/lib/users.ts";

const KEYS = [
  "AUTH_SECRET",
  "AUTH_TWITTER_ID",
  "AUTH_TWITTER_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "CMS_ADMIN_EMAILS",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const snapshot = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function clearAuthEnv() {
  for (const key of KEYS) delete process.env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

describe("isTwitterAuthConfigured", () => {
  it("is false when the X client env is missing", () => {
    clearAuthEnv();
    assert.equal(isTwitterAuthConfigured(), false);
  });

  it("is false when only one of the pair is set", () => {
    clearAuthEnv();
    process.env.AUTH_TWITTER_ID = "client-id";
    assert.equal(isTwitterAuthConfigured(), false);
    delete process.env.AUTH_TWITTER_ID;
    process.env.AUTH_TWITTER_SECRET = "client-secret";
    assert.equal(isTwitterAuthConfigured(), false);
  });

  it("ignores whitespace and requires both values", () => {
    clearAuthEnv();
    process.env.AUTH_TWITTER_ID = "  ";
    process.env.AUTH_TWITTER_SECRET = "secret";
    assert.equal(isTwitterAuthConfigured(), false);
    process.env.AUTH_TWITTER_ID = " client-id ";
    assert.equal(isTwitterAuthConfigured(), true);
  });
});

describe("reader auth includes X", () => {
  it("treats X plus AUTH_SECRET as reader auth without Google or Firebase", () => {
    clearAuthEnv();
    assert.equal(isReaderAuthConfigured(), false);
    assert.equal(isOauthConfigured(), false);
    process.env.AUTH_TWITTER_ID = "client-id";
    process.env.AUTH_TWITTER_SECRET = "client-secret";
    assert.equal(isReaderAuthConfigured(), false);
    process.env.AUTH_SECRET = "secret";
    assert.equal(isGoogleAuthConfigured(), false);
    assert.equal(isTwitterAuthConfigured(), true);
    assert.equal(isReaderAuthConfigured(), true);
    assert.equal(isOauthConfigured(), true);
  });
});

describe("grantsCmsAdmin", () => {
  it("does not grant CMS admin from X even when the email is allowlisted", () => {
    clearAuthEnv();
    process.env.CMS_ADMIN_EMAILS = "alex@example.com";
    assert.equal(
      grantsCmsAdmin({
        email: "alex@example.com",
        authProvider: "twitter",
      }),
      false,
    );
    assert.equal(
      grantsCmsAdmin({
        email: "alex@example.com",
        authProvider: "google",
      }),
      true,
    );
    assert.equal(
      grantsCmsAdmin({
        email: "alex@example.com",
        authProvider: "github",
      }),
      true,
    );
    assert.equal(
      grantsCmsAdmin({ email: "alex@example.com", authProvider: "credentials" }),
      true,
    );
    assert.equal(
      grantsCmsAdmin({ email: "alex@example.com" }),
      true,
    );
    assert.equal(
      grantsCmsAdmin({ email: "reader@example.com", authProvider: "google" }),
      false,
    );
  });
});

describe("oauthOnlySignInMessage", () => {
  it("names Continue with X for an X-only account", () => {
    assert.equal(
      oauthOnlySignInMessage(["twitter"]),
      "This account uses X sign-in and has no password. Use Continue with X on the sign-in page.",
    );
  });

  it("names both buttons when Google and X are linked", () => {
    assert.equal(
      oauthOnlySignInMessage(["google", "twitter"]),
      "This account uses Google or X sign-in and has no password. Use Continue with Google or Continue with X on the sign-in page.",
    );
  });

  it("keeps the Google message for Google-only accounts", () => {
    assert.equal(
      oauthOnlySignInMessage(["google"]),
      "This account uses Google sign-in and has no password. Use Continue with Google on the sign-in page.",
    );
  });
});
