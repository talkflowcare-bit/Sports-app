import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission, isStaffOrOwner, isOwner, ROLE_PERMISSIONS } from "./rbac";
import { getAuditLogs, logAuditEvent } from "./audit";

test("RBAC permissions are properly separated across player, staff, and owner", () => {
  assert.equal(hasPermission("player", "canCreateTournament"), false);
  assert.equal(hasPermission("player", "canApproveWithdrawals"), false);
  assert.equal(hasPermission("staff", "canCreateTournament"), true);
  assert.equal(hasPermission("staff", "canApproveDeposits"), true);
  assert.equal(hasPermission("staff", "canApproveWithdrawals"), false, "Staff must not approve withdrawals");
  assert.equal(hasPermission("owner", "canApproveWithdrawals"), true);
  assert.equal(hasPermission("owner", "canManageUsers"), true);
  assert.equal(hasPermission("owner", "canAssignRoles"), true);

  assert.equal(isStaffOrOwner("player"), false);
  assert.equal(isStaffOrOwner("staff"), true);
  assert.equal(isStaffOrOwner("owner"), true);
  assert.equal(isOwner("staff"), false);
  assert.equal(isOwner("owner"), true);
});

test("Audit logging computes cryptographic hash and appends valid chain entry", async () => {
  const logs = await getAuditLogs();
  assert.ok(logs.length >= 4, "Initial seed logs must be present");
  const first = logs[0];
  assert.ok(first.integrityHash && first.integrityHash.length === 64, "Integrity hash must be SHA-256");

  const newLog = await logAuditEvent({
    actorId: "test-user-id",
    actorName: "Test Officer",
    actorRole: "staff",
    action: "UNIT_TEST_EVENT",
    entityType: "security",
    details: "Automated regression validation of audit subsystem.",
    severity: "info",
  });

  assert.equal(newLog.action, "UNIT_TEST_EVENT");
  assert.ok(newLog.integrityHash.length === 64);
  assert.ok(newLog.timestamp);
});
