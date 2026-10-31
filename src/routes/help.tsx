import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, MessageCircle, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { bannerImage, settingsQuery } from "@/lib/game";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Help & Support – DARK ESPORTS" },
      { name: "description", content: "Contact DARK ESPORTS support and follow our official channels." },
      { property: "og:title", content: "Help & Support – DARK ESPORTS" },
      { property: "og:description", content: "Contact support and follow our official channels." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const { data: s } = useQuery(settingsQuery);
  const links = [
    { label: "WhatsApp", url: s?.support_whatsapp, icon: MessageCircle },
    { label: "Instagram", url: s?.support_instagram, icon: Instagram },
    { label: "Telegram", url: s?.support_telegram, icon: Send },
  ].filter((l) => l.url);

  return (
    <AppShell>
      <div className="space-y-5 p-4">
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <h2 className="text-lg font-bold">Connect With Us</h2>
          <p className="mb-4 text-xs text-muted-foreground">Follow our official social media handles for support and updates.</p>
          {links.length === 0 ? (
            <p className="text-xs text-muted-foreground">Support links coming soon.</p>
          ) : (
            <div className="space-y-2">
              {links.map(({ label, url, icon: Icon }) => (
                <a key={label} href={url!} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-glow">
                  <Icon className="h-4 w-4" />{label}
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-base font-bold">Special Promotions</h2>
          <div className="relative h-36 overflow-hidden rounded-2xl">
            <img src={bannerImage} alt="Promotion" loading="lazy" width={1280} height={640} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-dark" />
            <div className="absolute bottom-3 left-4 font-bold text-background">Get ₹10 bonus on signup!</div>
          </div>
        </div>
        <div className="whitespace-pre-line rounded-2xl border border-border bg-card p-4 text-sm">
          <div className="mb-2 font-bold">Fair Play Rules</div>
          {s?.rules}
        </div>
      </div>
    </AppShell>
  );
}
