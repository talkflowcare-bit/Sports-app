import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import banner from "@/assets/banner.webp";
import ff from "@/assets/cat-freefire.webp";
import bgmi from "@/assets/cat-bgmi.webp";
import clash from "@/assets/cat-clash.webp";

export const APP_NAME = "DARK ESPORTS";

export const categoryImages: Record<string, string> = { freefire: ff, bgmi, clash, lonewolf: ff };
export const bannerImage = banner;
export const catImg = (slug: string, url?: string | null) => url || categoryImages[slug] || ff;

export { inr, errMsg, countdown, fmtDate } from "./game-logic";

export const profileQuery = (uid: string) =>
  queryOptions({
    queryKey: ["profile", uid],
    queryFn: async () => {
      if (!uid) return null;

      // Check active stored user
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("dark_esports_user");
          if (raw) {
            const acc = JSON.parse(raw);
            if (acc.id === uid || acc.phone) {
              return {
                id: uid,
                username: acc.username || acc.ff_ign || "DARKツKING",
                avatar: acc.avatar || "🔥",
                ff_ign: acc.ff_ign || acc.username || "DARKツKING",
                ff_uid: acc.ff_uid || "1234567890",
                phone: acc.phone || "9876543210",
                uid_code: `DE-${(acc.phone || "9921").slice(-4)}`,
                winning_balance: acc.winning_balance ?? 0,
                deposit_balance: acc.deposit_balance ?? 0,
                bonus_balance: acc.bonus_balance ?? 10,
                matches_played: acc.matches_played ?? 0,
                matches_won: acc.matches_won ?? 0,
                total_kills: acc.total_kills ?? 0,
                total_earnings: acc.total_earnings ?? 0,
                refer_code: acc.refer || "DARK100",
                created_at: acc.created_at || new Date().toISOString(),
              };
            }
          }
        } catch {}
      }

      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
        if (data) return data;
      } catch (e) {
        console.warn("Error fetching profile:", e);
      }

      return {
        id: uid,
        username: "DARKツKING",
        avatar: "🔥",
        ff_ign: "DARKツKING",
        ff_uid: "1234567890",
        phone: "9876543210",
        uid_code: "DE-9921",
        winning_balance: 0,
        deposit_balance: 0,
        bonus_balance: 10,
        matches_played: 0,
        matches_won: 0,
        total_kills: 0,
        total_earnings: 0,
        refer_code: "DARK100",
        created_at: new Date().toISOString(),
      };
    },
  });

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  staleTime: 60_000,
  queryFn: async () => {
    try {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      if (error || !data) {
        return {
          id: 1,
          app_name: "DARK ESPORTS",
          upi_id: "666zishan@fam",
          min_deposit: 10,
          min_withdraw: 50,
          max_withdraw: 5000,
          notice: "Welcome to DARK ESPORTS! Join daily tournaments and win real cash.",
          support_whatsapp: "",
          support_instagram: "",
          support_telegram: "",
          rules: "1. No hacks or emulators.\n2. Join room 10 minutes before start.\n3. Teaming is strictly prohibited.\n4. Screenshot of result required on dispute.",
        };
      }
      return data;
    } catch {
      return {
        id: 1,
        app_name: "DARK ESPORTS",
        upi_id: "666zishan@fam",
        min_deposit: 10,
        min_withdraw: 50,
        max_withdraw: 5000,
        notice: "Welcome to DARK ESPORTS! Join daily tournaments and win real cash.",
        support_whatsapp: "",
        support_instagram: "",
        support_telegram: "",
        rules: "1. No hacks or emulators.\n2. Join room 10 minutes before start.\n3. Teaming is strictly prohibited.\n4. Screenshot of result required on dispute.",
      };
    }
  },
});

export const DEFAULT_CATEGORIES = [
  { id: "b1b94342-32db-4bcb-9db0-02146cae90ae", name: "Free Fire", slug: "freefire", image_url: null, sort: 1, active: true },
  { id: "b8805b51-8bd9-4c86-84ff-08abcecbc4f5", name: "BGMI", slug: "bgmi", image_url: null, sort: 2, active: true },
  { id: "675891a4-7ab8-42a6-8245-067a2c55475b", name: "Free Fire Clash Squad", slug: "clash", image_url: null, sort: 3, active: true },
  { id: "d31b5bb6-9e28-4f23-b828-dca5ab41627a", name: "Lone Wolf", slug: "lonewolf", image_url: null, sort: 4, active: true },
];

