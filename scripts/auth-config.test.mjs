import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  grantsCmsAdmin,
  isGoogleAuthConfigured,
  isOauthConfigured,
  isReaderAuthConfigured,
  isTwitterAuthConfigured,
} from "../src/lib/auth-config.ts";
import {
  oauthOnlySignInMessage,
  optionalOauthEmail,
} from "../src/lib/users.ts";
import { readerLoginErrorMessage } from "../src/lib/reader-login-errors.ts";

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

describe("optionalOauthEmail", () => {
  it("accepts a missing X email and normalizes a real one", () => {
    assert.equal(optionalOauthEmail(null), null);
    assert.equal(optionalOauthEmail(undefined), null);
    assert.equal(optionalOauthEmail(""), null);
    assert.equal(optionalOauthEmail("   "), null);
    assert.equal(optionalOauthEmail(0), null);
    assert.equal(optionalOauthEmail(" Ada@Example.com "), "ada@example.com");
  });

  it("does not grant CMS admin to X when email is missing", () => {
    clearAuthEnv();
    process.env.CMS_ADMIN_EMAILS = "alex@example.com";
    assert.equal(
      grantsCmsAdmin({
        email: optionalOauthEmail(null) ?? undefined,
        authProvider: "twitter",
      }),
      false,
    );
  });
});

describe("readerLoginErrorMessage", () => {
  it("names OAuth callback, configuration, denial, and verification", () => {
    const callback = readerLoginErrorMessage("OAuthCallbackError");
    assert.match(callback, /callback URL and client secret/);
    assert.match(callback, /does not post/);
    assert.match(callback, /approve the requested access/);
    assert.match(callback, /\(OAuthCallbackError\)$/);
    assert.match(readerLoginErrorMessage("OAuthCallback"), /\(OAuthCallback\)$/);
    assert.match(readerLoginErrorMessage("Configuration"), /AUTH_URL/);
    assert.match(readerLoginErrorMessage("Configuration"), /AUTH_SECRET/);
    assert.match(readerLoginErrorMessage("AccessDenied"), /disabled/);
    assert.match(readerLoginErrorMessage("Verification"), /no longer valid/);
    assert.match(readerLoginErrorMessage("InvalidCheck"), /www\.fernandesjourneys\.com/);
    assert.match(readerLoginErrorMessage("InvalidCheck"), /\(InvalidCheck\)$/);
  });

  it("names the X users/me block and a dropped state cookie", () => {
    const profile = readerLoginErrorMessage("OAuthProfileParseError");
    assert.match(profile, /GET \/2\/users\/me/);
    assert.match(profile, /403/);
    assert.match(profile, /tweet\.read/);
    assert.match(profile, /not a wrong client secret/);
    assert.match(profile, /\(OAuthProfileParseError\)$/);
    const check = readerLoginErrorMessage("InvalidCheck");
    assert.match(check, /state cookie/i);
    assert.match(check, /x\.com/);
    assert.match(check, /private/i);
    assert.match(check, /www\.fernandesjourneys\.com/);
    assert.match(check, /\(InvalidCheck\)$/);
  });

  it("keeps unknown codes visible and ignores blanks", () => {
    assert.match(readerLoginErrorMessage("SomethingNew"), /\(SomethingNew\)$/);
    assert.equal(readerLoginErrorMessage(null), null);
    assert.equal(readerLoginErrorMessage("  "), null);
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
