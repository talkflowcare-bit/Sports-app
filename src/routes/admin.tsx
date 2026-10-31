/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Crown,
  Trophy,
  Users,
  Wallet,
  Settings,
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
  Megaphone,
  Image as ImageIcon,
  Upload,
  Radio,
  ArrowLeft,
  KeyRound,
  ExternalLink,
  Trash2,
  Activity,
  Layers,
  Save,
  Check,
  AlertCircle,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth, getRegisteredUsers, saveRegisteredUsers, type StoredAccount } from "@/hooks/useAuth";
import { hasPermission, isOwner, type AppRole } from "@/lib/rbac";
import { getAuditLogs, logAuditEvent, exportAuditLogsAsJson, exportAuditLogsAsCsv, type AuditLogEntry } from "@/lib/audit";
import { inr, fmtDate, DEFAULT_TOURNAMENTS, type Tournament } from "@/lib/game";
import {
  getBroadcasts,
  saveBroadcasts,
  createBroadcast,
  deleteBroadcast,
  type BroadcastNotification,
  type BroadcastType,
} from "@/lib/broadcast";
import {
  getAppBanners,
  saveAppBanners,
  getCategoryCovers,
  saveCategoryCovers,
  processImageFile,
  type CustomBanner,
} from "@/lib/banners-store";
import {
  getSecurityPasscodes,
  saveSecurityPasscodes,
  verifyPasscode,
} from "@/lib/passcodes";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Owner Command HQ — DARK ESPORTS" },
      { name: "description", content: "Master executive command headquarters for DARK ESPORTS owner." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, account, role, verifyStaffOrOwnerPasscode, updateAccount } = useAuth();
  const navigate = useNavigate();

  // Authentication & Passcode check
  const [passcode, setPasscode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionElevated, setSessionElevated] = useState(false);

  // Active command tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "passcodes" | "banners" | "broadcasts" | "tournaments" | "finance" | "users" | "audit"
  >("overview");

  // State data
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("dark_esports_tournaments_v1");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_TOURNAMENTS;
  });

  const [banners, setBanners] = useState<CustomBanner[]>(() => getAppBanners());
  const [categoryCovers, setCatCovers] = useState<Record<string, string>>(() => getCategoryCovers());
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>(() => getBroadcasts());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState("");
  const [userList, setUserList] = useState<StoredAccount[]>(() => getRegisteredUsers());

  // Passcodes state for Owner editing
  const [passcodesState, setPasscodesState] = useState(() => getSecurityPasscodes());
  const [editOwnerPass, setEditOwnerPass] = useState(() => getSecurityPasscodes().ownerPasscode);
  const [editStaffPass, setEditStaffPass] = useState(() => getSecurityPasscodes().staffPasscode);

  // Upload state for new banner
  const fileInputRef = useRef<HTMLInputElement>(null);
  const catInputRef = useRef<HTMLInputElement>(null);
  const [selectedCatSlug, setSelectedCatSlug] = useState<string>("freefire");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
  });

  // Broadcast composer state
  const [newBroadcast, setNewBroadcast] = useState({
    title: "",
    message: "",
    type: "urgent" as BroadcastType,
    pinned: true,
  });

  // Pending deposits & withdrawals queue
  const [pendingDeposits, setPendingDeposits] = useState(() => [
    { id: "dep-1", userPhone: "9876543210", userName: "DARK KING", amount: 100, utr: "542198762341", time: new Date(Date.now() - 15 * 60000).toISOString() },
    { id: "dep-2", userPhone: "9123456780", userName: "SniperPro99", amount: 50, utr: "439281726543", time: new Date(Date.now() - 45 * 60000).toISOString() },
  ]);

  const [pendingWithdrawals, setPendingWithdrawals] = useState(() => [
    { id: "wth-1", userPhone: "9876543210", userName: "DARK KING", amount: 200, upi: "darkking@okhdfcbank", time: new Date(Date.now() - 30 * 60000).toISOString() },
  ]);

  // App settings state
  const [upiId, setUpiId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dark_esports_upi_id");
      if (stored) return stored;
    }
    return "666zishan@fam";
  });
  const [minDeposit, setMinDeposit] = useState(10);
  const [minWithdraw, setMinWithdraw] = useState(50);

  // New Tournament Modal
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
    start_time_offset: 2,
  });

  // Room Credentials Modal
  const [editingRoom, setEditingRoom] = useState<{ id: string; title: string; roomId: string; roomPass: string } | null>(null);

  // User Balance Edit Modal
  const [editingBalanceUser, setEditingBalanceUser] = useState<StoredAccount | null>(null);
  const [addBalanceAmount, setAddBalanceAmount] = useState<number>(100);

  // Refresh lists
  useEffect(() => {
    getAuditLogs().then((logs) => setAuditLogs(logs));
    setUserList(getRegisteredUsers());
    setBanners(getAppBanners());
    setBroadcasts(getBroadcasts());
    setCatCovers(getCategoryCovers());
    const pc = getSecurityPasscodes();
    setPasscodesState(pc);
    setEditOwnerPass(pc.ownerPasscode);
    setEditStaffPass(pc.staffPasscode);
  }, [activeTab]);

  const isOwnerAccess = sessionElevated || role === "owner";

  // Passcode verification handler for Owner Gate
  const handlePasscodeUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      toast.error("Please enter owner authorization passcode");
      return;
    }
    setIsVerifying(true);
    const res = verifyPasscode(passcode.trim());
    setIsVerifying(false);

    if (res.success) {
      if (res.role === "staff") {
        toast.info("Staff credentials detected. Redirecting to Staff Operations Deck...");
        verifyStaffOrOwnerPasscode(passcode.trim());
        navigate({ to: "/staff" });
        return;
      }
      verifyStaffOrOwnerPasscode(passcode.trim());
      toast.success("Owner Clearance Verified: Welcome to Command HQ!");
      setSessionElevated(true);
      setPasscode("");
    } else {
      toast.error("Invalid passcode! Clearance denied.");
    }
  };

  // PASSCODE MANAGEMENT HANDLER (Owner can change Staff & Owner Passcodes)
  const handleSavePasscodes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwnerPass.trim() || !editStaffPass.trim()) {
      toast.error("Neither Owner passcode nor Staff passcode can be empty.");
      return;
    }
    const updated = saveSecurityPasscodes({
      ownerPasscode: editOwnerPass.trim(),
      staffPasscode: editStaffPass.trim(),
    }, account?.username || "Owner");
    setPasscodesState(updated);
    toast.success("Security Passcodes updated successfully! Staff must now use the new passcode.");
  };

  // BANNER UPLOAD & MANAGEMENT
  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading("Compressing and preparing image...", { id: "img-upload" });
      const dataUrl = await processImageFile(file, 1200, 0.82);
      setUploadPreview(dataUrl);
      setBannerForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      toast.success("Image ready for publishing!", { id: "img-upload" });
    } catch (err: any) {
      toast.error(err.message || "Failed to process image", { id: "img-upload" });
    }
  };

  const handleAddBanner = () => {
    if (!bannerForm.title.trim()) {
      toast.error("Please enter a title for the banner");
      return;
    }
    const finalImage = bannerForm.imageUrl || uploadPreview;
    if (!finalImage) {
      toast.error("Please upload an image or provide an image URL");
      return;
    }
    const newBannerItem: CustomBanner = {
      id: "banner-" + Date.now().toString(36),
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim() || "Official Dark Esports Event",
      image_url: finalImage,
      active: true,
      sort: banners.length + 1,
    };
    const updated = [newBannerItem, ...banners];
    setBanners(updated);
    saveAppBanners(updated);
    setUploadPreview(null);
    setBannerForm({ title: "", subtitle: "", imageUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
    void logAuditEvent({
      actorId: user?.id || "admin",
      actorName: account?.username || "Owner",
      actorRole: "owner",
      action: "HOME_BANNER_UPLOADED",
      entityType: "settings" as any,
      details: `New Home Banner published: "${newBannerItem.title}"`,
      severity: "info",
    });
    toast.success("Banner published! Home screen is updated instantly. 🚀");
  };

  const handleDeleteBanner = (id: string) => {
    const updated = banners.filter((b) => b.id !== id);
    setBanners(updated);
    saveAppBanners(updated);
    toast.success("Banner deleted");
  };

  const handleToggleBanner = (id: string) => {
    const updated = banners.map((b) => (b.id === id ? { ...b, active: !b.active } : b));
    setBanners(updated);
    saveAppBanners(updated);
    toast.success("Banner visibility updated");
  };

  // CATEGORY COVER UPLOAD
  const handleCatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading("Compressing category cover...", { id: "cat-upload" });
      const dataUrl = await processImageFile(file, 800, 0.85);
      const updated = { ...categoryCovers, [selectedCatSlug]: dataUrl };
      setCatCovers(updated);
      saveCategoryCovers(updated);
      toast.success(`Category cover for [${selectedCatSlug.toUpperCase()}] updated!`, { id: "cat-upload" });
    } catch {
      toast.error("Failed to process cover image", { id: "cat-upload" });
    }
  };

  // BROADCAST DISPATCH
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) {
      toast.error("Please fill in notification title and message");
      return;
    }
    createBroadcast({
      title: newBroadcast.title,
      message: newBroadcast.message,
      type: newBroadcast.type,
      sender: "DARKXPROFESSOR (Owner)",
      senderRole: "owner",
      pinned: newBroadcast.pinned,
      actorId: user?.id,
    });
    setBroadcasts(getBroadcasts());
    setNewBroadcast({ title: "", message: "", type: "urgent", pinned: true });
    toast.success("Broadcast sent to all players! 📢");
  };

  const handleDeleteBroadcast = (id: string) => {
    deleteBroadcast(id, account?.username || "Owner");
    setBroadcasts(getBroadcasts());
    toast.success("Broadcast removed");
  };

  // TOURNAMENT CREATION
  const handleCreateTournament = () => {
    if (!newTour.title.trim()) {
      toast.error("Please enter match title");
      return;
    }
    const created: Tournament = {
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
      rules: "Fair play mandatory. Room ID will be dispatched 15 minutes before start.",
    };
    const updated = [created, ...tournaments];
    setTournaments(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("dark_esports_tournaments_v1", JSON.stringify(updated));
    }
    setShowNewTourModal(false);
    toast.success("Tournament created and open for registrations!");
  };

  // UPDATE ROOM ID / PASS
  const handleSaveRoom = () => {
    if (!editingRoom) return;
    try {
      localStorage.setItem(
        `dark_room_${editingRoom.id}`,
        JSON.stringify({
          room_id: editingRoom.roomId,
          room_pass: editingRoom.roomPass,
          updated_at: new Date().toISOString(),
        })
      );
      toast.success(`Room ID & Password saved for "${editingRoom.title}"!`);
      setEditingRoom(null);
    } catch {
      toast.error("Failed to save room details");
    }
  };

  // FINANCIALS: APPROVE / REJECT DEPOSIT
  const handleApproveDeposit = (id: string) => {
    const dep = pendingDeposits.find((d) => d.id === id);
    if (!dep) return;
    const users = getRegisteredUsers();
    const updatedUsers = users.map((u) => {
      if (u.phone === dep.userPhone) {
        return { ...u, deposit_balance: (u.deposit_balance || 0) + dep.amount };
      }
      return u;
    });
    saveRegisteredUsers(updatedUsers);
    setUserList(updatedUsers);
    setPendingDeposits((prev) => prev.filter((d) => d.id !== id));
    void logAuditEvent({
      actorId: user?.id || "admin",
      actorName: account?.username || "Owner",
      actorRole: "owner",
      action: "WALLET_DEPOSIT_APPROVED",
      entityType: "transaction",
      details: `Approved UPI deposit of ₹${dep.amount} for user ${dep.userName} (${dep.userPhone}). UTR: ${dep.utr}`,
      severity: "info",
    });
    toast.success(`Deposit of ₹${dep.amount} approved and credited to ${dep.userName}!`);
  };

  const handleRejectDeposit = (id: string) => {
    setPendingDeposits((prev) => prev.filter((d) => d.id !== id));
    toast.error("Deposit rejected");
  };

  // SAVE UPI SETTINGS (ONLY IN OWNER PANEL)
  const handleSaveUpiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim() || !upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@bank)");
      return;
    }
    localStorage.setItem("dark_esports_upi_id", upiId.trim());
    toast.success("Official UPI ID & Deposit limits updated successfully! 💳");
    void logAuditEvent({
      actorId: user?.id || "owner",
      actorName: account?.username || "Owner",
      actorRole: "owner",
      action: "UPI_SETTINGS_UPDATED",
      entityType: "setting",
      details: `Owner changed receiving UPI ID to [${upiId.trim()}]. Limits: Min Dep ₹${minDeposit}, Min Withdraw ₹${minWithdraw}`,
      severity: "critical",
    });
  };

  // USER BAN / UNBAN
  const handleToggleUserBan = (phone: string) => {
    const users = getRegisteredUsers();
    const updated = users.map((u) => {
      if (u.phone === phone) {
        const nextBanned = !u.isBanned;
        return { ...u, isBanned: nextBanned, banReason: nextBanned ? "Owner Policy Enforcement" : undefined };
      }
      return u;
    });
    saveRegisteredUsers(updated);
    setUserList(updated);
    toast.success("User account status updated");
  };

  // ADD BALANCE TO USER
  const handleCreditBalance = () => {
    if (!editingBalanceUser || addBalanceAmount <= 0) return;
    const users = getRegisteredUsers();
    const updated = users.map((u) => {
      if (u.phone === editingBalanceUser.phone) {
        return {
          ...u,
          deposit_balance: (u.deposit_balance || 0) + addBalanceAmount,
        };
      }
      return u;
    });
    saveRegisteredUsers(updated);
    setUserList(updated);
    toast.success(`Credited ₹${addBalanceAmount} to ${editingBalanceUser.username}`);
    setEditingBalanceUser(null);
  };

  // 1. LIGHT-THEME OWNER TERMINAL LOGIN (NOT DARK)
  if (!isOwnerAccess) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-300 bg-white p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-wider text-slate-900 uppercase">
                  OWNER COMMAND HQ
                </h1>
                <p className="text-xs font-semibold text-slate-500">Master Administrative Portal</p>
              </div>
            </div>
            <Link
              to="/"
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>

          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase text-amber-800">
              <Lock className="h-4 w-4" /> Owner Clearance Required
            </div>
            <p className="text-xs text-amber-800/90">
              Enter your Master Owner passcode to manage matches, passcodes, UPI ID, broadcasts, and player finances.
            </p>
          </div>

          <form onSubmit={handlePasscodeUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Master Security Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter Owner Passcode"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  autoFocus
                />
                <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-extrabold uppercase tracking-wider text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              {isVerifying ? "Verifying..." : "Unlock Owner Command HQ"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500 font-medium">
            <span>DARK ESPORTS • OWNER v2.0</span>
            <Link to="/" className="text-amber-600 font-bold hover:underline">
              ← Back to Gamer Lobby
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL EXPANSIVE LIGHT-THEMED OWNER COMMAND CENTER (NOT DARK)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-wider text-slate-900 uppercase">
                  OWNER COMMAND HQ
                </h1>
                <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-800">
                  👑 MASTER OWNER
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Full System Control • Security Passcodes • UPI Management • Banners & Match Operations
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
                toast.info("Owner Session Locked.");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Lock className="h-4 w-4" /> Lock HQ
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-4">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2 no-scrollbar">
          {[
            { id: "overview", label: "📊 Overview", count: null },
            { id: "passcodes", label: "🔑 Passcodes (Owner & Staff)", count: null },
            { id: "finance", label: "💳 UPI & Deposits", count: pendingDeposits.length },
            { id: "banners", label: "🖼️ Banners & Assets", count: banners.length },
            { id: "broadcasts", label: "📢 Broadcast Alerts", count: broadcasts.length },
            { id: "tournaments", label: "🎮 Matches & Rooms", count: tournaments.length },
            { id: "users", label: "👥 Users & Roles", count: userList.length },
            { id: "audit", label: "📋 Audit Trail", count: auditLogs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-amber-500 text-white shadow-sm font-black"
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
        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>TOTAL REGISTERED USERS</span>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{userList.length}</div>
                <div className="text-xs text-slate-500 mt-1">PBKDF2 Salted Encryption</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>TOURNAMENTS OPEN</span>
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">{tournaments.length}</div>
                <div className="text-xs text-amber-600 mt-1 font-semibold">Free Fire & BGMI</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>PENDING UPI DEPOSITS</span>
                  <Wallet className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-black text-green-600">{pendingDeposits.length}</div>
                <div className="text-xs text-slate-500 mt-1">Requires UTR Verification</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>STAFF PASSCODE STATUS</span>
                  <KeyRound className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-base font-black font-mono text-purple-700">{passcodesState.staffPasscode}</div>
                <div className="text-xs text-slate-500 mt-1">Managed by Owner</div>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Owner Direct Control Dashboard
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab("passcodes")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-all shadow-xs"
                >
                  <Key className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Passcodes Control</div>
                    <div className="text-[11px] text-slate-500">Change Staff & Owner Pass</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("finance")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-all shadow-xs"
                >
                  <Wallet className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">UPI & Cash Gateway</div>
                    <div className="text-[11px] text-slate-500">Change UPI ID & Verify UTRs</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("banners")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-all shadow-xs"
                >
                  <ImageIcon className="h-5 w-5 text-purple-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Upload Banners</div>
                    <div className="text-[11px] text-slate-500">Device se direct photo chadhayein</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("broadcasts")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-all shadow-xs"
                >
                  <Megaphone className="h-5 w-5 text-red-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Player Broadcasts</div>
                    <div className="text-[11px] text-slate-500">Live Marquee & Bell alerts</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Security Status Box */}
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Owner Privilege Guarantee
              </div>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                As the Owner, you hold full root master authority over DARK ESPORTS. You have exclusive rights to change the official UPI receiving ID, alter security passcodes for Staff members, approve payouts, and reassign roles. Staff members are blocked from viewing or changing UPI settings.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: PASSCODES MANAGEMENT (OWNER & STAFF PASSCODE CHANGE) */}
        {activeTab === "passcodes" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-amber-500/10 via-white to-white p-5 shadow-sm">
              <h2 className="text-base font-extrabold uppercase text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-600" /> Security Passcodes Manager
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Owner ka or Staff ka alag alag passcode yahan se badle. Secret gesture se staff ka pass daalte hi Staff Deck khulega, aur owner pass daalte hi Owner HQ khulega!
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 max-w-2xl">
              <form onSubmit={handleSavePasscodes} className="space-y-5">
                {/* Staff Passcode Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-cyan-600" /> Staff Passcode (Moderators & Referees)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">
                      Current: {passcodesState.staffPasscode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Is passcode ko daalne par seedha <b>Staff Operations Deck (/staff)</b> khulega. Staff ko matches aur rooms handle karne ke liye yeh pass dein.
                  </p>
                  <input
                    type="text"
                    value={editStaffPass}
                    onChange={(e) => setEditStaffPass(e.target.value)}
                    placeholder="Enter Staff Passcode (e.g. DARK_STAFF_2026)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>

                {/* Owner Passcode Card */}
                <div className="rounded-2xl border border-slate-200 bg-amber-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Crown className="h-4 w-4 text-amber-600" /> Owner Passcode (Master Superadmin)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      Current: {passcodesState.ownerPasscode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Is passcode ko daalne par seedha <b>Owner Command HQ (/admin)</b> khulega. Isme full power (UPI change, balances, banners, staff pass change) shamil hai.
                  </p>
                  <input
                    type="text"
                    value={editOwnerPass}
                    onChange={(e) => setEditOwnerPass(e.target.value)}
                    placeholder="Enter Owner Passcode (e.g. DARK_OWNER_2026)"
                    className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Last Updated: {fmtDate(passcodesState.updatedAt)}
                  </span>
                  <Button
                    type="submit"
                    className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-xs shadow-md"
                  >
                    Save Passcode Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: FINANCE & OFFICIAL UPI GATEWAY (ONLY OWNER) */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold uppercase text-slate-900 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-green-600" /> Official UPI Deposit Gateway (Owner Only)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Players ke "Add Cash" page par jo UPI ID aur QR code dikhega use yahan se update karein. Staff panel me ye option bilkul nahi hai.
                  </p>
                </div>
                <span className="rounded-full bg-green-100 text-green-800 border border-green-300 px-3 py-1 text-xs font-bold">
                  Owner Security Clearance
                </span>
              </div>

              <form onSubmit={handleSaveUpiConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Official Receiving UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="666zishan@fam"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Minimum Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Minimum Withdrawal (₹)
                  </label>
                  <input
                    type="number"
                    value={minWithdraw}
                    onChange={(e) => setMinWithdraw(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button
                    type="submit"
                    className="h-10 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
                  >
                    Save UPI Settings
                  </Button>
                </div>
              </form>
            </div>

            {/* Pending Deposits Table */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Pending UPI Deposit Verifications ({pendingDeposits.length})
                </h3>
                <span className="text-xs text-slate-500">1-Tap me UTR verify karke user ko balance credit karein</span>
              </div>

              {pendingDeposits.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Koi pending deposit request nahi hai.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDeposits.map((dep) => (
                    <div
                      key={dep.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {dep.userName} ({dep.userPhone})
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Amount: <span className="font-extrabold text-green-600">₹{dep.amount}</span> • UTR:{" "}
                          <span className="font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                            {dep.utr}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">{fmtDate(dep.time)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveDeposit(dep.id)}
                          className="flex items-center gap-1 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-green-700 shadow-xs"
                        >
                          <Check className="h-4 w-4" /> Approve & Credit
                        </button>
                        <button
                          onClick={() => handleRejectDeposit(dep.id)}
                          className="flex items-center gap-1 rounded-xl bg-red-100 text-red-700 px-3 py-2 text-xs font-bold hover:bg-red-200"
                        >
                          <X className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BANNERS & ASSETS STUDIO */}
        {activeTab === "banners" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Upload className="h-4 w-4 text-amber-500" /> Upload New Home Carousel Banner
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Banner Heading / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FREE FIRE GRAND SCRIMS ₹5,000"
                      value={bannerForm.title}
                      onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Play daily 8 PM custom room. Real cash booyah!"
                      value={bannerForm.subtitle}
                      onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Photo from Device
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleBannerFileSelect}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                    />
                  </div>
                  <Button
                    onClick={handleAddBanner}
                    className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-xs shadow-sm"
                  >
                    Publish to Home Screen
                  </Button>
                </div>

                {/* Preview Box */}
                <div className="flex flex-col justify-center items-center border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 mb-2">LIVE CAROUSEL PREVIEW</span>
                  {uploadPreview || bannerForm.imageUrl ? (
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden shadow-md border border-slate-200">
                      <img
                        src={uploadPreview || bannerForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-3 text-white">
                        <div className="text-sm font-extrabold">{bannerForm.title || "Banner Title"}</div>
                        <div className="text-[11px] text-slate-200">{bannerForm.subtitle || "Subtitle tagline"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      Photo select karein preview dekhne ke liye
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Banners */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Active Banners ({banners.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {banners.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div className="relative h-32 w-full">
                      <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-3 text-white">
                        <div className="text-xs font-bold">{b.title}</div>
                        <div className="text-[10px] text-slate-200 truncate max-w-[200px]">{b.subtitle}</div>
                      </div>
                      <span
                        className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          b.active ? "bg-green-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {b.active ? "LIVE" : "HIDDEN"}
                      </span>
                    </div>
                    <div className="p-3 flex items-center justify-between border-t border-slate-200 text-xs bg-white">
                      <button
                        onClick={() => handleToggleBanner(b.id)}
                        className="text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        {b.active ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(b.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BROADCASTS & PUSH ALERTS */}
        {activeTab === "broadcasts" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-600" /> Send Live Notification to All Gamers
              </h3>
              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notification Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 🚨 Weekend Mega Tournament Live!"
                      value={newBroadcast.title}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Urgency Type
                    </label>
                    <select
                      value={newBroadcast.type}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, type: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="urgent">🚨 Urgent Critical Alert</option>
                      <option value="tournament">🏆 Tournament Match Notice</option>
                      <option value="wallet">💰 Add Cash / UPI Notice</option>
                      <option value="info">ℹ️ General Notice</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Announcement Message
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed message to notify all registered players..."
                    value={newBroadcast.message}
                    onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBroadcast.pinned}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, pinned: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Pin to Home Ticker / Marquee bar</span>
                  </label>
                  <Button
                    type="submit"
                    className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs"
                  >
                    Broadcast to All Players
                  </Button>
                </div>
              </form>
            </div>

            {/* List of broadcasts */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Dispatched Announcements ({broadcasts.length})
              </h3>
              <div className="space-y-3">
                {broadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[10px] uppercase">
                          {b.type}
                        </span>
                        {b.pinned && (
                          <span className="rounded bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 text-[10px]">
                            PINNED
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">{fmtDate(b.created_at)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{b.title}</h4>
                      <p className="text-xs text-slate-600">{b.message}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteBroadcast(b.id)}
                      className="flex items-center gap-1 rounded-xl bg-red-100 text-red-700 px-3 py-1.5 text-xs font-bold hover:bg-red-200 shrink-0 self-start md:self-center"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TOURNAMENTS & MATCH CONTROL */}
        {activeTab === "tournaments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold uppercase text-slate-900">Matches & Custom Rooms</h2>
                <p className="text-xs text-slate-500">Create new tournaments and set room credentials</p>
              </div>
              <Button
                onClick={() => setShowNewTourModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-xs"
              >
                <Plus className="h-4 w-4 mr-1" /> Create Match
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider font-mono">
                        {t.map} • {t.match_type}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
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
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-200">
                      <div className="text-[10px] text-slate-500">ENTRY</div>
                      <div className="font-bold text-amber-600">{inr(t.entry_fee)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-200">
                      <div className="text-[10px] text-slate-500">PRIZE</div>
                      <div className="font-bold text-green-600">{inr(t.prize_pool)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-200">
                      <div className="text-[10px] text-slate-500">PER KILL</div>
                      <div className="font-bold text-slate-800">{inr(t.per_kill)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-200">
                      <div className="text-[10px] text-slate-500">SLOTS</div>
                      <div className="font-bold text-slate-800">
                        {t.filled_slots}/{t.total_slots}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
                    <button
                      onClick={() =>
                        setEditingRoom({
                          id: t.id,
                          title: t.title,
                          roomId: "",
                          roomPass: "",
                        })
                      }
                      className="text-amber-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Room ID & Pass
                    </button>
                    <select
                      value={t.status}
                      onChange={(e) => {
                        const updated = tournaments.map((item) =>
                          item.id === t.id ? { ...item, status: e.target.value } : item
                        );
                        setTournaments(updated);
                        localStorage.setItem("dark_esports_tournaments_v1", JSON.stringify(updated));
                        toast.success(`Match status set to [${e.target.value}]`);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-semibold"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: USERS & ROLES */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Registered Gamers & Access Control ({userList.length})
                </h3>
                <p className="text-xs text-slate-500">User balances, account roles, and fair play bans</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-2.5">User</th>
                      <th className="py-2.5">Mobile</th>
                      <th className="py-2.5">Role</th>
                      <th className="py-2.5">Balances</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {u.avatar} {u.username}
                        </td>
                        <td className="py-3 font-mono text-slate-700">{u.phone}</td>
                        <td className="py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              u.role === "owner"
                                ? "bg-amber-100 text-amber-800"
                                : u.role === "staff"
                                ? "bg-cyan-100 text-cyan-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700">
                          Dep: ₹{u.deposit_balance} | Win: ₹{u.winning_balance}
                        </td>
                        <td className="py-3">
                          {u.isBanned ? (
                            <span className="rounded bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                              BANNED
                            </span>
                          ) : (
                            <span className="rounded bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => setEditingBalanceUser(u)}
                            className="rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2.5 py-1 font-semibold"
                          >
                            Credit Balance
                          </button>
                          <button
                            onClick={() => handleToggleUserBan(u.phone)}
                            className={`rounded-lg px-2.5 py-1 font-semibold ${
                              u.isBanned
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {u.isBanned ? "Unban" : "Ban"}
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

        {/* TAB 8: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Tamper-Evident SHA-256 Audit Trail ({auditLogs.length})
                  </h3>
                  <p className="text-xs text-slate-500">Every single admin and staff operation is logged with a cryptographic digest</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      exportAuditLogsAsJson(auditLogs);
                      toast.success("Audit trail downloaded as JSON");
                    }}
                    className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> JSON
                  </button>
                  <button
                    onClick={() => {
                      exportAuditLogsAsCsv(auditLogs);
                      toast.success("Audit trail downloaded as CSV");
                    }}
                    className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-amber-700">[{log.action}]</span>
                      <span>{fmtDate(log.timestamp)}</span>
                    </div>
                    <div className="text-slate-800 font-sans">{log.details}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Actor: {log.actorName} ({log.actorRole}) • Hash: {log.integrityHash || log.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: CREATE MATCH */}
      {showNewTourModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setShowNewTourModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Tournament Match</h3>
              <button onClick={() => setShowNewTourModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Match Title</label>
                <input
                  type="text"
                  value={newTour.title}
                  onChange={(e) => setNewTour({ ...newTour, title: e.target.value })}
                  placeholder="e.g. Solo Night Rush #102"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Entry Fee (₹)</label>
                  <input
                    type="number"
                    value={newTour.entry_fee}
                    onChange={(e) => setNewTour({ ...newTour, entry_fee: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Prize Pool (₹)</label>
                  <input
                    type="number"
                    value={newTour.prize_pool}
                    onChange={(e) => setNewTour({ ...newTour, prize_pool: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Per Kill (₹)</label>
                  <input
                    type="number"
                    value={newTour.per_kill}
                    onChange={(e) => setNewTour({ ...newTour, per_kill: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Slots</label>
                  <input
                    type="number"
                    value={newTour.total_slots}
                    onChange={(e) => setNewTour({ ...newTour, total_slots: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>
              <Button onClick={handleCreateTournament} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase">
                Launch Match
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH ROOM ID */}
      {editingRoom && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setEditingRoom(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Custom Room Credentials</h3>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">Match: {editingRoom.title}</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Custom Room ID</label>
                <input
                  type="text"
                  placeholder="e.g. 5421980"
                  value={editingRoom.roomId}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Room Password</label>
                <input
                  type="text"
                  placeholder="e.g. 1234"
                  value={editingRoom.roomPass}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomPass: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 font-mono"
                />
              </div>
              <Button onClick={handleSaveRoom} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase">
                Save & Dispatch to Players
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREDIT BALANCE */}
      {editingBalanceUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setEditingBalanceUser(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Credit Player Balance</h3>
              <button onClick={() => setEditingBalanceUser(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600">
              Player: <span className="font-bold text-slate-900">{editingBalanceUser.username}</span> ({editingBalanceUser.phone})
            </div>
            <div>
              <label className="block text-xs text-slate-700 font-bold mb-1">Credit Amount (₹)</label>
              <input
                type="number"
                value={addBalanceAmount}
                onChange={(e) => setAddBalanceAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-bold"
              />
            </div>
            <Button onClick={handleCreditBalance} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold uppercase text-xs">
              Confirm Add ₹{addBalanceAmount}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
