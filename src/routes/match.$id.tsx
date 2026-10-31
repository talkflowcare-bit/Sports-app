import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, KeyRound, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useNow } from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { catImg, categoriesQuery, countdown, errMsg, fmtDate, inr, myJoinsQuery, profileQuery, settingsQuery, tournamentQuery, tournamentsQuery } from "@/lib/game";

export const Route = createFileRoute("/match/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Match Details – DARK ESPORTS" },
      { name: "description", content: "See prize pool, rules and join this DARK ESPORTS tournament." },
      { property: "og:title", content: "Match Details – DARK ESPORTS" },
      { property: "og:description", content: "See prize pool, rules and join this tournament." },
    ],
  }),
  component: MatchPage,
});

const maxFor = (type: string) => (/squad/i.test(type) ? 4 : /duo/i.test(type) ? 2 : 1);

function MatchPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const now = useNow();
  const match = useQuery({
    ...tournamentQuery(id),
    initialData: () => qc.getQueryData(tournamentsQuery().queryKey)?.find((t) => t.id === id),
    initialDataUpdatedAt: () => qc.getQueryState(tournamentsQuery().queryKey)?.dataUpdatedAt,
  });
  const t = match.data;
  const { data: cats = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: joins = [] } = useQuery({ ...myJoinsQuery(user?.id ?? ""), enabled: !!user });
  const myJoin = joins.filter((j) => j.tournament_id === id);
  const joined = myJoin.length > 0;
  const { data: players = [] } = useQuery({
    queryKey: ["players", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_match_players", { _tournament_id: id });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  const { data: room } = useQuery({
    queryKey: ["room", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_room", { _tournament_id: id });
      return data?.[0] ?? null;
    },
    enabled: joined,
  });
  const [tab, setTab] = useState<"details" | "players" | "rules">("details");
  const [names, setNames] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const { data: me } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  useEffect(() => {
    if (me?.ff_ign) setNames((n) => (n[0] ? n : [me.ff_ign, ...n.slice(1)]));
  }, [me?.ff_ign]);

  if (!t) return <AppShell><div className="py-16 text-center text-sm text-muted-foreground">
    <p>{match.isError ? "Match could not load." : "Loading..."}</p>
    {match.isError && <Button variant="outline" className="mt-3" onClick={() => void match.refetch()}>Try again</Button>}
  </div></AppShell>;
  const slug = cats.find((c) => c.id === t.category_id)?.slug ?? "freefire";
  const max = maxFor(t.match_type);

  const join = async () => {
    if (names.some((n) => n.trim().length < 2)) { toast.error("Enter in-game name for every player"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("join_tournament", { _tournament_id: id, _names: names });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Joined successfully! Good luck 🔥");
    for (const queryKey of [["tournaments"], ["tournament", id], ["myjoins", user?.id], ["profile", user?.id], ["players", id], ["room", id]]) {
      void qc.invalidateQueries({ queryKey });
    }
  };

  const copy = (v?: string | null) => {
    if (!v) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(v).then(() => toast.success("Copied")).catch(() => toast.info(`Copied: ${v}`));
    } else {
      toast.info(`ID: ${v}`);
    }
  };

  const cd = countdown(t.start_time, now);

  return (
    <AppShell hideNav>
      <div className="relative h-48">
        <img src={catImg(slug)} alt={t.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-dark" />
        <button onClick={() => router.history.back()} aria-label="Back" className="absolute left-4 top-4 rounded-full bg-background/90 p-2">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="absolute bottom-4 left-4 right-4 text-background">
          <div className="text-xl font-extrabold">{t.title}</div>
          <div className="text-xs opacity-90">{fmtDate(t.start_time)} • {cd === "Started" ? "Match Started" : `Starts in ${cd}`}</div>
        </div>
      </div>

      <div className="sticky top-[65px] z-30 flex border-b border-border bg-background">
        {(["details", "players", "rules"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-3 text-sm font-semibold capitalize ${tab === k ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            {k}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {tab === "details" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Entry Fee", t.entry_fee > 0 ? inr(t.entry_fee) : "FREE"],
                ["Prize Pool", inr(t.prize_pool)],
                ["Per Kill", inr(t.per_kill)],
                ["Map & Type", `${t.map} | ${t.match_type}`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-border bg-card p-3">
                  <div className="text-[11px] text-muted-foreground">{l}</div>
                  <div className="font-bold text-foreground">{v}</div>
                </div>
              ))}
            </div>

            {joined ? (
              <div className="rounded-2xl border border-primary/40 bg-accent p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-accent-foreground"><KeyRound className="h-4 w-4" />ROOM ID & PASSWORD</div>
                {room?.room_id ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>ID: <b>{room.room_id}</b></span><Copy className="h-4 w-4 cursor-pointer text-primary" onClick={() => copy(room.room_id)} /></div>
                    <div className="flex justify-between"><span>Pass: <b>{room.room_pass}</b></span><Copy className="h-4 w-4 cursor-pointer text-primary" onClick={() => copy(room.room_pass)} /></div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Room details will appear here 10–15 minutes before the match.</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">Your slot(s): {myJoin.map((j) => `#${j.slot} ${j.game_name}`).join(", ")}</p>
              </div>
            ) : t.status === "upcoming" && t.filled_slots < t.total_slots ? (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold">Select Slots</span>
                  {max > 1 && (
                    <div className="flex items-center gap-3">
                      <button aria-label="Remove player" className="rounded-full bg-muted p-1" onClick={() => names.length > 1 && setNames(names.slice(0, -1))}><Minus className="h-4 w-4" /></button>
                      <span className="font-bold">{names.length}</span>
                      <button aria-label="Add player" className="rounded-full bg-primary p-1 text-primary-foreground" onClick={() => names.length < max && setNames([...names, ""])}><Plus className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
                {names.map((n, i) => (
                  <input
                    key={i}
                    value={n}
                    onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={`Player ${i + 1} in-game name`}
                    className="mb-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                ))}
                <Button variant="game" className="mt-2" onClick={join} disabled={busy}>
                  {busy ? "Joining..." : `Confirm Join (${inr(t.entry_fee * names.length)})`}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl bg-muted p-4 text-center text-sm font-semibold text-muted-foreground">
                {t.status === "upcoming" ? "Match Full" : t.status === "ongoing" ? "Match is live now" : "Match completed"}
              </div>
            )}
          </>
        )}

        {tab === "players" && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex justify-between bg-muted px-4 py-2 text-xs font-bold text-muted-foreground">
              <span>{t.filled_slots}/{t.total_slots} Joined</span><span>Kills</span>
            </div>
            {players.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No players yet. Be the first!</p>}
            {players.map((p) => (
              <div key={p.slot} className="flex justify-between border-t border-border px-4 py-2.5 text-sm">
                <span><span className="mr-2 text-muted-foreground">#{p.slot}</span>{p.game_name}</span>
                <span className="font-semibold">{p.kills}{p.prize > 0 && <span className="ml-2 text-success">+{inr(p.prize)}</span>}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "rules" && (
          <div className="whitespace-pre-line rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
            {t.rules || settings?.rules}
          </div>
        )}
      </div>
    </AppShell>
  );
}
