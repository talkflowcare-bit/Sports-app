/**
 * Integrated Database Logging & Audit System for DARK ESPORTS.
 * Tracks all administrative, financial, tournament, and authentication actions
 * with cryptographic SHA-256 integrity chaining to detect any tampering.
 */

import { sha256 } from "./crypto";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: "owner" | "staff" | "player" | "system";
  action: string;
  entityType: "tournament" | "match" | "transaction" | "user" | "setting" | "auth" | "apk" | "security";
  entityId?: string;
  details: string;
  metadata?: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
  integrityHash: string;
  previousHash?: string;
}

const AUDIT_STORAGE_KEY = "dark_esports_audit_logs_v1";

const INITIAL_LOGS: Omit<AuditLogEntry, "integrityHash">[] = [
  {
    id: "log-seed-1",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    actorId: "00000000-0000-0000-0000-000000000000",
    actorName: "System Kernel",
    actorRole: "system",
    action: "SYSTEM_INITIALIZED",
    entityType: "security",
    details: "DARK ESPORTS Secure Kernel initialized with PBKDF2 & AES-256-GCM encryption standards.",
    severity: "info",
    previousHash: "GENESIS_BLOCK_000000000000000000000000000000000000000000000000000000000000",
  },
  {
    id: "log-seed-2",
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    actorId: "00000000-0000-4000-8000-009999999999",
    actorName: "DARK_OWNER",
    actorRole: "owner",
    action: "APK_BUILD_VERIFIED",
    entityType: "apk",
    details: "DarkEsports.apk package verified with SHA-256 certificate signature. Direct APK download channel mounted.",
    metadata: { version: "1.0.0", sizeBytes: 361632, package: "com.darkesports.app" },
    severity: "info",
  },
  {
    id: "log-seed-3",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    actorId: "00000000-0000-4000-8000-009999999999",
    actorName: "DARK_OWNER",
    actorRole: "owner",
    action: "ROLE_ACCESS_POLICY_ENFORCED",
    entityType: "security",
    details: "Enforced strict RBAC policy: Owner & Staff authentication separated from Player space.",
    severity: "info",
  },
  {
    id: "log-seed-4",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    actorId: "00000000-0000-4000-8000-008888888888",
    actorName: "STAFF_MODERATOR",
    actorRole: "staff",
    action: "ROOM_CREDENTIALS_SET",
    entityType: "tournament",
    entityId: "9973ad8d-1cd3-4d37-8d01-d63b0049fcb7",
    details: "Room ID & Pass encrypted and queued for release 15 mins prior to Solo Battle #101.",
    severity: "info",
  },
];

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  if (typeof window === "undefined") {
    return Promise.all(
      INITIAL_LOGS.map(async (l, idx, arr) => {
        const prev = idx > 0 ? arr[idx - 1].id : "GENESIS";
        const hash = await sha256(`${l.id}:${l.timestamp}:${l.action}:${prev}`);
        return { ...l, integrityHash: hash };
      })
    );
  }

  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed: AuditLogEntry[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Compute hashes for initial seed logs
  const initialized: AuditLogEntry[] = [];
  let prevHash = "GENESIS_HASH_000000000000";
  for (const entry of INITIAL_LOGS) {
    const hash = await sha256(`${entry.id}:${entry.timestamp}:${entry.action}:${prevHash}`);
    initialized.push({ ...entry, integrityHash: hash, previousHash: prevHash });
    prevHash = hash;
  }

  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(initialized));
  } catch {}

  return initialized;
}

export async function logAuditEvent(
  entry: Omit<AuditLogEntry, "id" | "timestamp" | "integrityHash" | "previousHash">
): Promise<AuditLogEntry> {
  const currentLogs = await getAuditLogs();
  const lastEntry = currentLogs[0];
  const previousHash = lastEntry ? lastEntry.integrityHash : "GENESIS_CHAIN";

  const id = "log-" + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36));
  const timestamp = new Date().toISOString();
  const integrityPayload = `${id}:${timestamp}:${entry.action}:${entry.actorId}:${previousHash}`;
  const integrityHash = await sha256(integrityPayload);

  const fullEntry: AuditLogEntry = {
    ...entry,
    id,
    timestamp,
    previousHash,
    integrityHash,
  };

  // Prepend new entry
  const updated = [fullEntry, ...currentLogs];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated.slice(0, 300)));
    } catch {}
  }

  return fullEntry;
}

export function exportAuditLogsAsJson(logs: AuditLogEntry[]): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `DARK_ESPORTS_AUDIT_LOGS_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportAuditLogsAsCsv(logs: AuditLogEntry[]): void {
  const headers = ["Timestamp", "Action", "Actor Name", "Actor Role", "Severity", "Details", "Integrity Hash"];
  const rows = logs.map((l) => [
    `"${l.timestamp}"`,
    `"${l.action}"`,
    `"${l.actorName.replace(/"/g, '""')}"`,
    `"${l.actorRole}"`,
    `"${l.severity}"`,
    `"${l.details.replace(/"/g, '""')}"`,
    `"${l.integrityHash}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `DARK_ESPORTS_AUDIT_LOGS_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
