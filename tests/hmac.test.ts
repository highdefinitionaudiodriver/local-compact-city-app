import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

// hmac.ts reads EXPORT_HMAC_SECRET inside each function call (not at module
// load), so we can set it before importing.
process.env.EXPORT_HMAC_SECRET = "test-secret-key-0123456789";

const { hmacHex, canonicalize, safeEqualHex } = await import("../src/lib/hmac.ts");

test("hmacHex matches a reference HMAC-SHA256 hex digest", () => {
  const expected = createHmac("sha256", process.env.EXPORT_HMAC_SECRET!)
    .update("hello")
    .digest("hex");
  assert.equal(hmacHex("hello"), expected);
});

test("hmacHex is deterministic for the same input", () => {
  assert.equal(hmacHex("payload"), hmacHex("payload"));
});

test("hmacHex differs for different inputs", () => {
  assert.notEqual(hmacHex("a"), hmacHex("b"));
});

test("hmacHex accepts a Buffer", () => {
  assert.equal(hmacHex(Buffer.from("hello")), hmacHex("hello"));
});

test("canonicalize sorts object keys recursively (order-independent)", () => {
  const a = canonicalize({ b: 1, a: { d: 4, c: 3 } });
  const b = canonicalize({ a: { c: 3, d: 4 }, b: 1 });
  assert.equal(a, b);
  assert.equal(a, '{"a":{"c":3,"d":4},"b":1}');
});

test("canonicalize preserves array order", () => {
  assert.equal(canonicalize([3, 1, 2]), "[3,1,2]");
});

test("canonicalize sorts keys of objects nested inside arrays", () => {
  assert.equal(canonicalize([{ y: 2, x: 1 }]), '[{"x":1,"y":2}]');
});

test("safeEqualHex returns true for identical digests", () => {
  const h = hmacHex("x");
  assert.equal(safeEqualHex(h, h), true);
});

test("safeEqualHex returns false for differing digests of equal length", () => {
  assert.equal(safeEqualHex(hmacHex("a"), hmacHex("b")), false);
});

test("safeEqualHex returns false for different-length strings", () => {
  assert.equal(safeEqualHex("aa", "aabb"), false);
});

test("signing the canonical form of a payload is stable across key order", () => {
  const sig1 = hmacHex(canonicalize({ amount: 100, id: "p1", tags: ["b", "a"] }));
  const sig2 = hmacHex(canonicalize({ tags: ["b", "a"], id: "p1", amount: 100 }));
  assert.equal(sig1, sig2);
});