export const DEFAULT_BANNERS = [
  { id: "banner-1", title: "MEGA WEEKEND CUP", subtitle: "Prize Pool ₹5,000 • Join Now", image_url: null, sort: 1 },
  { id: "banner-2", title: "DAILY SCRIMS", subtitle: "Play every evening at 8 PM", image_url: null, sort: 2 },
];

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 300_000,
  queryFn: async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("sort");
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn("Could not load categories from remote:", e);
    }
    return DEFAULT_CATEGORIES;
  },
});

export const bannersQuery = queryOptions({
  queryKey: ["banners"],
  staleTime: 300_000,
  queryFn: async () => {
    try {
      const { data, error } = await supabase.from("banners").select("*").order("sort");
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn("Could not load banners from remote:", e);
    }
    return DEFAULT_BANNERS;
  },
});

const TOUR_COLS =
  "id, category_id, title, map, match_type, entry_fee, prize_pool, per_kill, start_time, total_slots, filled_slots, status, rules";

export type Tournament = {
  id: string; category_id: string; title: string; map: string; match_type: string;
  entry_fee: number; prize_pool: number; per_kill: number; start_time: string;
  total_slots: number; filled_slots: number; status: string; rules: string | null;
};

export const DEFAULT_TOURNAMENTS: Tournament[] = [
  {
    id: "9973ad8d-1cd3-4d37-8d01-d63b0049fcb7",
    category_id: "b1b94342-32db-4bcb-9db0-02146cae90ae",
    title: "Solo Night Battle #101",
    map: "Bermuda",
    match_type: "Solo",
    entry_fee: 20,
    prize_pool: 600,
    per_kill: 5,
    start_time: new Date(Date.now() + 3 * 3600000).toISOString(),
    total_slots: 48,
    filled_slots: 12,
    status: "upcoming",
    rules: null,
  },
  {
    id: "87e1f547-be9f-4bdf-bd6b-c1dd4351dadd",
    category_id: "b1b94342-32db-4bcb-9db0-02146cae90ae",
    title: "Duo Rush #55",
    map: "Purgatory",
    match_type: "Duo",
    entry_fee: 30,
    prize_pool: 1000,
    per_kill: 8,
    start_time: new Date(Date.now() + 18 * 3600000).toISOString(),
    total_slots: 48,
    filled_slots: 24,
    status: "upcoming",
    rules: null,
  },
  {
    id: "22c3a185-7333-48e1-a778-44c26ca61c93",
    category_id: "b1b94342-32db-4bcb-9db0-02146cae90ae",
    title: "Squad Showdown #12",
    map: "Kalahari",
    match_type: "Squad",
    entry_fee: 50,
    prize_pool: 2000,
    per_kill: 10,
    start_time: new Date(Date.now() + 36 * 3600000).toISOString(),
    total_slots: 48,
    filled_slots: 8,
    status: "upcoming",
    rules: null,
  },
  {
    id: "83c7d757-5a9c-4974-9dec-91f9ed63203d",
    category_id: "b8805b51-8bd9-4c86-84ff-08abcecbc4f5",
    title: "Erangel Classic #21",
    map: "Erangel",
    match_type: "Squad",
    entry_fee: 40,
    prize_pool: 1500,
    per_kill: 8,
    start_time: new Date(Date.now() + 5 * 3600000).toISOString(),
    total_slots: 100,
    filled_slots: 36,
    status: "upcoming",
    rules: null,
  },
  {
    id: "710aee91-37ca-4e1c-9276-aa2dacb1dc51",
    category_id: "b8805b51-8bd9-4c86-84ff-08abcecbc4f5",
    title: "Miramar Solo #8",
    map: "Miramar",
    match_type: "Solo",
    entry_fee: 15,
    prize_pool: 500,
    per_kill: 4,
    start_time: new Date(Date.now() + 24 * 3600000).toISOString(),
    total_slots: 100,
    filled_slots: 15,
    status: "upcoming",
    rules: null,
  },
  {
    id: "aa62b760-b5f6-476e-b2f2-eadd3711d8a9",
    category_id: "675891a4-7ab8-42a6-8245-067a2c55475b",
    title: "CS 4v4 Arena #33",
    map: "Bermuda",
    match_type: "Squad",
    entry_fee: 25,
    prize_pool: 400,
    per_kill: 0,
    start_time: new Date(Date.now() + 8 * 3600000).toISOString(),
    total_slots: 8,
    filled_slots: 4,
    status: "upcoming",
    rules: null,
  },
  {
    id: "9166b207-73a9-4f5d-8863-3227c233a4a8",
    category_id: "d31b5bb6-9e28-4f23-b828-dca5ab41627a",
    title: "Lone Wolf 1v1 #9",
    map: "Iron Cage",
    match_type: "Solo",
    entry_fee: 10,
    prize_pool: 18,
    per_kill: 0,
    start_time: new Date(Date.now() + 2 * 3600000).toISOString(),
    total_slots: 2,
    filled_slots: 1,
    status: "upcoming",
    rules: null,
  },
];

