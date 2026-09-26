import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

/*
 * Security gate: a guest Premium purchase must only reach an account that
 * has verified the buyer email.
 */

let profiles = {};
let pendingDocs = {};
let transactions = 0;

function fakeDb() {
  return {
    collection(name) {
      return {
        doc(id) {
          return {
            id,
            async get() {
              if (name === "users") {
                const p = profiles[id];
                return { exists: Boolean(p), data: () => ({ membership: p?.membership }) };
              }
              const d = pendingDocs[id];
              return { exists: Boolean(d), data: () => d };
            },
          };
        },
        where() {
          return { limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) };
        },
      };
    },
    async runTransaction(fn) {
      transactions += 1;
      return fn({
        get: async (ref) => ref.get(),
        set: () => {},
        delete: () => {},
      });
    },
  };
}

mock.module("@/lib/firebase-admin", {
  namedExports: { isFirebaseConfigured: () => true, getFirestoreDb: () => fakeDb() },
});
mock.module("@/lib/users", {
  namedExports: {
    getUserById: async (id) => profiles[id] ?? null,
    getVerifiedUserByEmail: async (email) =>
      Object.values(profiles).find((p) => p.email === email && p.emailVerified && !p.disabled) ?? null,
    normalizeEmail: (e) => e.trim().toLowerCase(),
  },
});

const store = await import("../src/lib/membership-store.ts");

const live = {
  status: "active",
  plan: "monthly",
  currentPeriodEnd: "2026-10-26T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  trialEnd: null,
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  priceId: "price_m",
  stripeEventAt: null,
};

beforeEach(() => {
  profiles = {};
  pendingDocs = {};
  transactions = 0;
});

describe("premium claim needs a verified email", () => {
  it("webhook email match skips unverified accounts", async () => {
    profiles.cred_x = { id: "cred_x", email: "buyer@example.com", emailVerified: false, disabled: false };
    const target = await store.resolveMembershipTarget({ userId: null, customerId: null, email: "buyer@example.com" });
    assert.deepEqual(target, { kind: "pending", email: "buyer@example.com" });
  });

  it("webhook email match goes to a verified account", async () => {
    profiles.g1 = { id: "g1", email: "buyer@example.com", emailVerified: true, disabled: false };
    const target = await store.resolveMembershipTarget({ userId: null, customerId: null, email: "buyer@example.com" });
    assert.deepEqual(target, { kind: "user", userId: "g1" });
  });

  it("unverified reader does not claim the pending purchase", async () => {
    profiles.cred_x = { id: "cred_x", email: "buyer@example.com", emailVerified: false, disabled: false };
    pendingDocs[store.pendingMembershipDocId("buyer@example.com")] = { membership: live };
    const result = await store.getReaderMembership("cred_x", "buyer@example.com");
    assert.equal(result, null);
    assert.equal(transactions, 0);
    assert.equal(await store.hasPendingMembership("buyer@example.com"), true);
  });

  it("verified reader claims it", async () => {
    profiles.cred_x = { id: "cred_x", email: "buyer@example.com", emailVerified: true, disabled: false };
    pendingDocs[store.pendingMembershipDocId("buyer@example.com")] = { membership: live };
    mock.method(console, "warn", () => {});
    const result = await store.getReaderMembership("cred_x", "buyer@example.com");
    assert.equal(transactions, 1);
    assert.equal(result?.status, "active");
  });

  it("session email must match the verified profile email", async () => {
    profiles.cred_x = { id: "cred_x", email: "someone@example.com", emailVerified: true, disabled: false };
    pendingDocs[store.pendingMembershipDocId("buyer@example.com")] = { membership: live };
    await store.getReaderMembership("cred_x", "buyer@example.com");
    assert.equal(transactions, 0);
  });
});
