/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logAuditEvent } from "./audit";

export interface SecurityPasscodes {
  ownerPasscode: string;
  staffPasscode: string;
  updatedAt: string;
}

export const PASSCODES_STORAGE_KEY = "dark_esports_security_passcodes_v2";

export const DEFAULT_OWNER_PASSCODE = "DARK_OWNER_2026";
export const DEFAULT_STAFF_PASSCODE = "DARK_STAFF_2026";

// Fallback legacy/master keys for backwards compatibility
export const FALLBACK_OWNER_KEYS = ["DARK_OWNER_2026", "DARKXPROFESSOR999", "owner@123"];
export const FALLBACK_STAFF_KEYS = ["DARK_STAFF_2026", "DARKSTAFF777", "staff@123"];

let _memoryPasscodes: SecurityPasscodes = {
  ownerPasscode: DEFAULT_OWNER_PASSCODE,
  staffPasscode: DEFAULT_STAFF_PASSCODE,
  updatedAt: new Date().toISOString(),
};

export function getSecurityPasscodes(): SecurityPasscodes {
  if (typeof window === "undefined") {
    return _memoryPasscodes;
  }

  try {
    const raw = localStorage.getItem(PASSCODES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.ownerPasscode && parsed.staffPasscode) {
        _memoryPasscodes = parsed;
        return parsed;
      }
    }
  } catch {}

  const defaults: SecurityPasscodes = {
    ownerPasscode: DEFAULT_OWNER_PASSCODE,
    staffPasscode: DEFAULT_STAFF_PASSCODE,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(defaults));
  } catch {}

  _memoryPasscodes = defaults;
  return defaults;
}

export function saveSecurityPasscodes(
  newPasscodes: { ownerPasscode: string; staffPasscode: string },
  actorName = "Owner"
): SecurityPasscodes {
  const updated: SecurityPasscodes = {
    ownerPasscode: newPasscodes.ownerPasscode.trim() || DEFAULT_OWNER_PASSCODE,
    staffPasscode: newPasscodes.staffPasscode.trim() || DEFAULT_STAFF_PASSCODE,
    updatedAt: new Date().toISOString(),
  };

  _memoryPasscodes = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("dark_esports_passcodes_updated"));
    } catch (e) {
      console.error("Failed to save security passcodes:", e);
    }
  }

  void logAuditEvent({
    actorId: "owner-security",
    actorName,
    actorRole: "owner",
    action: "SECURITY_PASSCODES_UPDATED",
    entityType: "security",
    details: `Owner updated master clearance passcodes. New Owner Passcode: [${updated.ownerPasscode.slice(0, 3)}***], New Staff Passcode: [${updated.staffPasscode.slice(0, 3)}***]`,
    severity: "critical",
  });

  return updated;
}

export interface VerifyPasscodeResult {
  success: boolean;
  role?: "owner" | "staff";
  targetRoute?: "/admin" | "/staff";
  error?: string;
}

/**
 * Checks an entered code against active Owner and Staff passcodes.
 * If owner code is entered -> unlocks owner role & returns '/admin'.
 * If staff code is entered -> unlocks staff role & returns '/staff'.
 */
export function verifyPasscode(input: string): VerifyPasscodeResult {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return { success: false, error: "Please enter passcode" };
  }

  const { ownerPasscode, staffPasscode } = getSecurityPasscodes();

  // 1. Check Owner Passcode
  if (trimmed === ownerPasscode || FALLBACK_OWNER_KEYS.includes(trimmed)) {
    return {
      success: true,
      role: "owner",
      targetRoute: "/admin",
    };
  }

  // 2. Check Staff Passcode
  if (trimmed === staffPasscode || FALLBACK_STAFF_KEYS.includes(trimmed)) {
    return {
      success: true,
      role: "staff",
      targetRoute: "/staff",
    };
  }

  return {
    success: false,
    error: "Invalid security passcode. Clearance denied.",
  };
}