export const tournamentsQuery = (categoryId?: string) =>
  queryOptions({
    queryKey: ["tournaments", categoryId ?? "all"],
    staleTime: 15_000,
    queryFn: async () => {
      try {
        let q = supabase.from("tournaments").select(TOUR_COLS).order("start_time");
        if (categoryId) q = q.eq("category_id", categoryId);
        const { data, error } = await q;
        if (!error && data && data.length > 0) return data as Tournament[];
      } catch (e) {
        console.warn("Could not load tournaments from remote:", e);
      }
      if (categoryId) return DEFAULT_TOURNAMENTS.filter((t) => t.category_id === categoryId);
      return DEFAULT_TOURNAMENTS;
    },
  });

export const tournamentQuery = (id: string) =>
  queryOptions({
    queryKey: ["tournament", id],
    staleTime: 15_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("tournaments").select(TOUR_COLS).eq("id", id).maybeSingle();
        if (!error && data) return data as Tournament;
      } catch (e) {
        console.warn("Could not load tournament by id:", e);
      }
      return DEFAULT_TOURNAMENTS.find((t) => t.id === id) || null;
    },
  });

export const myJoinsQuery = (uid: string) =>
  queryOptions({
    queryKey: ["myjoins", uid],
    staleTime: 15_000,
    queryFn: async () => {
      if (!uid || uid === "00000000-0000-0000-0000-000000000001") return [];
      try {
        const { data, error } = await supabase
          .from("match_joins")
          .select("tournament_id, slot, game_name, kills, rank, prize")
          .eq("user_id", uid);
        if (error) return [];
        return data;
      } catch {
        return [];
      }
    },
  });

export const txnsQuery = (uid: string) =>
  queryOptions({
    queryKey: ["txns", uid],
    queryFn: async () => {
      if (!uid || uid === "00000000-0000-0000-0000-000000000001") {
        return [
          {
            id: "txn-1",
            user_id: uid,
            kind: "bonus",
            amount: 10,
            status: "success",
            note: "Signup welcome bonus",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            utr: null,
            upi_id: null,
          },
          {
            id: "txn-2",
            user_id: uid,
            kind: "deposit",
            amount: 50,
            status: "success",
            note: "Added cash via UPI",
            created_at: new Date(Date.now() - 43200000).toISOString(),
            utr: "542198762341",
            upi_id: "user@okhdfcbank",
          },
          {
            id: "txn-3",
            user_id: uid,
            kind: "win",
            amount: 150,
            status: "success",
            note: "Won 1st place in Solo Battle",
            created_at: new Date(Date.now() - 12000000).toISOString(),
            utr: null,
            upi_id: null,
          },
        ];
      }
      try {
        const { data, error } = await supabase
          .from("transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50);
        if (error) return [];
        return data;
      } catch {
        return [];
      }
    },
  });


