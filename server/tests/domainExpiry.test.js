/**
 * Domain expiry parsing and the name.com → broker match.
 * Run with:  node --test server/tests/domainExpiry.test.js
 *
 * Pure functions only — no database and no name.com calls.
 */
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  expireDateFromRegistration,
  parseDomainExpireDate,
} from "../services/nameComClient.js";
import { planDomainExpiryUpdates } from "../services/domainMonitor.js";

test("expireDateFromRegistration reads CreateDomain and already-owned shapes", () => {
  const iso = expireDateFromRegistration({
    domain: { domainName: "example.org", expireDate: "2027-10-12T10:00:00Z" },
    order: 1,
    totalPaid: 12.99,
  });
  assert.equal(iso, "2027-10-12T10:00:00.000Z");

  const owned = expireDateFromRegistration({
    alreadyOwned: true,
    domain: { domainName: "example.org", expireDate: "2027-10-12T10:00:00Z" },
  });
  assert.equal(owned, "2027-10-12T10:00:00.000Z");
});

test("expireDateFromRegistration is null when expireDate is missing or junk", () => {
  assert.equal(expireDateFromRegistration({ domain: { domainName: "a.com" } }), null);
  assert.equal(expireDateFromRegistration({}), null);
  assert.equal(expireDateFromRegistration(null), null);
  assert.equal(parseDomainExpireDate("not-a-date"), null);
});

test("planDomainExpiryUpdates matches lowercase and skips unchanged dates", () => {
  const plan = planDomainExpiryUpdates(
    [
      {
        id: "b1",
        custom_domain: "Example.ORG",
        domain_expires_at: "2027-10-12T10:00:00.000Z",
      },
      {
        id: "b2",
        custom_domain: "new.com",
        domain_expires_at: null,
      },
      {
        id: "b3",
        custom_domain: "   ",
        domain_expires_at: null,
      },
    ],
    [
      { domainName: "example.org", expireDate: "2027-10-12T10:00:00Z" },
      { domainName: "new.com", expireDate: "2028-01-01T00:00:00Z" },
    ],
  );

  assert.deepEqual(plan.updates, [
    { id: "b2", domain_expires_at: "2028-01-01T00:00:00.000Z" },
  ]);
  assert.deepEqual(plan.missing, []);
  assert.deepEqual(plan.unreadable, []);
});

test("planDomainExpiryUpdates does not clear a date missing from name.com", () => {
  const plan = planDomainExpiryUpdates(
    [
      {
        id: "b1",
        custom_domain: "gone.com",
        domain_expires_at: "2027-10-12T10:00:00.000Z",
      },
      {
        id: "b2",
        custom_domain: "blank-date.com",
        domain_expires_at: "2027-10-12T10:00:00.000Z",
      },
    ],
    [{ domainName: "blank-date.com" }],
  );

  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.missing, [{ id: "b1", domain: "gone.com" }]);
  assert.deepEqual(plan.unreadable, [{ id: "b2", domain: "blank-date.com" }]);
});
