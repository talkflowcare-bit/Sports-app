import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  encryptData,
  decryptData,
  sha256,
  maskPhone,
  maskUpi,
} from "./crypto";

test("hashPassword and verifyPassword work correctly with salt", async () => {
  const password = "SecretMasterPassword123!";
  const { hash, salt } = await hashPassword(password);
  assert.ok(hash && hash.length === 64, "SHA-256 derived key should produce 64 hex characters");
  assert.ok(salt && salt.length > 0, "Salt must not be empty");

  // Verify correct password
  const isValid = await verifyPassword(password, hash, salt);
  assert.equal(isValid, true, "Correct password must verify to true");

  // Verify wrong password
  const isInvalid = await verifyPassword("WrongPassword", hash, salt);
  assert.equal(isInvalid, false, "Wrong password must verify to false");
});

test("encryptData and decryptData perform AES-256-GCM round trip", async () => {
  const sensitiveSecret = "FreeFire_RoomPass_Secure#2026_Room9982";
  const encrypted = await encryptData(sensitiveSecret);
  assert.ok(encrypted.includes(":"), "Encrypted payload must contain IV and ciphertext delimiter");
  assert.notEqual(encrypted, sensitiveSecret, "Encrypted data must not match plaintext");

  const decrypted = await decryptData(encrypted);
  assert.equal(decrypted, sensitiveSecret, "Decrypted text must match original plaintext");
});

test("sha256 computes consistent deterministic digests", async () => {
  const digest1 = await sha256("DARK_ESPORTS_APK_V1");
  const digest2 = await sha256("DARK_ESPORTS_APK_V1");
  assert.equal(digest1, digest2);
  assert.equal(digest1.length, 64);
});

test("maskPhone and maskUpi protect sensitive user credentials in UI", () => {
  assert.equal(maskPhone("9876543210"), "******3210");
  assert.equal(maskPhone("123"), "123");
  assert.equal(maskUpi("666zishan@fam"), "66*******@fam");
  assert.equal(maskUpi("a@upi"), "a*@upi");
});
