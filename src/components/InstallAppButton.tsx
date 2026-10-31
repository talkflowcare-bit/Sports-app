import { useState } from "react";
import { Smartphone, Check } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { InstallAppModal } from "@/components/InstallAppModal";

export function InstallAppButton() {
  const { canInstall, installed, install } = usePwaInstall();
  const [showModal, setShowModal] = useState(false);

  const handleAction = async () => {
    if (canInstall) {
      const outcome = await install();
      if (outcome) return;
    }
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleAction}
        aria-label="Install App to Home Screen"
        className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm hover:bg-primary/20 transition-transform active:scale-95"
      >
        {installed ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" /> Installed
          </>
        ) : (
          <>
            <Smartphone className="h-3 w-3" /> Install App
          </>
        )}
      </button>
      <InstallAppModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
