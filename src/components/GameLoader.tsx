import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import banner from "@/assets/banner.webp";
import { APP_NAME } from "@/lib/game";

const TIPS = [
  "Room ID & password match se 10 min pehle milega",
  "Headshot se zyada kills = zyada paisa 🔥",
  "Apna sahi IN-GAME NAME daalo, warna prize nahi milega",
  "Teaming / hacks = permanent ban",
];

export function GameLoader({ label = "Loading" }: { label?: string }) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background">
      <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
      <div className="relative flex flex-col items-center px-8 text-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-scope rounded-full border-2 border-dashed border-primary/70" />
          <div className="absolute inset-3 rounded-full border border-primary/40" />
          <Crosshair className="h-10 w-10 text-primary" />
        </div>
        <div className="animate-loader-glow text-3xl font-extrabold uppercase tracking-[3px] text-primary">{APP_NAME}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[4px] text-muted-foreground">Free Fire Tournaments</div>
        <div className="mt-8 h-2 w-64 overflow-hidden rounded-full border border-border bg-card">
          <div className="h-full animate-loader-fill rounded-full bg-gradient-primary" />
        </div>
        <div className="mt-3 text-xs font-bold uppercase tracking-widest text-foreground">{label}...</div>
        <p key={tip} className="mt-5 max-w-xs animate-pop text-xs text-muted-foreground">💡 {TIPS[tip]}</p>
      </div>
    </div>
  );
}
