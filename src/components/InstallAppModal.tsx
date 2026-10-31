/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Smartphone, Zap, Share, MoreVertical, PlusSquare, Monitor, X, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export function InstallAppModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { canInstall, installed, install } = usePwaInstall();
  const [guideTab, setGuideTab] = useState<"android" | "ios" | "desktop">(() => {
    if (typeof navigator !== "undefined" && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())) {
      return "ios";
    }
    return "android";
  });

  if (!isOpen) return null;

  const handle1TapInstall = async () => {
    if (canInstall) {
      const outcome = await install();
      if (outcome) {
        toast.success("DARK ESPORTS app icon installed to your home screen! 🔥");
        onClose();
        return;
      }
    } else if (installed) {
      toast.info("DARK ESPORTS is already installed as a standalone app!");
      onClose();
    } else {
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      if (isIOS) {
        setGuideTab("ios");
        toast.info("Follow the 2 simple steps below to add to Home Screen");
      } else {
        setGuideTab("android");
        toast.info("Follow the 2 simple steps below to add to Home Screen");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 animate-fade" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl border border-primary/30 bg-card p-5 text-card-foreground shadow-2xl animate-pop no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="text-base font-extrabold text-foreground">Install Mobile App</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Official App Icon & Branding Card */}
        <div className="rounded-2xl border border-border bg-gradient-to-b from-primary/10 via-muted/30 to-background p-4 text-center space-y-3">
          <div className="relative mx-auto h-20 w-20 rounded-2xl overflow-hidden shadow-glow border-2 border-primary/40 bg-slate-950 p-1">
            <img
              src="/icon-192.png"
              alt="DARK ESPORTS App Icon"
              className="h-full w-full object-cover rounded-xl"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
              ✓
            </span>
          </div>

          <div>
            <h4 className="text-base font-black tracking-wide text-foreground uppercase">DARK ESPORTS</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct Browser Installation • Official Icon Included
            </p>
          </div>

          {/* 1-Tap Direct Install Button */}
          <Button
            variant="game"
            onClick={handle1TapInstall}
            className="w-full h-11 text-xs font-bold shadow-glow flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4 animate-pulse" />
            {installed ? "App Already Installed" : "Add App Icon to Home Screen (1-Tap)"}
          </Button>
        </div>

        {/* 2-Step Browser Shortcut Helper Guide */}
        <div className="mt-4 rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Direct Install Steps:
            </span>
            <div className="flex gap-1">
              {(["android", "ios", "desktop"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setGuideTab(tab)}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase transition-all ${
                    guideTab === tab
                      ? "bg-primary text-primary-foreground font-black"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {guideTab === "android" && (
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">1</span>
                <div className="text-[11px] text-muted-foreground">
                  Browser ke top-right corner par <MoreVertical className="inline h-3.5 w-3.5 text-foreground" /> (3 Dots menu) par tap karein.
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">2</span>
                <div className="text-[11px] text-muted-foreground">
                  <b>"Install app"</b> ya <b>"Add to Home screen"</b> select karein. Dark Esports app icon phone ke home screen par add ho jayega!
                </div>
              </div>
            </div>
          )}

          {guideTab === "ios" && (
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">1</span>
                <div className="text-[11px] text-muted-foreground">
                  Safari browser ke bottom bar me <Share className="inline h-3.5 w-3.5 text-foreground" /> (Share icon) par tap karein.
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">2</span>
                <div className="text-[11px] text-muted-foreground">
                  Neeche scroll karke <PlusSquare className="inline h-3.5 w-3.5 text-foreground" /> <b>"Add to Home Screen"</b> par tap karein.
                </div>
              </div>
            </div>
          )}

          {guideTab === "desktop" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/60 text-xs">
              <Monitor className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-[11px] text-muted-foreground">
                Chrome ya Edge address bar me URL ke right side me "Install App" icon par click karein.
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-center text-[10px] text-muted-foreground">
          No external file download required • Instant launch
        </div>
      </div>
    </div>
  );
}

// Re-export as ApkModal for backward compatibility
export const ApkModal = InstallAppModal;
