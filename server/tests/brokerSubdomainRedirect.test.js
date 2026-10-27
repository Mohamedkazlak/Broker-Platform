/**
 * Old broker subdomain -> custom domain redirect.
 * Run with:  node --test server/tests/
 *
 * Uses the real subdomainMiddleware for subdomain hosts and an injected
 * lookup in place of the database, so it needs no network.
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

import subdomainMiddleware from "../middleware/subdomain.middleware.js";
import { createBrokerSubdomainRedirect } from "../middleware/brokerSubdomainRedirect.js";

const ACTIVE = {
  id: "b1",
  subdomain: "mohamedd",
  custom_domain: "kazlak.live",
  domain_status: "active",
  is_active: true,
};

let lookupCalls = [];
let lookupImpl = async (subdomain) => (subdomain === "mohamedd" ? ACTIVE : null);

function startApp({ status } = {}) {
  const app = express();
  app.use(subdomainMiddleware);
  app.use(
    createBrokerSubdomainRedirect({
      lookup: (subdomain) => {
        lookupCalls.push(subdomain);
        return lookupImpl(subdomain);
      },
      ...(status ? { status } : {}),
    }),
  );
  app.use((req, res) => res.status(200).send(`served ${req.method} ${req.originalUrl}`));
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function request(server, { host, path = "/", method = "GET", headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: server.address().port,
        path,
        method,
        headers: { Host: host, ...headers },
      },
      (res) => {
        res.resume();
        res.on("end", () =>
          resolve({ status: res.statusCode, location: res.headers.location }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

let server;
before(async () => {
  server = await startApp();
});
after(() => server.close());

const reset = () => {
  lookupCalls = [];
  lookupImpl = async (subdomain) => (subdomain === "mohamedd" ? ACTIVE : null);
};

test("subdomain root redirects to the custom domain with 302", async () => {
  reset();
  const res = await request(server, { host: "mohamedd.brokersplatform.shop", path: "/" });
  assert.equal(res.status, 302);
  assert.equal(res.location, "https://kazlak.live/");
});

test("path and query string are preserved", async () => {
  reset();
  for (const path of [
    "/en/dashboard",
    "/en/login",
    "/en/properties?type=villa&page=2",
    "/ar/properties/42?ref=wa",
  ]) {
    const res = await request(server, { host: "mohamedd.brokersplatform.shop", path });
    assert.equal(res.status, 302, path);
    assert.equal(res.location, `https://kazlak.live${path}`, path);
  }
});

test("HEAD redirects, other methods do not", async () => {
  reset();
  const head = await request(server, { host: "mohamedd.brokersplatform.shop", method: "HEAD", path: "/en/home" });
  assert.equal(head.status, 302);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const res = await request(server, { host: "mohamedd.brokersplatform.shop", method, path: "/en/home" });
    assert.equal(res.status, 200, method);
  }
});

test("/api/* and webhook paths on the subdomain are untouched", async () => {
  reset();
  for (const path of [
    "/api",
    "/api/health",
    "/api/properties?x=1",
    "/api/webhooks/paymob",
    "/api/payments/webhook",
    "/API/health",
  ]) {
    const res = await request(server, { host: "mohamedd.brokersplatform.shop", path });
    assert.equal(res.status, 200, path);
    assert.equal(res.location, undefined, path);
  }
  // A path that merely starts with the letters "api" is a page, not the API.
  const page = await request(server, { host: "mohamedd.brokersplatform.shop", path: "/apiary" });
  assert.equal(page.status, 302);
});

test("broker without an active custom domain is not redirected", async () => {
  reset();
  for (const subdomain of ["ma7-2011", "unknown"]) {
    const res = await request(server, { host: `${subdomain}.brokersplatform.shop`, path: "/en/home" });
    assert.equal(res.status, 200, subdomain);
  }
});

test("a custom domain that is not active is not redirected", async () => {
  reset();
  for (const row of [
    { ...ACTIVE, domain_status: "pending" },
    { ...ACTIVE, domain_status: "dns_pending" },
    { ...ACTIVE, is_active: false },
    { ...ACTIVE, custom_domain: null },
    { ...ACTIVE, custom_domain: "" },
  ]) {
    lookupImpl = async () => row;
    const res = await request(server, { host: "mohamedd.brokersplatform.shop", path: "/en/home" });
    assert.equal(res.status, 200, JSON.stringify(row));
  }
});

test("local, IP, staging, main and platform hosts are never redirected", async () => {
  reset();
  const cases = [
    { host: "localhost:8080" },
    { host: "mohamedd.localhost:8080" },
    { host: "127.0.0.1:5000" },
    { host: "mohamedd.onrender.com" },
    { host: "broker-platform-957u.onrender.com" },
    { host: "brokersplatform.shop" },
    { host: "www.brokersplatform.shop" },
    // Header fallback names a broker, but the host is the apex: not a broker host.
    { host: "brokersplatform.shop", headers: { "X-Tenant-Subdomain": "mohamedd" } },
    { host: "localhost:5000", headers: { "X-Tenant-Subdomain": "mohamedd" } },
  ];
  for (const c of cases) {
    const res = await request(server, { path: "/en/home", ...c });
    assert.equal(res.status, 200, c.host);
  }
});

test("redirect target that is a platform host is refused (no loop)", async () => {
  reset();
  for (const custom_domain of ["mohamedd.brokersplatform.shop", "other.brokersplatform.shop", "brokersplatform.shop", "localhost"]) {
    lookupImpl = async () => ({ ...ACTIVE, custom_domain });
    const res = await request(server, { host: "mohamedd.brokersplatform.shop", path: "/en/home" });
    assert.equal(res.status, 200, custom_domain);
  }
});

test("a request already on the custom domain is never redirected", async () => {
  // Simulates subdomainMiddleware having resolved kazlak.live as a custom domain.
  const app = express();
  app.use((req, _res, next) => {
    req.hostnameRaw = req.hostname;
    req.subdomain = "mohamedd";
    req.tenantType = "custom";
    next();
  });
  app.use(createBrokerSubdomainRedirect({ lookup: async () => ACTIVE }));
  app.use((_req, res) => res.status(200).end());
  const s = await new Promise((r) => { const x = app.listen(0, "127.0.0.1", () => r(x)); });
  try {
    for (const host of ["kazlak.live", "www.kazlak.live"]) {
      const res = await request(s, { host, path: "/en/dashboard" });
      assert.equal(res.status, 200, host);
    }
  } finally {
    s.close();
  }
});

test("a lookup failure serves the subdomain instead of failing the page", async () => {
  reset();
  lookupImpl = async () => {
    throw new Error("db down");
  };
  const res = await request(server, { host: "mohamedd.brokersplatform.shop", path: "/en/home" });
  assert.equal(res.status, 200);
});

test("the redirect status is configurable", async () => {
  const s = await startApp({ status: 301 });
  try {
    reset();
    const res = await request(s, { host: "mohamedd.brokersplatform.shop", path: "/en/home" });
    assert.equal(res.status, 301);
    assert.equal(res.location, "https://kazlak.live/en/home");
  } finally {
    s.close();
  }
});

test("the default status constant is 302", async () => {
  const { BROKER_SUBDOMAIN_REDIRECT_STATUS } = await import("../config/brokerHost.js");
  assert.equal(BROKER_SUBDOMAIN_REDIRECT_STATUS, 302);
});
