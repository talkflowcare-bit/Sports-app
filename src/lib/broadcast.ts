/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logAuditEvent } from "./audit";

export type BroadcastType = "urgent" | "tournament" | "info" | "wallet";

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: BroadcastType;
  sender: string;
  senderRole: "owner" | "staff" | "system";
  pinned: boolean;
  actionUrl?: string;
  created_at: string;
  readBy: string[]; // list of user IDs who opened it
}

export const BROADCAST_STORAGE_KEY = "dark_esports_broadcasts_v1";

export const DEFAULT_BROADCASTS: BroadcastNotification[] = [
  {
    id: "notif-1",
    title: "🔥 Free Fire Grand Weekend Scrims Live!",
    message: "Mega ₹10,000 Prize Pool tournament registrations are now open. Reserve your squad slot before room fills!",
    type: "tournament",
    sender: "DARKXPROFESSOR (Owner)",
    senderRole: "owner",
    pinned: true,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    readBy: [],
  },
  {
    id: "notif-2",
    title: "⚡ Instant UPI Add Cash Verification Active",
    message: "Now deposit money instantly using UPI QR code (666zishan@fam). Balances are updated in under 60 seconds.",
    type: "wallet",
    sender: "Staff Moderator",
    senderRole: "staff",
    pinned: false,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    readBy: [],
  },
  {
    id: "notif-3",
    title: "🛡️ Anti-Cheat & Fair Play Notice",
    message: "Emulators and third-party modifications are strictly prohibited. Room ID & Passwords are sent 15 mins prior to match start.",
    type: "info",
    sender: "Central HQ",
    senderRole: "system",
    pinned: false,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    readBy: [],
  },
];

export function getBroadcasts(): BroadcastNotification[] {
  if (typeof window === "undefined") return DEFAULT_BROADCASTS;
  try {
    const raw = localStorage.getItem(BROADCAST_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(DEFAULT_BROADCASTS));
      return DEFAULT_BROADCASTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_BROADCASTS;
  }
}

export function saveBroadcasts(items: BroadcastNotification[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("dark_esports_broadcasts_updated"));
  } catch (e) {
    console.error("Failed to save broadcasts:", e);
  }
}

export function createBroadcast(data: {
  title: string;
  message: string;
  type: BroadcastType;
  sender: string;
  senderRole: "owner" | "staff" | "system";
  pinned?: boolean;
  actionUrl?: string;
  actorId?: string;
}): BroadcastNotification {
  const current = getBroadcasts();
  const newNotif: BroadcastNotification = {
    id: "notif-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
    title: data.title.trim(),
    message: data.message.trim(),
    type: data.type,
    sender: data.sender,
    senderRole: data.senderRole,
    pinned: !!data.pinned,
    actionUrl: data.actionUrl?.trim() || undefined,
    created_at: new Date().toISOString(),
    readBy: [],
  };

  const updated = [newNotif, ...current];
  saveBroadcasts(updated);

  void logAuditEvent({
    actorId: data.actorId || "admin-system",
    actorName: data.sender,
    actorRole: data.senderRole,
    action: "BROADCAST_NOTIFICATION_PUBLISHED",
    entityType: "notification",
    details: `Broadcast sent [${data.type.toUpperCase()}]: "${data.title}" (Pinned: ${!!data.pinned})`,
    severity: data.type === "urgent" ? "warning" : "info",
  });

  return newNotif;
}

export function deleteBroadcast(id: string, actorName = "Admin") {
  const current = getBroadcasts();
  const filtered = current.filter((b) => b.id !== id);
  saveBroadcasts(filtered);

  void logAuditEvent({
    actorId: "admin",
    actorName,
    actorRole: "staff",
    action: "BROADCAST_NOTIFICATION_DELETED",
    entityType: "notification",
    details: `Deleted notification ID: ${id}`,
    severity: "info",
  });
}

export function markBroadcastAsRead(notifId: string, userId: string) {
  if (!userId) return;
  const current = getBroadcasts();
  const updated = current.map((n) => {
    if (n.id === notifId && !n.readBy.includes(userId)) {
      return { ...n, readBy: [...n.readBy, userId] };
    }
    return n;
  });
  saveBroadcasts(updated);
}

export function markAllBroadcastsAsRead(userId: string) {
  if (!userId) return;
  const current = getBroadcasts();
  const updated = current.map((n) => {
    if (!n.readBy.includes(userId)) {
      return { ...n, readBy: [...n.readBy, userId] };
    }
    return n;
  });
  saveBroadcasts(updated);
}

export function getUnreadCount(userId: string): number {
  if (!userId) return 0;
  const list = getBroadcasts();
  return list.filter((n) => !n.readBy.includes(userId)).length;
}
