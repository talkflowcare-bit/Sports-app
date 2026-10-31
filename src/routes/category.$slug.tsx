import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { categoriesQuery, myJoinsQuery, tournamentsQuery } from "@/lib/game";

export const Route = createFileRoute("/category/$slug")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Matches – DARK ESPORTS" },
      { name: "description", content: "Browse upcoming tournaments in this game on DARK ESPORTS." },
      { property: "og:title", content: "Matches – DARK ESPORTS" },
      { property: "og:description", content: "Browse upcoming tournaments on DARK ESPORTS." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const categories = useQuery(categoriesQuery);
  const cats = categories.data ?? [];
  const cat = cats.find((c) => c.slug === slug);
  const matches = useQuery({
    ...tournamentsQuery(cat?.id),
    enabled: !!cat,
    initialData: () => cat ? qc.getQueryData(tournamentsQuery().queryKey)?.filter((t) => t.category_id === cat.id) : undefined,
    initialDataUpdatedAt: () => qc.getQueryState(tournamentsQuery().queryKey)?.dataUpdatedAt,
  });
  const tours = matches.data ?? [];
  const pending = categories.isPending || (!!cat && matches.isPending);
  const failed = categories.isError || matches.isError;
  const { data: joins = [] } = useQuery({ ...myJoinsQuery(user?.id ?? ""), enabled: !!user });
  const joined = new Set(joins.map((j) => j.tournament_id));
  const list = tours.filter((t) => t.status !== "completed");

  return (
    <AppShell>
      <div className="px-4 pt-4">
        <Link to="/" className="mb-4 flex items-center gap-2 text-lg font-bold">
          <ArrowLeft className="h-5 w-5 text-primary" /> {cat?.name ?? "Category"}
        </Link>
        {failed ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <p>Matches could not load.</p>
            <Button variant="outline" className="mt-3" onClick={() => { void categories.refetch(); if (cat) void matches.refetch(); }}>Try again</Button>
          </div>
        ) : pending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading Matches...</p>
        ) : list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No matches right now. Check back soon!</p>
        ) : (
          <div className="space-y-4">
            {list.map((t) => <MatchCard key={t.id} t={t} slug={slug} joined={joined.has(t.id)} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
