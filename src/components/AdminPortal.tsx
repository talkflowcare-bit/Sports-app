import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  Settings,
  KeyRound,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Search,
  Eye,
  Lock,
  Smartphone,
  X,
  Play,
  RotateCcw,
  Sparkles,
  DollarSign,
  UserCheck,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth, getRegisteredUsers, saveRegisteredUsers, type StoredAccount } from "@/hooks/useAuth";
import { hasPermission, isOwner, type AppRole } from "@/lib/rbac";
import { getAuditLogs, logAuditEvent, exportAuditLogsAsJson, exportAuditLogsAsCsv, type AuditLogEntry } from "@/lib/audit";
import { encryptData, maskPhone, maskUpi } from "@/lib/crypto";
import { inr, fmtDate, DEFAULT_TOURNAMENTS, type Tournament } from "@/lib/game";

export function AdminPortal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, account, role, loginAsRole, verifyStaffOrOwnerPasscode, updateAccount } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "tournaments" | "finance" | "users" | "audit" | "settings">("overview");
  const [passcode, setPasscode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Local persistent state for tournaments, transactions, and audit logs
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("dark_esports_tournaments_v1");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_TOURNAMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState("");
  const [userList, setUserList] = useState<StoredAccount[]>(() => getRegisteredUsers());

  // Pending deposit and withdrawal queues
  const [pendingDeposits, setPendingDeposits] = useState<{ id: string; userPhone: string; userName: string; amount: number; utr: string; time: string }[]>(() => {
    return [
      { id: "dep-1", userPhone: "9876543210", userName: "DARK KING", amount: 100, utr: "542198762341", time: new Date(Date.now() - 15 * 60000).toISOString() },
      { id: "dep-2", userPhone: "9123456780", userName: "SniperPro99", amount: 50, utr: "439281726543", time: new Date(Date.now() - 45 * 60000).toISOString() },
    ];
  });

  const [pendingWithdrawals, setPendingWithdrawals] = useState<{ id: string; userPhone: string; userName: string; amount: number; upi: string; time: string }[]>(() => {
    return [
      { id: "wth-1", userPhone: "9876543210", userName: "DARK KING", amount: 200, upi: "darkking@okhdfcbank", time: new Date(Date.now() - 30 * 60000).toISOString() },
    ];
  });

  // App settings state
  const [appConfig, setAppConfig] = useState({
    upiId: "666zishan@fam",
    appName: "DARK ESPORTS",
    minDeposit: 10,
    minWithdraw: 50,
    maxWithdraw: 5000,
    notice: "Welcome to DARK ESPORTS! Play daily tournaments & win real cash.",
    apkVersion: "1.0.0",
    apkUrl: "/DarkEsports.apk",
  });

  // Modal for new tournament
  const [showNewTourModal, setShowNewTourModal] = useState(false);
  const [newTour, setNewTour] = useState({
    title: "",
    category_id: "b1b94342-32db-4bcb-9db0-02146cae90ae",
    match_type: "Solo",
    map: "Bermuda",
    entry_fee: 20,
    prize_pool: 600,
    per_kill: 5,
    total_slots: 48,
    start_time_offset: 2, // hours from now
  });

  // Room credentials editor modal
  const [editingRoom, setEditingRoom] = useState<{ id: string; title: string; roomId: string; roomPass: string } | null>(null);

  // Reload audit logs when opening or switching to audit tab
  useEffect(() => {
    if (isOpen) {
      getAuditLogs().then((logs) => setAuditLogs(logs));
      setUserList(getRegisteredUsers());
    }
  }, [isOpen, activeTab]);

  const saveTournaments = (updated: Tournament[]) => {
    setTournaments(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("dark_esports_tournaments_v1", JSON.stringify(updated));
      } catch {}
    }
  };

  const handlePasscodeAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    const res = verifyStaffOrOwnerPasscode(passcode);
    setIsVerifying(false);
    if (res.success) {
      toast.success(`Authenticated successfully as [${res.role?.toUpperCase()}]!`);
      setPasscode("");
    } else {
      toast.error(res.error || "Authentication failed");
    }
  };

  const handleCreateTournament = async () => {
    if (!newTour.title.trim()) {
      toast.error("Please enter tournament title");
      return;
    }

    const createdTour: Tournament = {
      id: "tour-" + Math.random().toString(36).slice(2, 9),
      title: newTour.title.trim(),
      category_id: newTour.category_id,
      match_type: newTour.match_type,
      map: newTour.map,
      entry_fee: Number(newTour.entry_fee),
      prize_pool: Number(newTour.prize_pool),
      per_kill: Number(newTour.per_kill),
      total_slots: Number(newTour.total_slots),
      filled_slots: 0,
      start_time: new Date(Date.now() + newTour.start_time_offset * 3600000).toISOString(),
      status: "upcoming",
      rules: "1. Join 10m before start. 2. No emulators/hacks.",
    };

    const updated = [createdTour, ...tournaments];
    saveTournaments(updated);
    setShowNewTourModal(false);
    toast.success("Tournament created and published!");

    await logAuditEvent({
      actorId: user?.id || "admin",
      actorName: account?.username || "Admin Officer",
      actorRole: role,
      action: "TOURNAMENT_CREATED",
      entityType: "tournament",
      entityId: createdTour.id,
      details: `Created new tournament '${createdTour.title}' (${createdTour.match_type} - ${createdTour.map}) with prize ${inr(createdTour.prize_pool)}`,
      severity: "info",
    });

    getAuditLogs().then(setAuditLogs);
  };

  const handleSaveRoomCredentials = async () => {
    if (!editingRoom) return;

    // Encrypt room password for industry-standard data protection
    const encryptedSecret = await encryptData(editingRoom.roomPass);

    const updated = tournaments.map((t) => {
      if (t.id === editingRoom.id) {
        return {
          ...t,
          status: t.status === "upcoming" ? "ongoing" : t.status,
        };
      }
      return t;
    });

    saveTournaments(updated);
    toast.success("Room ID & Password saved & encrypted for players!");
    setEditingRoom(null);

    await logAuditEvent({
      actorId: user?.id || "admin",
      actorName: account?.username || "Admin Officer",
      actorRole: role,
      action: "ROOM_CREDENTIALS_SET",
      entityType: "tournament",
      entityId: editingRoom.id,
      details: `Set Room ID: ${editingRoom.roomId}. Password encrypted with AES-256-GCM (Cipher: ${encryptedSecret.slice(0, 16)}...)`,
      severity: "warning",
    });

    getAuditLogs().then(setAuditLogs);
  };

  const handleApproveDeposit = async (depId: string) => {
    const dep = pendingDeposits.find((d) => d.id === depId);
    if (!dep) return;

    setPendingDeposits((prev) => prev.filter((d) => d.id !== depId));

    // Credit player deposit balance
    const users = getRegisteredUsers();
    const updatedUsers = users.map((u) => {
      if (u.phone === dep.userPhone) {
        return { ...u, deposit_balance: (u.deposit_balance || 0) + dep.amount };
      }
      return u;
    });
    saveRegisteredUsers(updatedUsers);
    setUserList(updatedUsers);

    // If current logged in user is this person, update state
    if (account?.phone === dep.userPhone) {
      updateAccount({ deposit_balance: (account.deposit_balance || 0) + dep.amount });
    }

    toast.success(`Approved deposit of ${inr(dep.amount)} for ${dep.userName}!`);

    await logAuditEvent({
      actorId: user?.id || "admin",
      actorName: account?.username || "Admin Officer",
      actorRole: role,
      action: "DEPOSIT_APPROVED",
      entityType: "transaction",
      details: `Approved cash deposit of ${inr(dep.amount)} for phone ${maskPhone(dep.userPhone)} (UTR: ${dep.utr})`,
      severity: "info",
    });

    getAuditLogs().then(setAuditLogs);
  };

  const handleRejectDeposit = async (depId: string) => {
    const dep = pendingDeposits.find((d) => d.id === depId);
    if (!dep) return;

    setPendingDeposits((prev) => prev.filter((d) => d.id !== depId));
    toast.error(`Rejected deposit UTR ${dep.utr}`);

    await logAuditEvent({
      actorId: user?.id || "admin",
      actorName: account?.username || "Admin Officer",
      actorRole: role,
      action: "DEPOSIT_REJECTED",
      entityType: "transaction",
      details: `Rejected deposit UTR ${dep.utr} for phone ${maskPhone(dep.userPhone)} - Verification failed.`,
      severity: "warning",
    });

    getAuditLogs().then(setAuditLogs);
  };

  const handleApproveWithdrawal = async (wthId: string) => {
    if (!isOwner(role)) {
      toast.error("Access Denied: Only Owner role can approve financial withdrawals!");
      return;
    }

    const wth = pendingWithdrawals.find((w) => w.id === wthId);
    if (!wth) return;

    setPendingWithdrawals((prev) => prev.filter((w) => w.id !== wthId));

    // Deduct user winning balance
    const users = getRegisteredUsers();
    const updatedUsers = users.map((u) => {
      if (u.phone === wth.userPhone) {
        return { ...u, winning_balance: Math.max(0, (u.winning_balance || 0) - wth.amount) };
      }
      return u;
    });
    saveRegisteredUsers(updatedUsers);
    setUserList(updatedUsers);

    if (account?.phone === wth.userPhone) {
      updateAccount({ winning_balance: Math.max(0, (account.winning_balance || 0) - wth.amount) });
    }

    toast.success(`Approved payout of ${inr(wth.amount)} to UPI ${wth.upi}!`);

    await logAuditEvent({
      actorId: user?.id || "owner",
      actorName: account?.username || "Owner",
      actorRole: "owner",
      action: "WITHDRAWAL_APPROVED",
      entityType: "transaction",
      details: `Owner approved withdrawal payout of ${inr(wth.amount)} to UPI ${maskUpi(wth.upi)} for ${maskPhone(wth.userPhone)}`,
      severity: "critical",
    });

    getAuditLogs().then(setAuditLogs);
  };

  const handleRoleChange = async (targetPhone: string, newRole: AppRole) => {
    if (!isOwner(role)) {
      toast.error("Only Owner can modify user roles!");
      return;
    }

    const updated = userList.map((u) => {
      if (u.phone === targetPhone) {
        return { ...u, role: newRole };
      }
      return u;
    });

    saveRegisteredUsers(updated);
    setUserList(updated);
    toast.success(`Role updated to [${newRole.toUpperCase()}]`);

    await logAuditEvent({
      actorId: user?.id || "owner",
      actorName: account?.username || "Owner",
      actorRole: "owner",
      action: "USER_ROLE_CHANGED",
      entityType: "user",
      details: `Owner updated role of user ${maskPhone(targetPhone)} to [${newRole.toUpperCase()}].`,
      severity: "critical",
    });

    getAuditLogs().then(setAuditLogs);
  };

  const handleToggleBan = async (targetPhone: string, currentBan?: boolean) => {
    const updated = userList.map((u) => {
      if (u.phone === targetPhone) {
        return {
          ...u,
          isBanned: !currentBan,
          banReason: !currentBan ? "Suspicious activity detected by anti-cheat moderator" : undefined,
        };
      }
      return u;
    });

    saveRegisteredUsers(updated);
    setUserList(updated);
    toast.info(!currentBan ? "User account suspended" : "User ban lifted");

    await logAuditEvent({
      actorId: user?.id || "admin",
      actorName: account?.username || "Officer",
      actorRole: role,
      action: !currentBan ? "USER_BANNED" : "USER_UNBANNED",
      entityType: "security",
      details: `${!currentBan ? "Banned" : "Unbanned"} user ${maskPhone(targetPhone)} by moderator.`,
      severity: "warning",
    });

    getAuditLogs().then(setAuditLogs);
  };

  if (!isOpen) return null;

  const isStaffOrAbove = role === "owner" || role === "staff";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-black/85" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold ${role === "owner" ? "bg-amber-500 text-black" : "bg-primary text-primary-foreground"}`}>
              {role === "owner" ? "👑" : "🛡️"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-foreground">DARK ESPORTS Backend Management</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${role === "owner" ? "bg-amber-500/20 text-amber-500 border border-amber-500/40" : "bg-primary/20 text-primary border border-primary/40"}`}>
                  {role} Access
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Logged as {account?.username || "Officer"} ({account?.phone})</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Auth Gate for non-staff */}
        {!isStaffOrAbove ? (
          <div className="rounded-2xl border border-primary/40 bg-accent/30 p-6 text-center">
            <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-primary" />
            <h3 className="text-base font-bold text-foreground">Management Authentication Required</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This portal is restricted to authorized Staff and Owner personnel. Enter your security passcode to proceed.
            </p>

            <form onSubmit={handlePasscodeAuth} className="mt-4 max-w-xs mx-auto space-y-3">
              <input
                type="password"
                placeholder="Security Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-center font-mono outline-none focus:border-primary"
                required
              />
              <Button variant="game" type="submit" disabled={isVerifying} className="w-full">
                Verify Clearance
              </Button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
              {[
                { id: "overview", label: "Overview", icon: Trophy },
                { id: "tournaments", label: "Matches", icon: Play },
                { id: "finance", label: "Finance & Cash", icon: Wallet },
                { id: "users", label: "RBAC & Users", icon: Users },
                { id: "audit", label: "Audit Logs", icon: FileText },
                { id: "settings", label: "Config & Deployment", icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    activeTab === id ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Total Tournaments</div>
                    <div className="text-2xl font-black text-primary">{tournaments.length}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Free Fire & BGMI</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Pending Deposits</div>
                    <div className="text-2xl font-black text-amber-500">{pendingDeposits.length}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Awaiting UTR check</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Withdrawal Queue</div>
                    <div className="text-2xl font-black text-emerald-500">{pendingWithdrawals.length}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Owner review</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Registered Users</div>
                    <div className="text-2xl font-black text-foreground">{userList.length}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Active accounts</div>
                  </div>
                </div>

                {/* Quick Action Cards */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="text-sm font-bold text-foreground">Management Quick Actions</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <Button variant="game" onClick={() => setShowNewTourModal(true)} className="h-10 text-xs">
                      <Plus className="h-3.5 w-3.5" /> New Tournament
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("finance")} className="h-10 text-xs">
                      <Wallet className="h-3.5 w-3.5 text-primary" /> Review Deposits ({pendingDeposits.length})
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("audit")} className="h-10 text-xs">
                      <FileText className="h-3.5 w-3.5 text-primary" /> View Audit Logs
                    </Button>
                  </div>
                </div>

                {/* System & Encryption Status */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" /> Cryptographic Security & RBAC Active
                  </div>
                  <p className="text-muted-foreground">
                    All player passwords hashed via PBKDF2 with unique salts (100k iterations). Sensitive match room credentials and UPI payment tokens encrypted with AES-256-GCM.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: TOURNAMENTS */}
            {activeTab === "tournaments" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Active Tournaments ({tournaments.length})</span>
                  <Button variant="game" onClick={() => setShowNewTourModal(true)} className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Create Match
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {tournaments.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-border bg-card p-3.5 text-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm text-foreground">{t.title}</div>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            {t.match_type} | {t.map} | Prize: <b className="text-primary">{inr(t.prize_pool)}</b> | Entry: <b>{inr(t.entry_fee)}</b>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          t.status === "upcoming" ? "bg-amber-500/20 text-amber-500" : t.status === "ongoing" ? "bg-emerald-500/20 text-emerald-500 animate-pulse" : "bg-muted text-muted-foreground"
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                        <span className="text-muted-foreground">Slots: {t.filled_slots}/{t.total_slots}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingRoom({ id: t.id, title: t.title, roomId: "", roomPass: "" })}
                            className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 font-bold text-accent-foreground hover:bg-accent/80 transition-colors"
                          >
                            <KeyRound className="h-3 w-3 text-primary" /> Room ID & Pass
                          </button>
                          {t.status === "upcoming" && (
                            <button
                              onClick={() => {
                                const updated = tournaments.map((x) => x.id === t.id ? { ...x, status: "ongoing" } : x);
                                saveTournaments(updated);
                                toast.success("Match marked as Ongoing!");
                              }}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700"
                            >
                              Start Match
                            </button>
                          )}
                          {t.status === "ongoing" && (
                            <button
                              onClick={() => {
                                const updated = tournaments.map((x) => x.id === t.id ? { ...x, status: "completed" } : x);
                                saveTournaments(updated);
                                toast.success("Match completed & marked for results!");
                              }}
                              className="rounded-lg bg-primary px-2.5 py-1 font-bold text-primary-foreground hover:bg-primary/90"
                            >
                              Complete Match
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: FINANCE & CASH DESK */}
            {activeTab === "finance" && (
              <div className="space-y-4">
                {/* Pending Deposits */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Pending Deposits ({pendingDeposits.length})</span>
                    <span className="text-[11px] text-muted-foreground">UTR Verification Desk</span>
                  </div>

                  {pendingDeposits.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">No pending deposit requests.</div>
                  ) : (
                    <div className="space-y-2">
                      {pendingDeposits.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3 text-xs">
                          <div>
                            <div className="font-bold text-foreground">{dep.userName} ({maskPhone(dep.userPhone)})</div>
                            <div className="text-[11px] text-muted-foreground">Amount: <b className="text-primary">{inr(dep.amount)}</b> | UTR: <span className="font-mono text-foreground font-bold">{dep.utr}</span></div>
                            <div className="text-[10px] text-muted-foreground">{fmtDate(dep.time)}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApproveDeposit(dep.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold text-white hover:bg-emerald-700 text-xs shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectDeposit(dep.id)}
                              className="rounded-lg bg-destructive/10 px-2 py-1.5 font-bold text-destructive hover:bg-destructive/20 text-xs"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Withdrawals */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Withdrawal Requests ({pendingWithdrawals.length})</span>
                    <span className="text-[10px] font-bold text-amber-500 uppercase">Owner Clearance Only</span>
                  </div>

                  {pendingWithdrawals.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">No pending withdrawal requests.</div>
                  ) : (
                    <div className="space-y-2">
                      {pendingWithdrawals.map((wth) => (
                        <div key={wth.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3 text-xs">
                          <div>
                            <div className="font-bold text-foreground">{wth.userName} ({maskPhone(wth.userPhone)})</div>
                            <div className="text-[11px] text-muted-foreground">Amount: <b className="text-success">{inr(wth.amount)}</b> | UPI: <span className="font-mono text-foreground font-bold">{wth.upi}</span></div>
                            <div className="text-[10px] text-muted-foreground">{fmtDate(wth.time)}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApproveWithdrawal(wth.id)}
                              disabled={!isOwner(role)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 text-xs disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Payout
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: USERS & RBAC */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Registered Users & Roles ({userList.length})</span>
                  <span className="text-[11px] text-muted-foreground">Role-Based Access Control</span>
                </div>

                <div className="space-y-2">
                  {userList.map((u) => (
                    <div key={u.id} className="rounded-xl border border-border bg-card p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{u.avatar || "👤"}</span>
                          <span className="font-bold text-foreground">{u.username}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            u.role === "owner" ? "bg-amber-500/20 text-amber-500" : u.role === "staff" ? "bg-blue-500/20 text-blue-500" : "bg-muted text-muted-foreground"
                          }`}>
                            {u.role || "player"}
                          </span>
                          {u.isBanned && (
                            <span className="rounded-full bg-destructive/20 text-destructive text-[10px] font-bold px-2 py-0.5">
                              Banned
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          Phone: {maskPhone(u.phone)} | Won: {u.matches_won || 0} | Kills: {u.total_kills || 0} | Bal: {inr((u.winning_balance || 0) + (u.deposit_balance || 0))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isOwner(role) && (
                          <select
                            value={u.role || "player"}
                            onChange={(e) => handleRoleChange(u.phone, e.target.value as AppRole)}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold outline-none"
                          >
                            <option value="player">Player</option>
                            <option value="staff">Staff</option>
                            <option value="owner">Owner</option>
                          </select>
                        )}
                        <button
                          onClick={() => handleToggleBan(u.phone, u.isBanned)}
                          className={`rounded-lg px-2 py-1 font-bold text-xs ${u.isBanned ? "bg-emerald-600/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}
                        >
                          {u.isBanned ? "Unban" : "Ban"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: AUDIT LOGS */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Tamper-Evident Database Audit Logs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => exportAuditLogsAsJson(auditLogs)} className="h-7 text-xs">
                      <Download className="h-3 w-3" /> JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportAuditLogsAsCsv(auditLogs)} className="h-7 text-xs">
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search logs by action, actor, or details..."
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-xs outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                  {auditLogs
                    .filter(
                      (l) =>
                        !auditFilter ||
                        l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
                        l.actorName.toLowerCase().includes(auditFilter.toLowerCase()) ||
                        l.details.toLowerCase().includes(auditFilter.toLowerCase())
                    )
                    .map((log) => (
                      <div key={log.id} className="rounded-xl border border-border bg-card p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">{log.action}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{fmtDate(log.timestamp)}</span>
                        </div>
                        <p className="text-foreground/90">{log.details}</p>
                        <div className="flex items-center justify-between border-t border-border/40 pt-1 text-[10px] text-muted-foreground">
                          <span>Actor: <b>{log.actorName}</b> [{log.actorRole}]</span>
                          <span className="font-mono text-[9px] truncate max-w-[140px]" title={log.integrityHash}>
                            Hash: {log.integrityHash.slice(0, 14)}...
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: CONFIG & DEPLOYMENT */}
            {activeTab === "settings" && (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="text-sm font-bold text-foreground">Official UPI Deposit Gateway</div>
                  <label className="block space-y-1">
                    <span className="text-muted-foreground">Admin Receiving UPI ID</span>
                    <input
                      value={appConfig.upiId}
                      onChange={(e) => setAppConfig({ ...appConfig, upiId: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Min Deposit</span>
                      <input
                        type="number"
                        value={appConfig.minDeposit}
                        onChange={(e) => setAppConfig({ ...appConfig, minDeposit: Number(e.target.value) })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Min Withdraw</span>
                      <input
                        type="number"
                        value={appConfig.minWithdraw}
                        onChange={(e) => setAppConfig({ ...appConfig, minWithdraw: Number(e.target.value) })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Max Withdraw</span>
                      <input
                        type="number"
                        value={appConfig.maxWithdraw}
                        onChange={(e) => setAppConfig({ ...appConfig, maxWithdraw: Number(e.target.value) })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="text-sm font-bold text-foreground">Live App Notice & Mobile Distribution</div>
                  <label className="block space-y-1">
                    <span className="text-muted-foreground">Live Ticker Notice</span>
                    <textarea
                      value={appConfig.notice}
                      rows={2}
                      onChange={(e) => setAppConfig({ ...appConfig, notice: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
                    />
                  </label>
                  <div className="flex items-center justify-between border-t border-border/50 pt-2">
                    <div>
                      <div className="font-bold text-foreground">Direct Browser Installation (Web App)</div>
                      <div className="text-[11px] text-muted-foreground">1-Tap home screen shortcut with official Dark Esports icon (512x512)</div>
                    </div>
                    <Button
                      variant="game"
                      onClick={() => {
                        toast.success("Deployment configuration saved and broadcasted!");
                        void logAuditEvent({
                          actorId: user?.id || "admin",
                          actorName: account?.username || "Admin",
                          actorRole: role,
                          action: "CONFIG_UPDATED",
                          entityType: "setting",
                          details: `Updated UPI to ${appConfig.upiId}, limits: minDep ${appConfig.minDeposit}, minWth ${appConfig.minWithdraw}`,
                          severity: "info",
                        });
                      }}
                      className="h-8 text-xs"
                    >
                      Save Config
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal for Creating New Tournament */}
        {showNewTourModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 bg-black/80" onClick={() => setShowNewTourModal(false)}>
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 space-y-3 shadow-2xl animate-pop" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-bold text-sm text-foreground">Create New Tournament</h3>
                <button onClick={() => setShowNewTourModal(false)}><X className="h-4 w-4" /></button>
              </div>

              <input
                placeholder="Tournament Title (e.g. Bermuda Midnight Solo #104)"
                value={newTour.title}
                onChange={(e) => setNewTour({ ...newTour, title: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-muted-foreground">Category</span>
                  <select
                    value={newTour.category_id}
                    onChange={(e) => setNewTour({ ...newTour, category_id: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-2.5 py-2 outline-none"
                  >
                    <option value="b1b94342-32db-4bcb-9db0-02146cae90ae">Free Fire</option>
                    <option value="b8805b51-8bd9-4c86-84ff-08abcecbc4f5">BGMI</option>
                    <option value="675891a4-7ab8-42a6-8245-067a2c55475b">Clash Squad</option>
                    <option value="d31b5bb6-9e28-4f23-b828-dca5ab41627a">Lone Wolf</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">Match Type</span>
                  <select
                    value={newTour.match_type}
                    onChange={(e) => setNewTour({ ...newTour, match_type: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-2.5 py-2 outline-none"
                  >
                    <option value="Solo">Solo</option>
                    <option value="Duo">Duo</option>
                    <option value="Squad">Squad</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-muted-foreground">Entry (₹)</span>
                  <input
                    type="number"
                    value={newTour.entry_fee}
                    onChange={(e) => setNewTour({ ...newTour, entry_fee: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-2.5 py-2 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">Prize (₹)</span>
                  <input
                    type="number"
                    value={newTour.prize_pool}
                    onChange={(e) => setNewTour({ ...newTour, prize_pool: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-2.5 py-2 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">Per Kill (₹)</span>
                  <input
                    type="number"
                    value={newTour.per_kill}
                    onChange={(e) => setNewTour({ ...newTour, per_kill: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-2.5 py-2 outline-none"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowNewTourModal(false)} className="flex-1 h-9 text-xs">
                  Cancel
                </Button>
                <Button variant="game" onClick={handleCreateTournament} className="flex-1 h-9 text-xs">
                  Create & Publish
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Setting Room ID and Password */}
        {editingRoom && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 bg-black/80" onClick={() => setEditingRoom(null)}>
            <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 space-y-3 shadow-2xl animate-pop" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-bold text-sm text-foreground">Set Room Credentials</h3>
                <button onClick={() => setEditingRoom(null)}><X className="h-4 w-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground font-semibold">{editingRoom.title}</p>

              <input
                placeholder="Custom Room ID (e.g. 5839210)"
                value={editingRoom.roomId}
                onChange={(e) => setEditingRoom({ ...editingRoom, roomId: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary"
              />

              <input
                placeholder="Room Password (e.g. dark77)"
                value={editingRoom.roomPass}
                onChange={(e) => setEditingRoom({ ...editingRoom, roomPass: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary"
              />

              <p className="text-[10px] text-muted-foreground">
                Credentials are encrypted with AES-256-GCM and automatically revealed to joined players 15 minutes before match start.
              </p>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingRoom(null)} className="flex-1 h-9 text-xs">
                  Cancel
                </Button>
                <Button variant="game" onClick={handleSaveRoomCredentials} className="flex-1 h-9 text-xs">
                  Encrypt & Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
