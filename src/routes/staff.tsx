/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Trophy,
  Users,
  KeyRound,
  Radio,
  ArrowLeft,
  Lock,
  X,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Flag,
  FileText,
  HelpCircle,
  ExternalLink,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth, getRegisteredUsers, type StoredAccount } from "@/hooks/useAuth";
import { logAuditEvent, getAuditLogs, type AuditLogEntry } from "@/lib/audit";
import { inr, fmtDate, countdown, DEFAULT_TOURNAMENTS, type Tournament } from "@/lib/game";
import {
  createBroadcast,
  getBroadcasts,
  deleteBroadcast,
  type BroadcastNotification,
} from "@/lib/broadcast";
import { verifyPasscode } from "@/lib/passcodes";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Operations Deck — DARK ESPORTS" },
      { name: "description", content: "Match refereeing and room management deck for DARK ESPORTS staff." },
    ],
  }),
  component: StaffPage,
});

export function StaffPage() {
  const { user, account, role, verifyStaffOrOwnerPasscode, updateAccount } = useAuth();
  const navigate = useNavigate();

  // Authentication & Passcode check
  const [passcode, setPasscode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionElevated, setSessionElevated] = useState(false);

  // Active staff module tab
  const [activeTab, setActiveTab] = useState<"matches" | "roster" | "broadcasts" | "disputes" | "logs">("matches");

  // Local state for tournaments
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("dark_esports_tournaments_v1");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_TOURNAMENTS;
  });

  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>(() => getBroadcasts());
  const [userList, setUserList] = useState<StoredAccount[]>(() => getRegisteredUsers());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Room Dispatch modal
  const [dispatchRoomModal, setDispatchRoomModal] = useState<{ id: string; title: string; roomId: string; roomPass: string } | null>(null);

  // Match status update modal
  const [winnerModal, setWinnerModal] = useState<{ tourId: string; title: string; winnerIgn: string; kills: number } | null>(null);

  // New staff announcement form
  const [staffBroadcast, setStaffBroadcast] = useState({
    title: "",
    message: "",
    pinned: false,
  });

  // Dispute desk items
  const [disputes, setDisputes] = useState([
    {
      id: "disp-101",
      player: "DARK KING",
      phone: "9876543210",
      match: "Solo Night Battle #101",
      issue: "Did not receive Room Password before slot filled.",
      status: "open",
      time: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: "disp-102",
      player: "SniperPro99",
      phone: "9123456780",
      match: "CS 4v4 Arena #33",
      issue: "Opponent team was suspected of emulator usage in mobile room.",
      status: "in_review",
      time: new Date(Date.now() - 80 * 60000).toISOString(),
    },
  ]);

  useEffect(() => {
    getAuditLogs().then((logs) => setAuditLogs(logs));
    setUserList(getRegisteredUsers());
    setBroadcasts(getBroadcasts());
  }, [activeTab]);

  const isStaffOrOwner = sessionElevated || role === "staff" || role === "owner";

  // Passcode verification for Staff Gate
  const handlePasscodeUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      toast.error("Please enter staff authorization passcode");
      return;
    }
    setIsVerifying(true);
    const res = verifyPasscode(passcode.trim());
    setIsVerifying(false);

    if (res.success) {
      verifyStaffOrOwnerPasscode(passcode.trim());
      if (res.role === "owner") {
        toast.success("Owner credentials verified! You can operate Staff Deck or open Owner HQ.");
      } else {
        toast.success("Staff Clearance Verified: Welcome Moderator!");
      }
      setSessionElevated(true);
      setPasscode("");
    } else {
      toast.error("Invalid staff passcode! Clearance denied.");
    }
  };

  // ROOM DISPATCH
  const handleSaveAndDispatchRoom = () => {
    if (!dispatchRoomModal) return;
    if (!dispatchRoomModal.roomId.trim() || !dispatchRoomModal.roomPass.trim()) {
      toast.error("Please provide both Custom Room ID and Room Password");
      return;
    }

    // Persist room details
    localStorage.setItem(
      `dark_room_${dispatchRoomModal.id}`,
      JSON.stringify({
        room_id: dispatchRoomModal.roomId.trim(),
        room_pass: dispatchRoomModal.roomPass.trim(),
        dispatched_by: account?.username || "Staff Moderator",
        dispatched_at: new Date().toISOString(),
      })
    );

    // Update match status to ongoing
    const updated = tournaments.map((t) =>
      t.id === dispatchRoomModal.id ? { ...t, status: "ongoing" } : t
    );
    setTournaments(updated);
    localStorage.setItem("dark_esports_tournaments_v1", JSON.stringify(updated));

    // Create automated push notification to players
    createBroadcast({
      title: `🔑 Room ID Dispatched: ${dispatchRoomModal.title}`,
      message: `Room ID: ${dispatchRoomModal.roomId.trim()} | Pass: ${dispatchRoomModal.roomPass.trim()}. Join custom room in Free Fire immediately!`,
      type: "tournament",
      sender: "Staff Referee Desk",
      senderRole: "staff",
      pinned: true,
      actorId: user?.id,
    });

    void logAuditEvent({
      actorId: user?.id || "staff-id",
      actorName: account?.username || "Staff Referee",
      actorRole: "staff",
      action: "ROOM_CREDENTIALS_DISPATCHED",
      entityType: "tournament",
      entityId: dispatchRoomModal.id,
      details: `Dispatched Room ID [${dispatchRoomModal.roomId}] for match "${dispatchRoomModal.title}".`,
      severity: "info",
    });

    toast.success("Room ID & Password dispatched to all joined players! 🎮");
    setDispatchRoomModal(null);
    setBroadcasts(getBroadcasts());
  };

  // DECLARE WINNER & COMPLETE MATCH
  const handleDeclareWinner = () => {
    if (!winnerModal || !winnerModal.winnerIgn.trim()) {
      toast.error("Please enter winner In-Game Name (IGN)");
      return;
    }

    const updated = tournaments.map((t) =>
      t.id === winnerModal.tourId ? { ...t, status: "completed" } : t
    );
    setTournaments(updated);
    localStorage.setItem("dark_esports_tournaments_v1", JSON.stringify(updated));

    createBroadcast({
      title: `🏆 Winner Declared: ${winnerModal.title}`,
      message: `Booyah claimed by ${winnerModal.winnerIgn} with ${winnerModal.kills} Kills! Prize credits have been dispatched.`,
      type: "tournament",
      sender: "Staff Referee Desk",
      senderRole: "staff",
      pinned: false,
      actorId: user?.id,
    });

    void logAuditEvent({
      actorId: user?.id || "staff",
      actorName: account?.username || "Staff",
      actorRole: "staff",
      action: "MATCH_RESULT_DECLARED",
      entityType: "tournament",
      entityId: winnerModal.tourId,
      details: `Match completed. Winner: ${winnerModal.winnerIgn} (${winnerModal.kills} kills).`,
      severity: "info",
    });

    toast.success("Match results submitted & published! 🏆");
    setWinnerModal(null);
    setBroadcasts(getBroadcasts());
  };

  // STAFF BROADCAST DISPATCH
  const handleSendStaffBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffBroadcast.title.trim() || !staffBroadcast.message.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    createBroadcast({
      title: staffBroadcast.title.trim(),
      message: staffBroadcast.message.trim(),
      type: "tournament",
      sender: "Staff Moderator",
      senderRole: "staff",
      pinned: staffBroadcast.pinned,
      actorId: user?.id,
    });

    setBroadcasts(getBroadcasts());
    setStaffBroadcast({ title: "", message: "", pinned: false });
    toast.success("Match reminder broadcast published to all players!");
  };

  // RESOLVE DISPUTE
  const handleResolveDispute = (id: string) => {
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "resolved" } : d))
    );
    toast.success("Dispute ticket marked as Resolved");
  };

  // 1. LIGHT-THEME STAFF GATE (NOT DARK)
  if (!isStaffOrOwner) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-300 bg-white p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-wider text-slate-900 uppercase">
                  STAFF OPERATIONS GATE
                </h1>
                <p className="text-xs font-semibold text-slate-500">Referee & Match Coordinator Portal</p>
              </div>
            </div>
            <Link
              to="/"
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>

          <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs text-cyan-900 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase text-cyan-800">
              <Lock className="h-4 w-4" /> Moderator Passcode Required
            </div>
            <p className="text-xs text-cyan-800/90">
              Staff operations are restricted to tournament coordinators. Enter the Staff passcode provided by the Owner.
            </p>
          </div>

          <form onSubmit={handlePasscodeUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff Authorization Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter Staff Passcode"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-600 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                  autoFocus
                />
                <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 font-extrabold uppercase tracking-wider text-white shadow-md hover:from-cyan-700 hover:to-blue-700 transition-all"
            >
              {isVerifying ? "Verifying..." : "Unlock Staff Operations Deck"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500 font-medium">
            <span>DARK ESPORTS • STAFF v2.0</span>
            <Link to="/" className="text-cyan-700 font-bold hover:underline">
              ← Back to Gamer Lobby
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL EXPANSIVE LIGHT-THEMED STAFF OPERATIONS DECK (NOT DARK)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-wider text-slate-900 uppercase">
                  STAFF OPERATIONS DECK
                </h1>
                <span className="rounded-full bg-cyan-100 border border-cyan-300 px-2.5 py-0.5 text-[10px] font-black uppercase text-cyan-800">
                  🛡️ STAFF REFEREE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Match Coordination • Custom Room Dispatch • Anti-Cheat Verification • Player Support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Gamer Lobby
            </Link>
            <button
              onClick={() => {
                updateAccount({ role: "player" });
                navigate({ to: "/" });
                toast.info("Staff Session Locked.");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Lock className="h-4 w-4" /> Lock Desk
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-4">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2 no-scrollbar">
          {[
            { id: "matches", label: "🎮 Match Control & Rooms", count: tournaments.length },
            { id: "roster", label: "👥 Player Rosters & IGNs", count: userList.length },
            { id: "broadcasts", label: "📢 Match Alerts", count: broadcasts.length },
            { id: "disputes", label: "🎫 Disputes Desk", count: disputes.length },
            { id: "logs", label: "📋 Referee Log", count: auditLogs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-cyan-600 text-white shadow-sm font-black"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === tab.id ? "bg-white/30 text-white font-bold" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 md:p-6 space-y-6">
        {/* TAB 1: MATCH CONTROL & ROOM DISPATCH */}
        {activeTab === "matches" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50/60 p-5 shadow-sm">
              <h2 className="text-base font-extrabold uppercase text-cyan-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-cyan-700" /> Active Tournaments & Room Operations
              </h2>
              <p className="text-xs text-cyan-800/90 mt-1">
                Match start hone se 15 minute pehle Custom Room ID aur Password generate karke dispatch karein. Room credentials automatic tareeqe se joined players ke app me reveal ho jayenge.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 font-mono">
                        {t.map} • {t.match_type}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{t.title}</h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        t.status === "upcoming"
                          ? "bg-blue-100 text-blue-700"
                          : t.status === "ongoing"
                          ? "bg-green-100 text-green-700 font-black animate-pulse"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                      <div className="text-[10px] text-slate-500">ENTRY FEE</div>
                      <div className="font-bold text-amber-600">{inr(t.entry_fee)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                      <div className="text-[10px] text-slate-500">PRIZE POOL</div>
                      <div className="font-bold text-green-600">{inr(t.prize_pool)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                      <div className="text-[10px] text-slate-500">PER KILL</div>
                      <div className="font-bold text-slate-800">{inr(t.per_kill)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                      <div className="text-[10px] text-slate-500">SLOTS</div>
                      <div className="font-bold text-cyan-700">
                        {t.filled_slots}/{t.total_slots}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 gap-2">
                    <Button
                      onClick={() =>
                        setDispatchRoomModal({
                          id: t.id,
                          title: t.title,
                          roomId: "",
                          roomPass: "",
                        })
                      }
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold uppercase text-xs h-9 px-3.5 shadow-xs"
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1" /> Dispatch Room ID
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setWinnerModal({
                          tourId: t.id,
                          title: t.title,
                          winnerIgn: "",
                          kills: 5,
                        })
                      }
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-9 px-3.5 font-semibold"
                    >
                      Declare Winner
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PLAYER ROSTER & ANTI-CHEAT VERIFICATION */}
        {activeTab === "roster" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Gamer Roster Verification ({userList.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Verify Free Fire In-Game Name (IGN) and Player UID before match launch
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-2.5">Player</th>
                      <th className="py-2.5">FF In-Game Name</th>
                      <th className="py-2.5">FF UID</th>
                      <th className="py-2.5">Matches / Kills</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {u.avatar} {u.username}
                        </td>
                        <td className="py-3 font-mono text-cyan-700 font-bold">{u.ff_ign || "N/A"}</td>
                        <td className="py-3 font-mono text-slate-600">{u.ff_uid || "N/A"}</td>
                        <td className="py-3 text-slate-600">
                          {u.matches_played} matches • {u.total_kills} kills
                        </td>
                        <td className="py-3">
                          {u.isBanned ? (
                            <span className="rounded bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="rounded bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">
                              VERIFIED FAIR PLAY
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              void logAuditEvent({
                                actorId: user?.id || "staff",
                                actorName: account?.username || "Staff Referee",
                                actorRole: "staff",
                                action: "PLAYER_FLAGGED_REVIEW",
                                entityType: "user",
                                entityId: u.id,
                                details: `Player ${u.username} (${u.ff_ign}) flagged for owner inspection.`,
                                severity: "warning",
                              });
                              toast.info(`Flagged ${u.username} for owner review`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                          >
                            <Flag className="h-3 w-3" /> Flag Suspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF MATCH BROADCASTS */}
        {activeTab === "broadcasts" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Radio className="h-4 w-4 text-cyan-600" /> Send Match Announcement / Reminder
              </h3>
              <form onSubmit={handleSendStaffBroadcast} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🚨 Room #101 Starting in 10 Minutes! Join Immediately"
                    value={staffBroadcast.title}
                    onChange={(e) => setStaffBroadcast({ ...staffBroadcast, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-cyan-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Message Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide room instructions, anti-teaming warnings, or map details..."
                    value={staffBroadcast.message}
                    onChange={(e) => setStaffBroadcast({ ...staffBroadcast, message: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-cyan-600 focus:bg-white"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffBroadcast.pinned}
                      onChange={(e) => setStaffBroadcast({ ...staffBroadcast, pinned: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
                    />
                    <span>Pin to Home Ticker Bar</span>
                  </label>
                  <Button
                    type="submit"
                    className="h-10 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold uppercase text-xs shadow-xs"
                  >
                    Send to Gamers
                  </Button>
                </div>
              </form>
            </div>

            {/* Broadcasts History */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Active Broadcasts ({broadcasts.length})
              </h3>
              <div className="space-y-2.5">
                {broadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{b.title}</span>
                        {b.pinned && (
                          <span className="rounded bg-yellow-100 text-yellow-800 px-1.5 py-0.2 text-[9px] font-bold">
                            PINNED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{b.message}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{fmtDate(b.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DISPUTES DESK */}
        {activeTab === "disputes" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Match Disputes & Player Queries ({disputes.length})
                </h3>
                <p className="text-xs text-slate-500">Resolve room ID delays or fair play disputes</p>
              </div>

              <div className="space-y-3">
                {disputes.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{d.player}</span>
                        <span className="text-xs text-slate-500 font-mono">({d.phone})</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                            d.status === "open"
                              ? "bg-red-100 text-red-700"
                              : d.status === "in_review"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <div className="text-xs text-cyan-700 font-bold">{d.match}</div>
                      <p className="text-xs text-slate-600">{d.issue}</p>
                      <div className="text-[10px] text-slate-400 font-mono">{fmtDate(d.time)}</div>
                    </div>
                    {d.status !== "resolved" && (
                      <button
                        onClick={() => handleResolveDispute(d.id)}
                        className="rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 shrink-0 self-start md:self-center shadow-xs"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: REFEREE LOGS */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Referee Action Log ({auditLogs.length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-cyan-800">[{log.action}]</span>
                      <span>{fmtDate(log.timestamp)}</span>
                    </div>
                    <div className="text-slate-800 font-sans">{log.details}</div>
                    <div className="text-[10px] text-slate-400">
                      Operator: {log.actorName} ({log.actorRole})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: DISPATCH ROOM ID */}
      {dispatchRoomModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setDispatchRoomModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-cyan-600" /> Dispatch Room Credentials
              </h3>
              <button onClick={() => setDispatchRoomModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 font-semibold">{dispatchRoomModal.title}</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Custom Room ID</label>
                <input
                  type="text"
                  placeholder="e.g. 5421980"
                  value={dispatchRoomModal.roomId}
                  onChange={(e) =>
                    setDispatchRoomModal({ ...dispatchRoomModal, roomId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 font-mono text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Room Password</label>
                <input
                  type="text"
                  placeholder="e.g. 1234"
                  value={dispatchRoomModal.roomPass}
                  onChange={(e) =>
                    setDispatchRoomModal({ ...dispatchRoomModal, roomPass: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 font-mono text-sm"
                />
              </div>
              <Button
                onClick={handleSaveAndDispatchRoom}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold uppercase"
              >
                Dispatch to Players
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT WINNER */}
      {winnerModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setWinnerModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Submit Match Winner</h3>
              <button onClick={() => setWinnerModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 font-semibold">{winnerModal.title}</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Winner In-Game Name (IGN)</label>
                <input
                  type="text"
                  placeholder="e.g. DARK KING"
                  value={winnerModal.winnerIgn}
                  onChange={(e) => setWinnerModal({ ...winnerModal, winnerIgn: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 font-bold"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Total Kills Recorded</label>
                <input
                  type="number"
                  value={winnerModal.kills}
                  onChange={(e) => setWinnerModal({ ...winnerModal, kills: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 font-bold"
                />
              </div>
              <Button
                onClick={handleDeclareWinner}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase"
              >
                Publish Results & Close Match
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
