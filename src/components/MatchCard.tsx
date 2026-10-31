import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Users } from "lucide-react";
import { catImg, countdown, fmtDate, inr, type Tournament } from "@/lib/game";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return now;
}

export function MatchCard({ t, slug, joined }: { t: Tournament; slug: string; joined?: boolean }) {
  const now = useNow();
  const pct = Math.min(100, (t.filled_slots / t.total_slots) * 100);
  return (
    <Link to="/match/$id" params={{ id: t.id }} className="block overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="relative h-28">
        <img src={catImg(slug)} alt={t.title} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
          {t.match_type} • {t.map}
        </div>
        {joined && (
          <div className="absolute right-3 top-3 rounded-full bg-success px-2.5 py-0.5 text-[10px] font-bold text-success-foreground">JOINED</div>
        )}
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between text-background">
          <div className="font-bold leading-tight">{t.title}</div>
          <div className="flex items-center gap-1 text-[11px] font-semibold"><Clock className="h-3 w-3" />{countdown(t.start_time, now)}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border py-3 text-center">
        <Stat label="Prize Pool" value={inr(t.prize_pool)} accent />
        <Stat label="Per Kill" value={inr(t.per_kill)} />
        <Stat label="Entry" value={t.entry_fee > 0 ? inr(t.entry_fee) : "FREE"} />
      </div>
      <div className="px-4 pb-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{t.total_slots - t.filled_slots} spots left</span>
          <span>{fmtDate(t.start_time)}</span>
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
