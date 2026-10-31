/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import bannerDefault from "@/assets/banner.webp";
import ffDefault from "@/assets/cat-freefire.webp";
import bgmiDefault from "@/assets/cat-bgmi.webp";
import clashDefault from "@/assets/cat-clash.webp";
import { logAuditEvent } from "./audit";

export interface CustomBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  action_url?: string;
  active: boolean;
  sort: number;
}

export interface CategoryCover {
  slug: string;
  name: string;
  image_url: string;
}

export const BANNERS_STORAGE_KEY = "dark_esports_custom_banners_v1";
export const CAT_COVERS_STORAGE_KEY = "dark_esports_category_covers_v1";

export const DEFAULT_APP_BANNERS: CustomBanner[] = [
  {
    id: "banner-1",
    title: "MEGA WEEKEND CUP",
    subtitle: "Prize Pool ₹5,000 • Free Fire & BGMI • Join Now",
    image_url: bannerDefault,
    active: true,
    sort: 1,
  },
  {
    id: "banner-2",
    title: "DAILY CS 4v4 SCRIMS",
    subtitle: "Clash Squad Matches Every Evening at 8:00 PM",
    image_url: clashDefault,
    active: true,
    sort: 2,
  },
  {
    id: "banner-3",
    title: "TOP KILLER BOUNTY",
    subtitle: "₹50 Extra Cash for Every 10 Kills Recorded",
    image_url: bgmiDefault,
    active: true,
    sort: 3,
  },
];

export const DEFAULT_CATEGORY_COVERS: Record<string, string> = {
  freefire: ffDefault,
  bgmi: bgmiDefault,
  clash: clashDefault,
  lonewolf: ffDefault,
};

export function getAppBanners(): CustomBanner[] {
  if (typeof window === "undefined") return DEFAULT_APP_BANNERS;
  try {
    const raw = localStorage.getItem(BANNERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(DEFAULT_APP_BANNERS));
      return DEFAULT_APP_BANNERS;
    }
    const list: CustomBanner[] = JSON.parse(raw);
    return list.length > 0 ? list : DEFAULT_APP_BANNERS;
  } catch {
    return DEFAULT_APP_BANNERS;
  }
}

export function saveAppBanners(banners: CustomBanner[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(banners));
    window.dispatchEvent(new CustomEvent("dark_esports_banners_updated"));
  } catch (e) {
    console.error("Failed to save custom banners:", e);
  }
}

export function getCategoryCovers(): Record<string, string> {
  if (typeof window === "undefined") return DEFAULT_CATEGORY_COVERS;
  try {
    const raw = localStorage.getItem(CAT_COVERS_STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORY_COVERS;
    return { ...DEFAULT_CATEGORY_COVERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CATEGORY_COVERS;
  }
}

export function saveCategoryCovers(covers: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAT_COVERS_STORAGE_KEY, JSON.stringify(covers));
    window.dispatchEvent(new CustomEvent("dark_esports_categories_updated"));
  } catch (e) {
    console.error("Failed to save category covers:", e);
  }
}

/**
 * Resizes and compresses an uploaded image file into a lightweight base64 Data URL.
 * Max width 1200px, JPEG quality 0.82 to avoid filling localStorage.
 */
export async function processImageFile(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload a valid image file (JPG, PNG, WebP)"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error("Image failed to load in memory"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
