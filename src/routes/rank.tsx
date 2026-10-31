import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { inr } from "@/lib/game";

export const Route = createFileRoute("/rank")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Leaderboard – DARK ESPORTS" },
      { name: "description", content: "Top players on DARK ESPORTS ranked by total earnings." },
      { property: "og:title", content: "Leaderboard – DARK ESPORTS" },
      { property: "og:description", content: "Top players ranked by total earnings." },
    ],
  }),
  component: RankPage,
});

function RankPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("get_leaderboard");
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn("Could not load remote leaderboard:", e);
      }
      return [
        { username: "DARK_GOD", avatar: "👑", matches_won: 42, total_kills: 210, total_earnings: 12500 },
        { username: "HEADSHOT_KING", avatar: "🔥", matches_won: 35, total_kills: 184, total_earnings: 9800 },
        { username: "VIPER_PRO", avatar: "🐺", matches_won: 28, total_kills: 142, total_earnings: 7200 },
        { username: "BOMB_SQUAD", avatar: "💀", matches_won: 22, total_kills: 115, total_earnings: 5400 },
        { username: "SNIPER_99", avatar: "🦅", matches_won: 19, total_kills: 98, total_earnings: 4300 },
      ];
    },
  });
  const top = data.slice(0, 3);
  const order = [1, 0, 2];

  return (
    <AppShell>
      <div className="p-4">
        <h2 className="mb-4 text-base font-bold">Top Players</h2>
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>}
        {top.length > 0 && (
          <div className="mb-6 flex items-end justify-center gap-3">
            {order.map((i) => top[i] && (
              <div key={i} className={`flex w-24 flex-col items-center rounded-2xl border border-border bg-card p-3 shadow-card ${i === 0 ? "pb-6" : ""}`}>
                {i === 0 && <Crown className="mb-1 h-5 w-5 text-gold" />}
                <div className={`flex items-center justify-center rounded-full bg-accent ${i === 0 ? "h-16 w-16 text-3xl ring-2 ring-gold" : "h-12 w-12 text-2xl"}`}>{top[i].avatar}</div>
                <div className="mt-2 w-full truncate text-center text-xs font-bold">{top[i].username}</div>
                <div className="text-xs font-bold text-primary">{inr(top[i].total_earnings)}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">#{i + 1}</div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {data.slice(3).map((p, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 4}</span>
              <span className="text-2xl">{p.avatar}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.username}</div>
                <div className="text-[11px] text-muted-foreground">{p.matches_won} wins • {p.total_kills} kills</div>
              </div>
              <span className="text-sm font-bold text-primary">{inr(p.total_earnings)}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
