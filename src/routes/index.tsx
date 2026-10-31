/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Megaphone, Smartphone, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { useAuth } from "@/hooks/useAuth";
import { bannerImage, catImg, categoriesQuery, myJoinsQuery, settingsQuery, tournamentsQuery, type Tournament } from "@/lib/game";
import { ApkModal } from "@/components/ApkModal";
import { getAppBanners, getCategoryCovers, type CustomBanner } from "@/lib/banners-store";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "DARK ESPORTS – Play Tournaments, Win Cash" },
      { name: "description", content: "Join Free Fire & BGMI tournaments daily on DARK ESPORTS and win real cash prizes." },
      { property: "og:title", content: "DARK ESPORTS – Play Tournaments, Win Cash" },
      { property: "og:description", content: "Join Free Fire & BGMI tournaments daily and win real cash prizes." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const [banners, setBanners] = useState<CustomBanner[]>(() => getAppBanners().filter((b) => b.active));
  const [catCovers, setCatCovers] = useState<Record<string, string>>(() => getCategoryCovers());

  const { data: cats = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: defaultTours = [] } = useQuery(tournamentsQuery());
  const { data: joins = [] } = useQuery({ ...myJoinsQuery(user?.id ?? ""), enabled: !!user });

  const [tours, setTours] = useState<Tournament[]>(defaultTours);
  const [tab, setTab] = useState<"upcoming" | "ongoing" | "completed">("upcoming");
  const [bi, setBi] = useState(0);
  const [showApkModal, setShowApkModal] = useState(false);
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
    setShowApkModal(true);
  };

  // Sync custom banners and category imagery
  useEffect(() => {
    const syncBanners = () => {
      setBanners(getAppBanners().filter((b) => b.active));
    };
    const syncCats = () => {
      setCatCovers(getCategoryCovers());
    };
    const syncTours = () => {
      try {
        const raw = localStorage.getItem("dark_esports_tournaments_v1");
        if (raw) setTours(JSON.parse(raw));
      } catch {}
    };

    syncBanners();
    syncCats();
    syncTours();

    window.addEventListener("dark_esports_banners_updated", syncBanners);
    window.addEventListener("dark_esports_categories_updated", syncCats);
    return () => {
      window.removeEventListener("dark_esports_banners_updated", syncBanners);
      window.removeEventListener("dark_esports_categories_updated", syncCats);
    };
  }, []);

  // Sync when defaultTours loads
  useEffect(() => {
    if (defaultTours.length > 0) {
      try {
        const raw = localStorage.getItem("dark_esports_tournaments_v1");
        if (raw) setTours(JSON.parse(raw));
        else setTours(defaultTours);
      } catch {
        setTours(defaultTours);
      }
    }
  }, [defaultTours]);

  useEffect(() => {
    if (banners.length < 2) return;
    const i = setInterval(() => setBi((x) => (x + 1) % banners.length), 3800);
    return () => clearInterval(i);
  }, [banners.length]);

  const joinedIds = new Set(joins.map((j) => j.tournament_id));
  const mine = tours.filter((t) => joinedIds.has(t.id) && t.status === tab);
  const slugOf = (cid: string) => cats.find((c) => c.id === cid)?.slug ?? "freefire";
  const countFor = (cid: string) => tours.filter((t) => t.category_id === cid && t.status === "upcoming").length;

  return (
    <AppShell>
      <div className="space-y-5 px-4 pt-4">
        {settings?.notice && (
          <div className="flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{settings.notice}</span>
          </div>
        )}

        {/* Dynamic Carousel Hero Banner - Updates live when uploaded from Admin Studio */}
        {banners.length > 0 && (
          <div className="relative h-44 overflow-hidden rounded-3xl shadow-card border border-border/50">
            <img
              src={banners[bi]?.image_url || bannerImage}
              alt={banners[bi]?.title}
              fetchPriority="high"
              decoding="async"
              width={1280}
              height={640}
              className="h-full w-full object-cover transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="text-lg font-black tracking-wide drop-shadow-md">
                {banners[bi]?.title}
              </div>
              <div className="text-xs text-slate-200 opacity-90 line-clamp-1 drop-shadow-sm">
                {banners[bi]?.subtitle}
              </div>
            </div>
            <div className="absolute bottom-3 right-4 flex gap-1">
              {banners.map((b, i) => (
                <span
                  key={b.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === bi ? "w-5 bg-primary" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Direct Browser Home Screen App Install Banner */}
        <div
          onClick={handleDirectInstall}
          className="flex items-center justify-between rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-3.5 shadow-sm cursor-pointer hover:border-primary/50 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl overflow-hidden border border-primary/40 shadow-glow shrink-0 bg-slate-950 p-0.5">
              <img src="/icon-192.png" alt="Icon" className="h-full w-full object-cover rounded-xl" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                Install DARK ESPORTS App <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                1-Tap me phone home screen par official icon add karein
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDirectInstall();
            }}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-glow active:scale-95 transition-transform"
          >
            <span>Install</span>
          </button>
        </div>

        {/* My Matches Section */}
        <section>
          <h2 className="mb-3 text-base font-bold">My Matches</h2>
          <div className="mb-3 flex gap-2 rounded-xl bg-muted p-1">
            {(["upcoming", "ongoing", "completed"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition ${tab === k ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
              >
                {k === "completed" ? "Results" : k}
              </button>
            ))}
          </div>
          {mine.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              No {tab === "completed" ? "results" : `${tab} matches`} yet. Join a match below!
            </div>
          ) : (
            <div className="space-y-3">
              {mine.map((t) => <MatchCard key={t.id} t={t} slug={slugOf(t.category_id)} joined />)}
            </div>
          )}
        </section>

        {/* Esports Categories Section */}
        <section>
          <h2 className="mb-3 text-base font-bold">Esports Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {cats.map((c) => {
              const customCover = catCovers[c.slug];
              const displayImg = customCover || catImg(c.slug, c.image_url);
              return (
                <Link
                  key={c.id}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="group relative aspect-square overflow-hidden rounded-2xl shadow-card"
                >
                  <img
                    src={displayImg}
                    alt={c.name}
                    loading="lazy"
                    width={816}
                    height={816}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-dark" />
                  <div className="absolute bottom-3 left-3 right-3 text-background">
                    <div className="text-sm font-bold leading-tight">{c.name}</div>
                    <div className="text-[11px] opacity-90">{countFor(c.id)} matches open</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <ApkModal isOpen={showApkModal} onClose={() => setShowApkModal(false)} />
    </AppShell>
  );
}
