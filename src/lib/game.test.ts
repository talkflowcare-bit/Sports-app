import test from "node:test";
import assert from "node:assert/strict";
import { countdown, inr, errMsg, fmtDate } from "./game-logic";

test("inr formats numbers as Indian Rupee strings", () => {
  assert.equal(inr(0), "₹0");
  assert.equal(inr(50), "₹50");
  assert.equal(inr(1500), "₹1,500");
  assert.equal(inr(null), "₹0");
  assert.equal(inr(undefined), "₹0");
});

test("countdown formats future timestamps correctly", () => {
  const now = 1700000000000;
  // 1 hour 2 mins 45 secs in the future = 3600000 + 120000 + 45000 = 3765000 ms
  const future1h = new Date(now + 3765000).toISOString();
  assert.equal(countdown(future1h, now), "01:02:45");

  // Past timestamp = "Started"
  const past = new Date(now - 1000).toISOString();
  assert.equal(countdown(past, now), "Started");

  // Exactly now = "Started"
  assert.equal(countdown(new Date(now).toISOString(), now), "Started");

  // Timestamp more than 24h away (2 days and 3 hours)
  const future2d = new Date(now + 48 * 3600000 + 3 * 3600000).toISOString();
  assert.equal(countdown(future2d, now), "2d 3h");
});

test("errMsg extracts error messages safely", () => {
  assert.equal(errMsg(new Error("Network failed")), "Network failed");
  assert.equal(errMsg({ message: "Invalid credentials" }), "Invalid credentials");
  assert.equal(errMsg("Random string error"), "Something went wrong");
  assert.equal(errMsg(null), "Something went wrong");
});

test("fmtDate formats ISO string cleanly", () => {
  const dateStr = new Date(2026, 9, 31, 18, 30).toISOString();
  const formatted = fmtDate(dateStr);
  assert.ok(typeof formatted === "string" && formatted.length > 0);
});
