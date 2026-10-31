/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Bell, CheckCheck, Trash2, X, AlertTriangle, Trophy, Wallet, Info, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  getBroadcasts,
  markAllBroadcastsAsRead,
  markBroadcastAsRead,
  type BroadcastNotification,
  type BroadcastType,
} from "@/lib/broadcast";
import { fmtDate } from "@/lib/game";
import { Button } from "@/components/ui/button";

export function NotificationDrawer({
  isOpen,
  onClose,
  userId,
  notifications,
  onRefresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  notifications: BroadcastNotification[];
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"all" | BroadcastType>("all");

  if (!isOpen) return null;

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = userId ? notifications.filter((n) => !n.readBy.includes(userId)).length : 0;

  const handleMarkAllRead = () => {
    if (!userId) return;
    markAllBroadcastsAsRead(userId);
    onRefresh();
    toast.success("All notifications marked as read");
  };

  const handleItemClick = (n: BroadcastNotification) => {
    if (userId && !n.readBy.includes(userId)) {
      markBroadcastAsRead(n.id, userId);
      onRefresh();
    }
  };

  const renderBadge = (type: BroadcastType) => {
    switch (type) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-bold text-destructive">
            <AlertTriangle className="h-3 w-3" /> URGENT
          </span>
        );
      case "tournament":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500">
            <Trophy className="h-3 w-3" /> MATCH ALERT
          </span>
        );
      case "wallet":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-success/15 border border-success/30 px-2 py-0.5 text-[10px] font-bold text-success">
            <Wallet className="h-3 w-3" /> ADD CASH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Info className="h-3 w-3" /> NOTICE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-black/80 animate-fade" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-card border-l border-border flex flex-col shadow-2xl animate-pop text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-header">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-foreground tracking-wide">Live Broadcasts</h3>
              <p className="text-[10px] text-muted-foreground">{notifications.length} Announcements Received</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action bar & Filters */}
        <div className="border-b border-border/60 p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Filter by type:</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {(["all", "urgent", "tournament", "wallet", "info"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all whitespace-nowrap ${
                  filter === k
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              Koi nayi notification nahi hai.
            </div>
          ) : (
            filtered.map((item) => {
              const isUnread = userId ? !item.readBy.includes(userId) : false;
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`rounded-2xl border p-3.5 transition-all relative ${
                    isUnread
                      ? "border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card shadow-sm"
                      : "border-border/60 bg-muted/30 opacity-90"
                  }`}
                >
                  {isUnread && (
                    <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}

                  <div className="flex items-center gap-2 mb-1.5">
                    {renderBadge(item.type)}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {fmtDate(item.created_at)}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-foreground mb-1 leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
                    <span
                      className={`font-semibold ${
                        item.senderRole === "owner"
                          ? "text-amber-500 flex items-center gap-1"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.senderRole === "owner" && "👑"} {item.sender}
                    </span>

                    {item.actionUrl && (
                      <a
                        href={item.actionUrl}
                        className="flex items-center gap-1 font-bold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-border p-3 text-center text-[10px] text-muted-foreground bg-header">
          Central Dispatch System • Real-time encrypted channel
        </div>
      </div>
    </div>
  );
}
