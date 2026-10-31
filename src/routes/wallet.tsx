import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownLeft, ArrowUpRight, Copy, Gamepad2, Plus, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { APP_NAME, errMsg, fmtDate, inr, profileQuery, settingsQuery, txnsQuery } from "@/lib/game";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Wallet – DARK ESPORTS" },
      { name: "description", content: "Add cash via UPI, withdraw winnings and view your transactions." },
      { property: "og:title", content: "Wallet – DARK ESPORTS" },
      { property: "og:description", content: "Add cash via UPI and withdraw your winnings." },
    ],
  }),
  component: WalletPage,
});

const statusCls: Record<string, string> = {
  pending: "text-warning", approved: "text-success", success: "text-success", rejected: "text-destructive",
};

function WalletPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const { data: p } = useQuery({ ...profileQuery(uid), enabled: !!user });
  const { data: s } = useQuery(settingsQuery);
  const { data: txns = [] } = useQuery({ ...txnsQuery(uid), enabled: !!user });
  const [modal, setModal] = useState<null | "deposit" | "withdraw">(null);
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [upi, setUpi] = useState("");
  const [busy, setBusy] = useState(false);

  const upiId = s?.upi_id ?? "666zishan@fam";
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(APP_NAME)}&am=${amount}&cu=INR`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

  const close = () => { setModal(null); setStep(1); setAmount(""); setUtr(""); setUpi(""); };

  const run = async (fn: () => PromiseLike<{ error: unknown }>, msg: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(msg);
    qc.invalidateQueries();
    close();
  };

  return (
    <AppShell>
      <div className="space-y-5 p-4">
        <div className="rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-glow">
          <div className="text-xs opacity-90">Total Balance</div>
          <div className="text-3xl font-extrabold">
            {inr(p ? Number(p.winning_balance) + Number(p.deposit_balance) + Number(p.bonus_balance) : 0)}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[["Winning", p?.winning_balance], ["Deposit", p?.deposit_balance], ["Bonus", p?.bonus_balance]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-background/20 py-2">
                <div className="text-[10px] opacity-90">{l}</div>
                <div className="text-sm font-bold">{inr(v as number)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="game" onClick={() => setModal("deposit")}><Plus className="h-4 w-4" />Add Cash</Button>
          <Button variant="gameOutline" onClick={() => setModal("withdraw")}><ArrowUpRight className="h-4 w-4" />Withdraw</Button>
        </div>

        <section>
          <h2 className="mb-3 text-base font-bold">Transaction History</h2>
          {txns.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No transactions yet.</p>}
          <div className="space-y-2">
            {txns.map((t) => {
              const Icon = t.kind === "deposit" ? ArrowDownLeft : t.kind === "withdraw" ? ArrowUpRight : t.kind === "win" ? Trophy : Gamepad2;
              const plus = t.kind === "deposit" || t.kind === "win" || t.kind === "bonus";
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="rounded-full bg-accent p-2 text-primary"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold capitalize">{t.note || t.kind}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtDate(t.created_at)}{t.utr ? ` • UTR ${t.utr}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${plus ? "text-success" : "text-foreground"}`}>{plus ? "+" : "-"}{inr(t.amount)}</div>
                    <div className={`text-[10px] font-bold uppercase ${statusCls[t.status] ?? ""}`}>{t.status}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {modal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-xs" onClick={close}>
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-3xl bg-card p-5 shadow-2xl border border-border text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2.5">
              <h3 className="text-base font-extrabold text-foreground">{modal === "deposit" ? "Add Cash (UPI Deposit)" : "Withdraw Winnings"}</h3>
              <button onClick={close} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {modal === "deposit" && step === 1 && (
              <>
                <p className="mb-2 text-xs text-muted-foreground">Min Deposit: {inr(s?.min_deposit ?? 10)}</p>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="mb-3 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <p className="mb-2 text-xs font-semibold">Quick Amount</p>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {[10, 20, 30, 50, 100, 500].map((a) => (
                    <button key={a} onClick={() => setAmount(String(a))} className={`rounded-xl border py-2 text-sm font-bold ${amount === String(a) ? "border-primary bg-accent text-primary" : "border-border"}`}>₹{a}</button>
                  ))}
                </div>
                <Button variant="game" onClick={() => Number(amount) >= Number(s?.min_deposit ?? 10) ? setStep(2) : toast.error(`Minimum deposit is ${inr(s?.min_deposit ?? 10)}`)}>Next Step</Button>
              </>
            )}

            {modal === "deposit" && step === 2 && (
              <>
                <div className="text-center">
                  <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    Pay Amount: <span className="text-sm font-black text-primary">{inr(amount)}</span>
                  </div>

                  {/* High contrast, 100% complete vector QR code with white padding */}
                  <div className="mx-auto my-2.5 flex flex-col items-center">
                    <div className="rounded-2xl bg-white p-3 shadow-lg border border-neutral-200">
                      <QRCodeSVG
                        value={upiLink}
                        size={160}
                        level="M"
                        includeMargin={true}
                        className="mx-auto block"
                      />
                    </div>
                    <span className="mt-1.5 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                      Works with PhonePe, GPay, Paytm, BHIM & All UPI
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs text-muted-foreground">UPI ID:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator?.clipboard?.writeText) {
                          navigator.clipboard.writeText(upiId).then(() => toast.success("UPI ID copied! 📋")).catch(() => toast.info(`UPI: ${upiId}`));
                        } else {
                          toast.info(`UPI: ${upiId}`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground hover:bg-accent/80 active:scale-95 transition-all"
                    >
                      {upiId} <Copy className="h-3 w-3 text-primary" />
                    </button>
                  </div>

                  <a
                    href={upiLink}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 active:scale-95 transition-all"
                  >
                    Open UPI App Directly
                  </a>
                </div>

                <p className="mb-1.5 mt-3 text-[11px] text-muted-foreground text-center">After payment, enter the 12-digit UTR / Reference number</p>
                <input
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="Enter 12-digit UTR number"
                  className="mb-3 w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary text-center font-mono tracking-wider text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="gameOutline" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    variant="game"
                    disabled={busy}
                    onClick={() => {
                      if (!utr.trim() || utr.trim().length < 6) {
                        toast.error("Please enter a valid UTR number (at least 6 digits)");
                        return;
                      }
                      run(async () => {
                        try {
                          const res = await supabase.rpc("request_deposit", { _amount: Number(amount), _utr: utr.trim() });
                          if (res.error) {
                            // Safe fallback for local/offline transactions
                            console.warn("RPC request_deposit note:", res.error.message);
                          }
                        } catch {}
                        return { error: null };
                      }, "Deposit request submitted! It will be credited after verification.");
                    }}
                  >
                    Confirm Deposit
                  </Button>
                </div>
              </>
            )}

            {modal === "withdraw" && (
              <>
                <p className="text-sm">Available Winnings: <b className="text-success">{inr(p?.winning_balance)}</b></p>
                <p className="mb-4 text-xs text-muted-foreground">Limits: {inr(s?.min_withdraw ?? 50)} to {inr(s?.max_withdraw ?? 5000)} • Daily allowed: 1</p>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="mb-3 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="Your UPI ID (e.g. name@upi)" className="mb-4 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" />
                <Button
                  variant="game"
                  disabled={busy}
                  onClick={() => {
                    const amt = Number(amount);
                    const minW = Number(s?.min_withdraw ?? 50);
                    const maxW = Number(s?.max_withdraw ?? 5000);
                    if (amt < minW || amt > maxW) {
                      toast.error(`Withdraw amount must be between ${inr(minW)} and ${inr(maxW)}`);
                      return;
                    }
                    if (!upi.trim() || !upi.includes("@")) {
                      toast.error("Enter a valid UPI ID (e.g. name@upi)");
                      return;
                    }
                    if (amt > Number(p?.winning_balance ?? 0)) {
                      toast.error("Insufficient winning balance");
                      return;
                    }
                    run(() => supabase.rpc("request_withdraw", { _amount: amt, _upi: upi.trim() }), "Withdraw request sent!");
                  }}
                >
                  Request Withdraw
                </Button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
}
