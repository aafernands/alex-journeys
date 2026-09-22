import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Auth, customFetch, skipCSRFCheck } from "@auth/core";
import { InvalidCheck } from "@auth/core/errors";
import Twitter from "@auth/core/providers/twitter";
import parseProviders from "../node_modules/@auth/core/lib/utils/providers.js";
import { authCookies } from "../src/lib/auth-cookies.ts";
import {
  readerFacingAuthError,
  rewriteAuthFailureRedirect,
} from "../src/lib/auth-error-redirect.ts";
import { safeAuthErrorDetails } from "../src/lib/auth-error-log.ts";
import {
  TWITTER_AUTHORIZE_URL,
  TWITTER_OAUTH_SCOPE,
  TWITTER_TOKEN_URL,
  TWITTER_USERINFO_URL,
  ensureTwitterTokenClientId,
  readTwitterOAuthCredentials,
  twitterAuthorization,
  twitterTokenFetch,
} from "../src/lib/twitter-oauth.ts";
import { optionalOauthEmail, upsertOauthUser } from "../src/lib/users.ts";

describe("twitterAuthorization", () => {
  it("asks X for the Auth.js default scope, including tweet.read", () => {
    assert.equal(twitterAuthorization.url, TWITTER_AUTHORIZE_URL);
    assert.equal(twitterAuthorization.params.scope, TWITTER_OAUTH_SCOPE);
    assert.equal(
      twitterAuthorization.params.scope,
      "users.read tweet.read offline.access",
    );
    assert.equal(twitterAuthorization.params.scope.includes("users.read"), true);
    assert.equal(twitterAuthorization.params.scope.includes("tweet.read"), true);
    assert.equal(
      twitterAuthorization.params.scope.includes("offline.access"),
      true,
    );
    assert.equal(twitterAuthorization.params.scope.includes("tweet.write"), false);
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
    assert.equal(
      url.searchParams.get("scope"),
      "users.read tweet.read offline.access",
    );
    assert.equal(url.searchParams.get("scope")?.includes("tweet.read"), true);
    assert.equal(url.searchParams.get("scope")?.includes("tweet.write"), false);
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

describe("X OAuth 2 endpoints", () => {
  it("keeps the Auth.js token and userinfo URLs when only authorization is overridden", () => {
    const { provider } = parseProviders({
      providerId: "twitter",
      url: new URL("https://www.fernandesjourneys.com/api/auth"),
      config: {
        providers: [
          Twitter({
            clientId: "client-id-123",
            clientSecret: "client-secret-456",
            authorization: twitterAuthorization,
          }),
        ],
      },
    });
    assert.equal(provider.token.url.href, TWITTER_TOKEN_URL);
    assert.equal(
      provider.userinfo.url.origin + provider.userinfo.url.pathname,
      "https://api.x.com/2/users/me",
    );
    assert.equal(
      provider.userinfo.url.searchParams.get("user.fields"),
      "profile_image_url",
    );
    assert.equal(provider.userinfo.url.href, TWITTER_USERINFO_URL);
  });

  it("parses an X profile that has no email", async () => {
    const { provider } = parseProviders({
      providerId: "twitter",
      url: new URL("https://www.fernandesjourneys.com/api/auth"),
      config: {
        providers: [
          Twitter({
            clientId: "client-id-123",
            clientSecret: "client-secret-456",
          }),
        ],
      },
    });
    const user = await provider.profile(
      {
        data: {
          id: "998877",
          name: "Alex",
          username: "dijacci",
          profile_image_url: "https://pbs.twimg.com/profile_images/x.jpg",
        },
      },
      {},
    );
    assert.equal(user.id, "998877");
    assert.equal(user.name, "Alex");
    assert.equal(user.email, null);
    assert.equal(optionalOauthEmail(user.email), null);
    assert.deepEqual(
      await upsertOauthUser({
        id: user.id,
        email: optionalOauthEmail(user.email),
        name: user.name,
        image: user.image,
        provider: "twitter",
      }),
      { ok: true },
    );
  });
});

const ORIGIN = "https://www.fernandesjourneys.com";
const CLIENT_ID = "client-id-123";
const CLIENT_SECRET = "client-secret-456";

function cookieHeader(response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

function oauthError(status, error, error_description) {
  return new Response(JSON.stringify({ error, error_description }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * X token rules this callback was failing on:
 * - Basic auth and no body client_id → 400 Missing required parameter [client_id]
 * - client_secret in the body (client_secret_post) → 401 Missing valid authorization header
 * - Basic auth plus body client_id, no body secret → tokens
 * Userinfo is the v2 envelope and has no email.
 */
function xApi() {
  const requests = [];
  const fetchImpl = async (input, init = {}) => {
    const href = typeof input === "string" ? input : input.url;
    const body = init.body instanceof URLSearchParams ? init.body : null;
    const authorization = init.headers?.authorization ?? "";
    requests.push({
      href,
      clientId: body?.get("client_id") ?? null,
      hasClientSecret: Boolean(body?.get("client_secret")),
      hasBasic: authorization.startsWith("Basic "),
    });
    if (href.startsWith(TWITTER_TOKEN_URL)) {
      if (!body?.get("client_id")) {
        return oauthError(
          400,
          "invalid_request",
          "Missing required parameter [client_id].",
        );
      }
      if (!authorization.startsWith("Basic ") || body.get("client_secret")) {
        return oauthError(
          401,
          "unauthorized_client",
          "Missing valid authorization header",
        );
      }
      return new Response(
        JSON.stringify({
          token_type: "bearer",
          access_token: "access-token",
          expires_in: 7200,
          scope: "users.read tweet.read offline.access",
          refresh_token: "refresh-token",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (href.startsWith("https://api.x.com/2/users/me")) {
      return new Response(
        JSON.stringify({
          data: {
            id: "998877",
            name: "Alex",
            username: "dijacci",
            profile_image_url: "https://pbs.twimg.com/profile_images/x.jpg",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`unexpected X request ${href}`);
  };
  return { fetchImpl, requests };
}

function authConfig(provider) {
  return {
    providers: [provider],
    secret: "test-secret-test-secret-test-secret-test",
    trustHost: true,
    skipCSRFCheck,
    basePath: "/api/auth",
    pages: { signIn: "/login", error: "/login" },
    session: { strategy: "jwt" },
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider !== "twitter") return true;
        const id = account.providerAccountId || user?.id || "";
        if (!id) return false;
        try {
          const result = await upsertOauthUser({
            id,
            email: optionalOauthEmail(user?.email),
            name: user?.name,
            image: user?.image,
            provider: "twitter",
          });
          return result.ok;
        } catch {
          return true;
        }
      },
      async jwt({ token, user, account }) {
        if (user?.id) token.sub = user.id;
        else if (account?.providerAccountId) token.sub = account.providerAccountId;
        const email =
          optionalOauthEmail(token.email) ?? optionalOauthEmail(user?.email);
        if (email) token.email = email;
        else delete token.email;
        token.authProvider = account?.provider ?? token.authProvider;
        token.name = user?.name ?? token.name;
        return token;
      },
    },
  };
}

async function callbackLocation(provider) {
  const config = authConfig(provider);
  const signIn = await Auth(
    new Request(`${ORIGIN}/api/auth/signin/twitter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({ callbackUrl: `${ORIGIN}/account` }),
    }),
    config,
  );
  assert.equal(signIn.status, 200);
  const payload = await signIn.json();
  const state = new URL(payload.url).searchParams.get("state");
  assert.ok(state);
  const callback = await Auth(
    new Request(
      `${ORIGIN}/api/auth/callback/twitter?${new URLSearchParams({
        code: "auth-code-from-x",
        state,
      })}`,
      { headers: { cookie: cookieHeader(signIn) } },
    ),
    config,
  );
  return { location: callback.headers.get("location"), callback, config };
}

describe("Twitter callback Configuration", () => {
  it("trims the OAuth client id and secret", () => {
    assert.deepEqual(
      readTwitterOAuthCredentials({
        AUTH_TWITTER_ID: "  client-id-123 \n",
        AUTH_TWITTER_SECRET: " client-secret-456\n",
      }),
      { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
    );
  });

  it("maps X's missing body client_id to error=Configuration", async () => {
    const x = xApi();
    const { location, requests } = await (async () => {
      const result = await callbackLocation(
        Twitter({
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
          authorization: twitterAuthorization,
          [customFetch]: x.fetchImpl,
        }),
      );
      return { ...result, requests: x.requests };
    })();
    assert.match(location, /\/login\?error=Configuration$/);
    assert.equal(requests[0].href, TWITTER_TOKEN_URL);
    assert.equal(requests[0].clientId, null);
    assert.equal(requests[0].hasBasic, true);
    assert.equal(requests[0].hasClientSecret, false);
  });

  it("maps a body client_secret without Basic to error=Configuration", async () => {
    const x = xApi();
    const { location, requests } = await (async () => {
      const result = await callbackLocation(
        Twitter({
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
          authorization: twitterAuthorization,
          client: { token_endpoint_auth_method: "client_secret_post" },
          [customFetch]: x.fetchImpl,
        }),
      );
      return { ...result, requests: x.requests };
    })();
    assert.match(location, /\/login\?error=Configuration$/);
    assert.equal(requests[0].clientId, CLIENT_ID);
    assert.equal(requests[0].hasClientSecret, true);
    assert.equal(requests[0].hasBasic, false);
  });

  it("creates a session for @dijacci when the profile has no email", async () => {
    const x = xApi();
    const credentials = readTwitterOAuthCredentials({
      AUTH_TWITTER_ID: `  ${CLIENT_ID} \n`,
      AUTH_TWITTER_SECRET: ` ${CLIENT_SECRET}\n`,
    });
    const { location, callback, config, requests } = await (async () => {
      const result = await callbackLocation(
        Twitter({
          ...credentials,
          authorization: twitterAuthorization,
          token: TWITTER_TOKEN_URL,
          userinfo: TWITTER_USERINFO_URL,
          [customFetch]: twitterTokenFetch(credentials.clientId, x.fetchImpl),
        }),
      );
      return { ...result, requests: x.requests };
    })();
    assert.equal(location, `${ORIGIN}/account`);
    assert.equal(requests[0].href, TWITTER_TOKEN_URL);
    assert.equal(requests[0].clientId, CLIENT_ID);
    assert.equal(requests[0].hasBasic, true);
    assert.equal(requests[0].hasClientSecret, false);
    assert.equal(requests[1].href, TWITTER_USERINFO_URL);
    assert.ok(
      callback.headers
        .getSetCookie()
        .some((cookie) => cookie.includes("session-token=") && !cookie.includes("session-token=;")),
    );

    const sessionRes = await Auth(
      new Request(`${ORIGIN}/api/auth/session`, {
        headers: { cookie: cookieHeader(callback) },
      }),
      config,
    );
    assert.equal(sessionRes.status, 200);
    const session = await sessionRes.json();
    assert.equal(session.user.name, "Alex");
    assert.equal(session.user.email ?? null, null);
  });

  it("maps GET /2/users/me HTTP 403 to error=OAuthCallbackError", async () => {
    const requests = [];
    const fetchImpl = async (input, init = {}) => {
      const href = typeof input === "string" ? input : input.url;
      const body = init.body instanceof URLSearchParams ? init.body : null;
      requests.push({ href, clientId: body?.get("client_id") ?? null });
      if (href.startsWith(TWITTER_TOKEN_URL)) {
        return new Response(
          JSON.stringify({
            token_type: "bearer",
            access_token: "access-token",
            expires_in: 7200,
            scope: TWITTER_OAUTH_SCOPE,
            refresh_token: "refresh-token",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (href.startsWith("https://api.x.com/2/users/me")) {
        return new Response(
          JSON.stringify({
            title: "Forbidden",
            detail: "Request forbidden by Twitter API.",
            status: 403,
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`unexpected X request ${href}`);
    };
    const { location } = await callbackLocation(
      Twitter({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        authorization: twitterAuthorization,
        token: TWITTER_TOKEN_URL,
        userinfo: TWITTER_USERINFO_URL,
        [customFetch]: twitterTokenFetch(CLIENT_ID, fetchImpl),
      }),
    );
    assert.match(location, /\/login\?error=OAuthCallbackError$/);
    assert.equal(location.includes("error=Configuration"), false);
    assert.equal(requests[0].href, TWITTER_TOKEN_URL);
    assert.equal(requests[0].clientId, CLIENT_ID);
    assert.equal(requests[1].href, TWITTER_USERINFO_URL);
  });

  it("does not turn a profile parse failure into error=Configuration", async () => {
    const fetchImpl = async (input) => {
      const href = typeof input === "string" ? input : input.url;
      if (href.startsWith(TWITTER_TOKEN_URL)) {
        return new Response(
          JSON.stringify({
            token_type: "bearer",
            access_token: "access-token",
            expires_in: 7200,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ id: "998877", name: "Alex" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const { location } = await callbackLocation(
      Twitter({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        authorization: twitterAuthorization,
        [customFetch]: async (input, init) => {
          ensureTwitterTokenClientId(input, init, CLIENT_ID);
          return fetchImpl(input, init);
        },
      }),
    );
    assert.equal(location.includes("error=Configuration"), false);
    assert.equal(location.endsWith("/signin"), true);
  });
});

describe("safeAuthErrorDetails", () => {
  it("prints the X error code and not the token response", () => {
    const error = new Error("server responded with an error in the response body");
    error.name = "ResponseBodyError";
    error.error = "invalid_request";
    error.error_description = "Missing required parameter [client_id].";
    error.cause = {
      error: "invalid_request",
      error_description: "Missing required parameter [client_id].",
      access_token: "should-not-leak",
    };
    error.response = { headers: { authorization: "Basic secret" } };
    const details = safeAuthErrorDetails(error);
    assert.deepEqual(details, {
      name: "ResponseBodyError",
      message: "server responded with an error in the response body",
      oauthError: "invalid_request",
      oauthDescription: "Missing required parameter [client_id].",
    });
    assert.equal(JSON.stringify(details).includes("should-not-leak"), false);
    assert.equal(JSON.stringify(details).includes("Basic"), false);
  });

  it("unwraps Auth.js CallbackRouteError without the response body", () => {
    const details = safeAuthErrorDetails({
      name: "CallbackRouteError",
      message: "Read more at https://errors.authjs.dev#callbackrouteerror",
      cause: {
        err: new Error("server responded with an error in the response body"),
        error: "invalid_request",
        error_description: "Missing required parameter [client_id].",
        provider: "twitter",
      },
    });
    assert.equal(details.oauthError, "invalid_request");
    assert.equal(
      details.oauthDescription,
      "Missing required parameter [client_id].",
    );
    assert.equal(JSON.stringify(details).includes("provider"), false);
  });
});

describe("auth cookies", () => {
  it("shares state and pkce across www and apex, and leaves csrf host-only", () => {
    const cookies = authCookies({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      AUTH_URL: "https://www.fernandesjourneys.com",
    });
    assert.equal(cookies.state.options.domain, ".fernandesjourneys.com");
    assert.equal(cookies.state.options.secure, true);
    assert.equal(cookies.state.options.sameSite, "lax");
    assert.equal(cookies.state.options.path, "/");
    assert.equal(
      cookies.pkceCodeVerifier.options.domain,
      ".fernandesjourneys.com",
    );
    assert.equal(cookies.pkceCodeVerifier.options.httpOnly, true);
    assert.equal("csrfToken" in cookies, false);
    assert.equal(
      authCookies({ NODE_ENV: "production", VERCEL_ENV: "preview" }),
      undefined,
    );
    assert.equal(
      authCookies({ AUTH_URL: "http://localhost:3000", NODE_ENV: "development" }),
      undefined,
    );
    assert.equal(
      authCookies({
        AUTH_URL: "https://fernandesjourneys.com",
        VERCEL_ENV: "production",
      }).state.options.domain,
      ".fernandesjourneys.com",
    );
  });

  it("sets Domain=.fernandesjourneys.com on the state and PKCE cookies Auth.js sends", async () => {
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
        cookies: authCookies({
          AUTH_URL: "https://www.fernandesjourneys.com",
          VERCEL_ENV: "production",
        }),
      },
    );
    const setCookies = response.headers.getSetCookie();
    const state = setCookies.find((cookie) => cookie.includes("authjs.state"));
    const pkce = setCookies.find((cookie) => cookie.includes("pkce.code_verifier"));
    const csrf = setCookies.find((cookie) => cookie.includes("csrf-token"));
    assert.match(state, /Domain=\.fernandesjourneys\.com/i);
    assert.match(state, /Secure/i);
    assert.match(state, /SameSite=Lax/i);
    assert.match(state, /Path=\//i);
    assert.match(pkce, /Domain=\.fernandesjourneys\.com/i);
    assert.match(pkce, /HttpOnly/i);
    if (csrf) {
      assert.equal(/Domain=/i.test(csrf), false);
    }
    assert.equal(
      setCookies.some((cookie) => cookie.startsWith("__Host-") && /Domain=/i.test(cookie)),
      false,
    );
  });
});

describe("InvalidCheck login redirect", () => {
  it("names a state parse failure instead of Configuration", () => {
    const error = new InvalidCheck("state value could not be parsed", {
      cause: new Error("state cookie was missing"),
    });
    assert.equal(readerFacingAuthError(error), "InvalidCheck");
    assert.equal(readerFacingAuthError(new Error("other")), null);
    const response = new Response(null, {
      status: 302,
      headers: {
        location: "https://www.fernandesjourneys.com/login?error=Configuration",
        "set-cookie":
          "__Secure-authjs.state=; Max-Age=0; Path=/; Domain=.fernandesjourneys.com; Secure; HttpOnly; SameSite=Lax",
      },
    });
    const rewritten = rewriteAuthFailureRedirect(response, "InvalidCheck");
    const location = new URL(rewritten.headers.get("location"));
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("error"), "InvalidCheck");
    assert.match(
      rewritten.headers.get("set-cookie"),
      /Domain=\.fernandesjourneys\.com/i,
    );
    const kept = rewriteAuthFailureRedirect(response, null);
    assert.match(kept.headers.get("location"), /error=Configuration$/);
  });
});
