/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Wallet, Trophy, Headset, User, Bell, Download, ShieldCheck, Crown, Lock, X, Megaphone, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME, inr, profileQuery } from "@/lib/game";
import { GameLoader } from "@/components/GameLoader";
import { ApkModal } from "@/components/ApkModal";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { getBroadcasts, getUnreadCount, type BroadcastNotification } from "@/lib/broadcast";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/rank", label: "Rank", icon: Trophy },
  { to: "/help", label: "Help", icon: Headset },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children, title, hideNav }: { children: ReactNode; title?: string; hideNav?: boolean }) {
  const { user, role, loading, verifyStaffOrOwnerPasscode } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const [showApkModal, setShowApkModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>(() => getBroadcasts());
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { canInstall, installed, install } = usePwaInstall();

  const handleDirectInstall = async () => {
    if (canInstall) {
      const outcome = await install();
      if (outcome) {
        toast.success("DARK ESPORTS installed directly to your home screen! 🎮");
        return;
      }
    } else if (installed) {
      toast.info("DARK ESPORTS is already installed as a standalone app! 🚀");
      return;
    }
    // If browser prompt is not ready or iOS Safari, open guide modal
    setShowApkModal(true);
  };

  // Secret 5-Tap Gesture on App Logo for Staff/Owner Authorization
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretPasscode, setSecretPasscode] = useState("");

  const refreshBroadcasts = () => {
    const list = getBroadcasts();
    setBroadcasts(list);
    if (user?.id) {
      setUnreadCount(getUnreadCount(user.id));
    }
  };

  useEffect(() => {
    refreshBroadcasts();
    const handleUpdate = () => refreshBroadcasts();
    window.addEventListener("dark_esports_broadcasts_updated", handleUpdate);
    return () => window.removeEventListener("dark_esports_broadcasts_updated", handleUpdate);
  }, [user?.id]);

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTap < 1500) {
      const next = tapCount + 1;
      if (next >= 4) {
        setTapCount(0);
        setShowSecretModal(true);
      } else {
        setTapCount(next);
      }
    } else {
      setTapCount(1);
    }
    setLastTap(now);
  };

  const handleSecretUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretPasscode.trim()) {
      toast.error("Please enter authorization passcode");
      return;
    }
    const res = verifyStaffOrOwnerPasscode(secretPasscode.trim());
    if (res.success) {
      toast.success(`Secret Clearance Granted: [${res.role?.toUpperCase()}]`);
      setShowSecretModal(false);
      setSecretPasscode("");
      if (res.role === "staff") {
        navigate({ to: "/staff" });
      } else {
        navigate({ to: "/admin" });
      }
    } else {
      toast.error("Authorization passcode invalid");
    }
  };

  useEffect(() => {
    if (!user) navigate({ to: "/auth" });
  }, [user, navigate]);

  const { data: profile } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const total = profile ? Number(profile.winning_balance) + Number(profile.deposit_balance) + Number(profile.bonus_balance) : 0;

  if (loading || !user) return <GameLoader label="Entering lobby" />;

  const isStaffOrOwner = role === "owner" || role === "staff";
  const pinnedBroadcast = broadcasts.find((b) => b.pinned);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-header px-4 py-3 shadow-card backdrop-blur">
        <div className="flex items-center gap-2">
          {/* Secret 5-Tap Logo: Tapping 5 times triggers hidden Staff/Owner unlock */}
          <div onClick={handleSecretTap} className="cursor-pointer select-none">
            <span className="text-base font-extrabold uppercase tracking-wider text-primary">
              {title ?? APP_NAME}
            </span>
          </div>

          {/* Only rendered if user already has verified staff/owner role */}
          {isStaffOrOwner && (
            <button
              onClick={() => navigate({ to: role === "staff" ? "/staff" : "/admin" })}
              aria-label="Open Management Console"
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase transition-all ${
                role === "owner"
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30"
              }`}
            >
              {role === "owner" ? <Crown className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
              {role === "owner" ? "Owner HQ" : "Staff Deck"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotifDrawer(true)}
            aria-label="View Announcements"
            className="relative rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Direct Browser App Install Trigger */}
          <button
            onClick={handleDirectInstall}
            aria-label="Install App to Home Screen"
            className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/20 active:scale-95 transition-all"
          >
            <Smartphone className="h-3 w-3" /> Install
          </button>

          <span className="flex items-center gap-1 rounded-lg border border-success px-1.5 py-0.5 text-[9px] font-bold text-success">
            <span className="h-1.5 w-1.5 animate-live rounded-full bg-success" /> LIVE
          </span>

          <Link
            to="/wallet"
            className="flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning"
          >
            <Wallet className="h-3 w-3" /> {inr(total)}
          </Link>
        </div>
      </header>

      {/* Pinned Broadcast Live Ticker */}
      {pinnedBroadcast && (
        <div
          onClick={() => setShowNotifDrawer(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600/15 via-primary/10 to-transparent border-b border-primary/20 px-3.5 py-1.5 text-xs cursor-pointer hover:bg-primary/15 transition-colors"
        >
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-red-500 animate-pulse" />
          <div className="truncate text-[11px] font-semibold text-foreground">
            <span className="font-bold text-red-400 mr-1.5 uppercase">[BROADCAST]</span>
            {pinnedBroadcast.title}: {pinnedBroadcast.message}
          </div>
        </div>
      )}

      <main className="animate-pop">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 justify-around rounded-2xl border border-border bg-header py-2.5 shadow-card backdrop-blur">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-2 text-[11px] font-semibold transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className={`h-5 w-5 ${active ? "-translate-y-0.5" : ""} transition-transform`} />
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Notification Center Slide-in Drawer */}
      <NotificationDrawer
        isOpen={showNotifDrawer}
        onClose={() => setShowNotifDrawer(false)}
        userId={user?.id}
        notifications={broadcasts}
        onRefresh={refreshBroadcasts}
      />

      {/* APK & Direct Browser App Center Modal */}
      <ApkModal isOpen={showApkModal} onClose={() => setShowApkModal(false)} />

      {/* Secret 5-Tap Security Passcode Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85" onClick={() => setShowSecretModal(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl animate-pop text-card-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Management Clearance</h3>
              </div>
              <button onClick={() => setShowSecretModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              Authorized Staff and Owner clearance only. Enter your security passcode to open the full Command HQ page.
            </p>

            <form onSubmit={handleSecretUnlock} className="space-y-4">
              <input
                type="password"
                placeholder="Enter authorization passcode"
                value={secretPasscode}
                onChange={(e) => setSecretPasscode(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono outline-none focus:border-primary text-center"
                autoFocus
              />
              <Button variant="game" type="submit" className="w-full">
                Unlock Full Command Center 🚀
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
