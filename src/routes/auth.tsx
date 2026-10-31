import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Gift, Gamepad2, Hash, Phone, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GameLoader } from "@/components/GameLoader";
import { APP_NAME, errMsg } from "@/lib/game";
import { bannerImage as banner } from "@/lib/game";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Login   DARK ESPORTS" },
      { name: "description", content: "Login or register your DARK ESPORTS account with your mobile number and Free Fire UID." },
      { property: "og:title", content: "Login   DARK ESPORTS" },
      { property: "og:description", content: "Login or register your DARK ESPORTS account to join Free Fire tournaments." },
    ],
  }),
  component: AuthPage,
});

function Field({
  icon: Icon,
  label,
  right,
  ...props
}: { icon: typeof Phone; label: string; right?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <input
          {...props}
          className="w-full rounded-xl border border-border bg-background/80 py-3 pl-11 pr-11 text-sm outline-none transition focus:border-primary focus:glow-ring"
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </label>
  );
}

const empty = { phone: "", password: "", ign: "", ffuid: "", refer: "", secretCode: "" };

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [f, setF] = useState(empty);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const { user, loginUser, registerUser, verifyStaffOrOwnerPasscode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  // Check if admin param is in URL for internal staff
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("admin") || p.has("staff") || p.has("owner")) {
      setShowStaffModal(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const cleanPhone = f.phone.trim().replace(/\D/g, "");

    try {
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        throw new Error("Sahi 10 digit mobile number daalo (e.g. 9876543210)");
      }

      if (f.password.length < 6) {
        throw new Error("Password kam se kam 6 characters ka hona chahiye");
      }

      if (mode === "login") {
        const res = await loginUser(cleanPhone, f.password);
        if (!res.success) {
          throw new Error(res.error || "Login fail ho gaya. Mobile number aur password check karo.");
        }
        toast.success("Welcome back, Survivor! 🔥");
        navigate({ to: "/" });
      } else {
        // Register
        if (f.ign.trim().length < 3) throw new Error("Apna Free Fire IN-GAME NAME daalo (min 3 letters)");
        if (!/^\d{8,14}$/.test(f.ffuid.trim())) throw new Error("Free Fire UID 8-14 digits ka hona chahiye");

        await registerUser({
          phone: cleanPhone,
          password: f.password,
          ign: f.ign.trim(),
          ffuid: f.ffuid.trim(),
          refer: f.refer.trim(),
        });

        toast.success("Account ban gaya! ₹10 welcome bonus added 🔥");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const handleStaffAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.secretCode.trim()) {
      toast.error("Please enter authorization passcode");
      return;
    }
    const res = verifyStaffOrOwnerPasscode(f.secretCode.trim());
    if (res.success) {
      toast.success(`Access Verified: Signed in as [${res.role?.toUpperCase()}]`);
      setShowStaffModal(false);
      navigate({ to: "/" });
    } else {
      toast.error(res.error || "Authorization passcode invalid");
    }
  };

  if (user) return <GameLoader label="Entering lobby..." />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-5">
      <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      {busy && <GameLoader label={mode === "login" ? "Logging in" : "Creating account"} />}
      
      <div className="relative w-full max-w-sm animate-pop rounded-3xl border border-border bg-header px-6 py-7 shadow-card">
        <div className="text-center text-3xl font-extrabold uppercase tracking-[2px] text-primary">{APP_NAME}</div>
        <p className="mb-4 mt-1 text-center text-xs text-muted-foreground">
          {mode === "login" ? "Welcome back, Survivor! 🔥" : "Free Fire tournament khelo, cash jeeto"}
        </p>

        {/* Clean 2-Way Mode Switcher: Login | Register */}
        <div className="mb-4 grid grid-cols-2 rounded-xl border border-border bg-background/60 p-1 text-xs font-bold uppercase">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 transition ${mode === m ? "bg-gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {m === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <Field
            icon={Phone}
            label="Mobile Number"
            type="tel"
            placeholder="9876543210"
            inputMode="tel"
            maxLength={10}
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "") })}
            required
          />

          {mode === "signup" && (
            <>
              <Field
                icon={Gamepad2}
                label="Free Fire In-Game Name"
                placeholder="DARKツKING"
                maxLength={24}
                value={f.ign}
                onChange={(e) => setF({ ...f, ign: e.target.value })}
                required
              />
              <Field
                icon={Hash}
                label="Free Fire UID"
                placeholder="1234567890"
                inputMode="numeric"
                maxLength={14}
                value={f.ffuid}
                onChange={(e) => setF({ ...f, ffuid: e.target.value.replace(/\D/g, "") })}
                required
              />
            </>
          )}

          <Field
            icon={Lock}
            label="Password"
            type={show ? "text" : "password"}
            placeholder="Min 6 characters"
            minLength={6}
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            required
            right={
              <button type="button" aria-label="Show password" onClick={() => setShow(!show)} className="text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          {mode === "signup" && (
            <Field
              icon={Gift}
              label="Refer Code (optional)"
              placeholder="ABC123"
              value={f.refer}
              onChange={(e) => setF({ ...f, refer: e.target.value })}
            />
          )}

          <div className="mt-4">
            <Button variant="game" type="submit" disabled={busy}>
              {mode === "login" ? "Login to Battle" : "Register • Get ₹10"}
            </Button>
          </div>
        </form>
      </div>

      {/* Internal Staff & Owner Authentication Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowStaffModal(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl animate-pop text-card-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Management Clearance</h3>
              </div>
              <button onClick={() => setShowStaffModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              Authorized personnel only. Enter your security passcode to authenticate management session.
            </p>

            <form onSubmit={handleStaffAuth} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Authorization Passcode
                </label>
                <input
                  type="password"
                  placeholder="Enter passcode"
                  value={f.secretCode}
                  onChange={(e) => setF({ ...f, secretCode: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              <Button variant="game" type="submit" className="w-full">
                Verify Clearance
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
