import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Copy,
  Download,
  Gift,
  KeyRound,
  LogOut,
  Pencil,
  Share2,
  ShieldCheck,
  Crown,
  Smartphone,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ApkModal } from "@/components/ApkModal";
import { AdminPortal } from "@/components/AdminPortal";
import { errMsg, fmtDate, profileQuery, settingsQuery } from "@/lib/game";
import { type AppRole } from "@/lib/rbac";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My Profile   DARK ESPORTS" },
      { name: "description", content: "Your DARK ESPORTS stats, level, role, app install, and settings." },
      { property: "og:title", content: "My Profile   DARK ESPORTS" },
      { property: "og:description", content: "Your stats, level, role, app install, and settings." },
    ],
  }),
  component: ProfilePage,
});

const EMOJIS = ["🔥", "⚡", "💀", "👑", "🎯", "🛡️", "🐉", "🐺", "🏆", "💣", "🎖️", "⚔️", "💎", "🦁", "🚀", "💥", "🕶️", "👾"];

function ProfilePage() {
  const { user, role, signOut, updateAccount, verifyStaffOrOwnerPasscode } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: p } = useQuery({ ...profileQuery(uid), enabled: !!user });
  const { data: s } = useQuery(settingsQuery);
  const { data: notifs = [] } = useQuery({
    queryKey: ["notifs"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [modal, setModal] = useState<null | "edit" | "refer" | "notif" | "policy" | "password" | "secretAuth">(null);
  const [showApkModal, setShowApkModal] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [ign, setIgn] = useState("");
  const [ffuid, setFfuid] = useState("");
  const [pw, setPw] = useState({ cur: "", next: "" });
  const [secretPass, setSecretPass] = useState("");
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTap < 1500) {
      const next = tapCount + 1;
      if (next >= 4) {
        setTapCount(0);
        setModal("secretAuth");
      } else {
        setTapCount(next);
      }
    } else {
      setTapCount(1);
    }
    setLastTap(now);
  };

  const level = Math.floor((p?.matches_played ?? 0) / 10) + 1;
  const tier = level >= 10 ? "Diamond 💎" : level >= 5 ? "Gold 🥇" : level >= 3 ? "Silver 🥈" : "Bronze 🥉";

  const saveProfile = async () => {
    const updated = {
      username: name.trim() || p?.username || "Survivor",
      avatar: avatar || p?.avatar || "🔥",
      ff_ign: ign.trim() || p?.ff_ign || "",
      ff_uid: ffuid.replace(/\D/g, "").slice(0, 14) || p?.ff_uid || "",
    };
    updateAccount(updated);
    try {
      await supabase.from("profiles").update(updated).eq("id", uid);
    } catch {}
    toast.success("Profile updated");
    qc.invalidateQueries();
    setModal(null);
  };

  const changePw = async () => {
    const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.cur } as never);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Password changed");
    setPw({ cur: "", next: "" });
    setModal(null);
  };

  const share = () => {
    const text = `Join ${s?.app_name ?? "DARK ESPORTS"} and play tournaments! Use my refer code ${p?.refer_code} to get bonus. ${window.location.origin}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast.success("Copied invite")).catch(() => toast.info(text));
    else toast.info(text);
  };

  const isStaffOrOwner = role === "owner" || role === "staff";

  const items = [
    ...(isStaffOrOwner
      ? [{ label: role === "owner" ? "👑 Owner Command HQ" : "🛡️ Staff Operations Deck", icon: role === "owner" ? Crown : ShieldCheck, on: () => navigate({ to: role === "staff" ? "/staff" : "/admin" }), highlight: true }]
      : []),
    { label: "Install App to Home Screen", icon: Smartphone, on: () => setShowApkModal(true) },
    { label: "Refer & Earn Bonus", icon: Gift, on: () => setModal("refer") },
    { label: "Notifications & Match Alerts", icon: Bell, on: () => setModal("notif") },
    { label: "Change Password", icon: KeyRound, on: () => setModal("password") },
    { label: "Fair Play Policy & Rules", icon: ShieldCheck, on: () => setModal("policy") },
  ];

  return (
    <AppShell>
      <div className="space-y-5 p-4">
        {/* Profile Header Banner */}
        <div className="relative rounded-3xl bg-gradient-primary p-5 text-center text-primary-foreground shadow-glow">
          <div className="absolute left-4 top-4 flex items-center gap-1.5">
            <span className="rounded-full bg-background/20 px-2.5 py-0.5 text-[11px] font-bold">{tier}</span>
            {isStaffOrOwner && (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                role === "owner" ? "bg-amber-400 text-black shadow-sm" : "bg-blue-600 text-white shadow-sm"
              }`}>
                {role === "owner" ? "👑 Owner" : "🛡️ Staff"}
              </span>
            )}
          </div>

          <button
            aria-label="Edit profile"
            className="absolute right-4 top-4 rounded-full bg-background/20 p-2 hover:bg-background/30 transition-colors"
            onClick={() => {
              setName(p?.username ?? "");
              setAvatar(p?.avatar ?? "");
              setIgn(p?.ff_ign ?? "");
              setFfuid(p?.ff_uid ?? "");
              setModal("edit");
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-background text-4xl ring-4 ring-background/40">
            {p?.avatar}
          </div>
          <div className="mt-2 text-xl font-extrabold">{p?.username ?? "Loading..."}</div>
          <div className="text-sm font-bold">🎮 {p?.ff_ign || "IGN not set"}{p?.ff_uid ? ` • FF UID ${p.ff_uid}` : ""}</div>
          <div onClick={handleSecretTap} className="text-xs opacity-90 cursor-pointer select-none">ID: {p?.uid_code} • Lv. {level}</div>
          <div className="mx-auto mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-background/30">
            <div className="h-full bg-background" style={{ width: `${((p?.matches_played ?? 0) % 10) * 10}%` }} />
          </div>
          <div className="mt-1 text-[10px] opacity-90">{(p?.matches_played ?? 0) % 10}/10 matches to next level</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[["Played", p?.matches_played], ["Won", p?.matches_won], ["Kills", p?.total_kills]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-border bg-card py-3">
              <div className="text-lg font-extrabold text-primary">{v ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>

        {/* Menu Items */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map(({ label, icon: Icon, on, highlight }) => (
            <button
              key={label}
              onClick={on}
              className={`flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left text-sm font-medium last:border-0 transition-colors ${
                highlight ? "bg-primary/5 hover:bg-primary/10 font-bold text-foreground" : "hover:bg-accent"
              }`}
            >
              <Icon className={`h-4 w-4 ${highlight ? "text-primary" : "text-primary"}`} />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />Logout
          </button>
        </div>
      </div>

      {/* Profile Modals */}
      {modal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/60" onClick={() => setModal(null)}>
          <div className="max-h-[85vh] w-full max-w-md animate-pop overflow-y-auto rounded-t-3xl bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {{
                  edit: "Edit Profile",
                  refer: "Refer & Earn",
                  notif: "Notifications",
                  policy: "Fair Play Policy",
                  password: "Change Password",
                  roleSwitch: "Role Clearance & Elevation",
                }[modal]}
              </h3>
              <button onClick={() => setModal(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>

            {modal === "edit" && (
              <>
                <p className="mb-2 text-xs font-semibold">Choose Avatar</p>
                <div className="mb-4 grid grid-cols-6 gap-2">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setAvatar(e)} className={`rounded-xl py-2 text-2xl ${avatar === e ? "bg-accent ring-2 ring-primary" : "bg-muted"}`}>{e}</button>
                  ))}
                </div>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Username" className="mb-3 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <input value={ign} onChange={(e) => setIgn(e.target.value)} maxLength={24} placeholder="Free Fire In-Game Name" className="mb-3 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <input value={ffuid} onChange={(e) => setFfuid(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={14} placeholder="Free Fire UID" className="mb-4 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <Button variant="game" onClick={saveProfile}>Save Changes</Button>
              </>
            )}

            {modal === "refer" && (
              <div className="text-center">
                <p className="mb-4 text-xs text-muted-foreground">Share your code and earn bonus! Bonus unlocks when your friend plays their 1st match.</p>
                <div className="mb-4 rounded-2xl border-2 border-dashed border-primary py-4 text-2xl font-extrabold tracking-[4px] text-primary">{p?.refer_code}</div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="gameOutline"
                    onClick={() => {
                      const code = p?.refer_code ?? "";
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(code).then(() => toast.success("Copied")).catch(() => toast.info(`Code: ${code}`));
                      } else {
                        toast.info(`Code: ${code}`);
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />Copy
                  </Button>
                  <Button variant="game" onClick={share}><Share2 className="h-4 w-4" />Share</Button>
                </div>
              </div>
            )}

            {modal === "notif" && (
              <div className="space-y-2">
                {notifs.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No alerts.</p>}
                {notifs.map((n) => (
                  <div key={n.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="text-sm font-bold">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.body}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{fmtDate(n.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            {modal === "policy" && <div className="whitespace-pre-line text-sm leading-relaxed">{s?.rules}</div>}

            {modal === "password" && (
              <>
                <input type="password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} placeholder="Current password" className="mb-3 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <input type="password" value={pw.next} minLength={6} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="New password (min 6)" className="mb-4 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <Button variant="game" onClick={changePw} disabled={pw.next.length < 6}>Update Password</Button>
              </>
            )}

            {modal === "secretAuth" && (
              <div className="space-y-4 text-xs">
                <p className="text-muted-foreground text-[11px]">
                  Management Clearance. Enter your authorization passcode to unlock administrative privileges.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!secretPass.trim()) return;
                    const res = verifyStaffOrOwnerPasscode(secretPass.trim());
                    if (res.success) {
                      toast.success(`Access Verified: Welcome [${res.role?.toUpperCase()}]!`);
                      setModal(null);
                      setSecretPass("");
                      if (res.role === "staff") {
                        navigate({ to: "/staff" });
                      } else {
                        navigate({ to: "/admin" });
                      }
                    } else {
                      toast.error("Invalid authorization passcode");
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    type="password"
                    placeholder="Security Passcode"
                    value={secretPass}
                    onChange={(e) => setSecretPass(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono outline-none focus:border-primary text-center"
                    autoFocus
                  />
                  <Button variant="game" type="submit" className="w-full">
                    Verify Clearance
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* APK Modal */}
      <ApkModal isOpen={showApkModal} onClose={() => setShowApkModal(false)} />

      {/* Staff & Owner Management Portal */}
      {isStaffOrOwner && (
        <AdminPortal isOpen={showAdminPortal} onClose={() => setShowAdminPortal(false)} />
      )}
    </AppShell>
  );
}
