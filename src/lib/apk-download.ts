/**
 * Reliable Direct APK Downloader for DARK ESPORTS.
 * Handles Android browser quirks by serving explicit Android Package MIME
 * and fallback direct downloads.
 */

import { toast } from "sonner";
import { logAuditEvent } from "./audit";

export async function downloadApkDirectly(userId?: string, role = "player") {
  toast.info("Downloading DARK ESPORTS APK (353 KB)...");

  try {
    const res = await fetch("/DarkEsports.apk", { cache: "no-store" });
    if (!res.ok) throw new Error("Server returned " + res.status);

    const blob = await res.blob();
    // Explicitly enforce Android Package Archive MIME type
    const apkBlob = new Blob([blob], { type: "application/vnd.android.package-archive" });
    const blobUrl = URL.createObjectURL(apkBlob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "DarkEsports.apk";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    toast.success("Download started! Tap the downloaded file to install on Android.");
  } catch (e) {
    console.warn("Direct blob download fallback to direct anchor:", e);
    // Direct browser navigation download fallback
    const link = document.createElement("a");
    link.href = "/DarkEsports.apk";
    link.download = "DarkEsports.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  void logAuditEvent({
    actorId: userId || "guest",
    actorName: "Player",
    actorRole: role as "owner" | "staff" | "player" | "system",
    action: "APK_DOWNLOAD_TRIGGERED",
    entityType: "apk",
    details: "Direct APK download initiated by user",
    metadata: { filename: "DarkEsports.apk", sizeBytes: 361632 },
    severity: "info",
  });
}
