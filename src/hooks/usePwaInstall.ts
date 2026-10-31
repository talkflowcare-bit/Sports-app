/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== "undefined" && (window as any).__deferredPrompt) {
      return (window as any).__deferredPrompt;
    }
    return null;
  });
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).__deferredPrompt) {
      setDeferred((window as any).__deferredPrompt);
    }

    const onPromptReady = () => {
      if ((window as any).__deferredPrompt) {
        setDeferred((window as any).__deferredPrompt);
      }
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPrompt = e;
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      (window as any).__deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("pwa_prompt_ready", onPromptReady);
    window.addEventListener("pwa_installed", onInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pwa_prompt_ready", onPromptReady);
      window.removeEventListener("pwa_installed", onInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferred || (typeof window !== "undefined" ? (window as any).__deferredPrompt : null);
    if (!promptEvent) return false;
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        setDeferred(null);
        if (typeof window !== "undefined") (window as any).__deferredPrompt = null;
      }
      return outcome === "accepted";
    } catch {
      return false;
    }
  };

  return { canInstall: !!deferred || (typeof window !== "undefined" && !!(window as any).__deferredPrompt), installed, install };
}
