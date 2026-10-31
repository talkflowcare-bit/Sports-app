import test from "node:test";
import assert from "node:assert/strict";
import {
  getSecurityPasscodes,
  saveSecurityPasscodes,
  verifyPasscode,
  DEFAULT_OWNER_PASSCODE,
  DEFAULT_STAFF_PASSCODE,
} from "./passcodes";

test("getSecurityPasscodes returns default passcodes when storage is empty", () => {
  const codes = getSecurityPasscodes();
  assert.equal(codes.ownerPasscode, DEFAULT_OWNER_PASSCODE);
  assert.equal(codes.staffPasscode, DEFAULT_STAFF_PASSCODE);
});

test("verifyPasscode distinguishes between owner and staff codes correctly", () => {
  // Owner verification
  const ownerResult = verifyPasscode(DEFAULT_OWNER_PASSCODE);
  assert.equal(ownerResult.success, true);
  assert.equal(ownerResult.role, "owner");
  assert.equal(ownerResult.targetRoute, "/admin");

  // Staff verification
  const staffResult = verifyPasscode(DEFAULT_STAFF_PASSCODE);
  assert.equal(staffResult.success, true);
  assert.equal(staffResult.role, "staff");
  assert.equal(staffResult.targetRoute, "/staff");

  // Invalid passcode
  const invalidResult = verifyPasscode("wrong_password_999");
  assert.equal(invalidResult.success, false);
  assert.ok(invalidResult.error);
});

test("saveSecurityPasscodes updates passcodes and verification respects new values", () => {
  saveSecurityPasscodes({
    ownerPasscode: "NEW_OWNER_KEY_777",
    staffPasscode: "NEW_STAFF_KEY_333",
  }, "Test Owner");

  const newCodes = getSecurityPasscodes();
  assert.equal(newCodes.ownerPasscode, "NEW_OWNER_KEY_777");
  assert.equal(newCodes.staffPasscode, "NEW_STAFF_KEY_333");

  // Check verification with new keys
  const verifiedOwner = verifyPasscode("NEW_OWNER_KEY_777");
  assert.equal(verifiedOwner.success, true);
  assert.equal(verifiedOwner.role, "owner");
  assert.equal(verifiedOwner.targetRoute, "/admin");

  const verifiedStaff = verifyPasscode("NEW_STAFF_KEY_333");
  assert.equal(verifiedStaff.success, true);
  assert.equal(verifiedStaff.role, "staff");
  assert.equal(verifiedStaff.targetRoute, "/staff");

  // Restore defaults for consistent clean state
  saveSecurityPasscodes({
    ownerPasscode: DEFAULT_OWNER_PASSCODE,
    staffPasscode: DEFAULT_STAFF_PASSCODE,
  }, "Test Restore");
});
