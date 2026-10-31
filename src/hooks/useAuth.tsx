import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { type AppRole } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { logAuditEvent } from "@/lib/audit";
import { verifyPasscode } from "@/lib/passcodes";

export const STARTUP_WAIT_MS = 2500;
export const DEMO_UID = "00000000-0000-0000-0000-000000000001";
export const STAFF_UID = "00000000-0000-4000-8000-008888888888";
export const OWNER_UID = "00000000-0000-4000-8000-009999999999";

export const LOCAL_USER_KEY = "dark_esports_user";
export const REGISTERED_USERS_KEY = "dark_esports_registered_users";

export type StoredAccount = {
  id: string;
  phone: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  role: AppRole;
  username: string;
  ff_ign: string;
  ff_uid: string;
  refer?: string;
  winning_balance: number;
  deposit_balance: number;
  bonus_balance: number;
  matches_played: number;
  matches_won: number;
  total_kills: number;
  total_earnings: number;
  avatar: string;
  created_at: string;
  isBanned?: boolean;
  banReason?: string;
};

export const DEMO_ACCOUNT: StoredAccount = {
  id: DEMO_UID,
  phone: "9876543210",
  password: "password123",
  role: "player",
  username: "DARK KING",
  ff_ign: "DARK KING",
  ff_uid: "1234567890",
  refer: "DARK100",
  winning_balance: 150,
  deposit_balance: 50,
  bonus_balance: 20,
  matches_played: 14,
  matches_won: 5,
  total_kills: 32,
  total_earnings: 750,
  avatar: "🔥",
  created_at: new Date().toISOString(),
};

export const STAFF_ACCOUNT: StoredAccount = {
  id: STAFF_UID,
  phone: "8888888888",
  password: "staff@123",
  role: "staff",
  username: "STAFF_MODERATOR",
  ff_ign: "DARK_STAFF",
  ff_uid: "88888888",
  refer: "STAFF88",
  winning_balance: 500,
  deposit_balance: 200,
  bonus_balance: 50,
  matches_played: 45,
  matches_won: 18,
  total_kills: 110,
  total_earnings: 2800,
  avatar: "🛡️",
  created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
};

export const OWNER_ACCOUNT: StoredAccount = {
  id: OWNER_UID,
  phone: "9999999999",
  password: "owner@123",
  role: "owner",
  username: "DARK_FOUNDER",
  ff_ign: "DARK_OWNER",
  ff_uid: "99999999",
  refer: "OWNER99",
  winning_balance: 25000,
  deposit_balance: 10000,
  bonus_balance: 500,
  matches_played: 120,
  matches_won: 72,
  total_kills: 480,
  total_earnings: 45000,
  avatar: "👑",
  created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
};

export function getRegisteredUsers(): StoredAccount[] {
  if (typeof window === "undefined") return [DEMO_ACCOUNT, STAFF_ACCOUNT, OWNER_ACCOUNT];
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) {
      const defaults = [DEMO_ACCOUNT, STAFF_ACCOUNT, OWNER_ACCOUNT];
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const list: StoredAccount[] = JSON.parse(raw);
    // Ensure staff and owner accounts exist
    if (!list.some((u) => u.phone === STAFF_ACCOUNT.phone)) list.push(STAFF_ACCOUNT);
    if (!list.some((u) => u.phone === OWNER_ACCOUNT.phone)) list.push(OWNER_ACCOUNT);
    return list;
  } catch {
    return [DEMO_ACCOUNT, STAFF_ACCOUNT, OWNER_ACCOUNT];
  }
}

export function saveRegisteredUsers(users: StoredAccount[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch {}
}

export function getActiveUser(): StoredAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function toSupabaseUser(account: StoredAccount): User {
  return {
    id: account.id,
    app_metadata: { provider: "phone", role: account.role },
    user_metadata: {
      username: account.username,
      ff_ign: account.ff_ign,
      ff_uid: account.ff_uid,
      phone: account.phone,
      role: account.role,
    },
    aud: "authenticated",
    created_at: account.created_at,
    email: `${account.phone}@darkesports.app`,
    phone: account.phone,
    role: account.role,
    updated_at: new Date().toISOString(),
  };
}

type AuthCtx = {
  user: User | null;
  account: StoredAccount | null;
  role: AppRole;
  session: Session | null;
  loading: boolean;
  startupTimedOut: boolean;
  registerUser: (data: { phone: string; password: string; ign: string; ffuid: string; refer?: string; role?: AppRole }) => Promise<StoredAccount>;
  loginUser: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (role: AppRole) => void;
  verifyStaffOrOwnerPasscode: (code: string) => { success: boolean; role?: AppRole; targetRoute?: string; error?: string };
  updateAccount: (patch: Partial<StoredAccount>) => void;
  signOut: () => Promise<void>;
  setLocalUser: (u: Partial<StoredAccount> & { phone: string }) => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  account: null,
  role: "player",
  session: null,
  loading: true,
  startupTimedOut: false,
  registerUser: async () => DEMO_ACCOUNT,
  loginUser: async () => ({ success: false }),
  loginAsRole: () => {},
  verifyStaffOrOwnerPasscode: () => ({ success: false }),
  updateAccount: () => {},
  signOut: async () => {},
  setLocalUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<StoredAccount | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.has("autostart")) return DEMO_ACCOUNT;
      return getActiveUser();
    }
    return null;
  });

  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      let target = null;
      if (p.has("autostart")) target = DEMO_ACCOUNT;
      else target = getActiveUser();

      if (target) {
        return {
          access_token: "local-token-" + target.role,
          refresh_token: "local-refresh-" + target.role,
          expires_in: 86400,
          token_type: "bearer",
          user: toSupabaseUser(target),
        };
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [startupTimedOut, setStartupTimedOut] = useState(true);

  const applyActiveAccount = (acc: StoredAccount | null) => {
    setAccount(acc);
    if (acc) {
      const user = toSupabaseUser(acc);
      setSession({
        access_token: "local-token-" + acc.role,
        refresh_token: "local-refresh-" + acc.role,
        expires_in: 86400,
        token_type: "bearer",
        user,
      });
      try {
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(acc));
      } catch {}
    } else {
      setSession(null);
      try {
        localStorage.removeItem(LOCAL_USER_KEY);
      } catch {}
    }
    setLoading(false);
  };

  const registerUser = async (data: {
    phone: string;
    password: string;
    ign: string;
    ffuid: string;
    refer?: string;
    role?: AppRole;
  }): Promise<StoredAccount> => {
    const list = getRegisteredUsers();
    const cleanPhone = data.phone.trim().replace(/\D/g, "");

    const newId = "00000000-0000-4000-8000-" + cleanPhone.padStart(12, "0");

    // Industry standard salted PBKDF2 password hashing
    const { hash: passwordHash, salt: passwordSalt } = await hashPassword(data.password);

    // Determine initial role: owner for 9999999999, staff for 8888888888, or requested
    let assignedRole: AppRole = data.role || "player";
    if (cleanPhone === "9999999999") assignedRole = "owner";
    else if (cleanPhone === "8888888888") assignedRole = "staff";

    const newAcc: StoredAccount = {
      id: newId,
      phone: cleanPhone,
      password: data.password,
      passwordHash,
      passwordSalt,
      role: assignedRole,
      username: data.ign.trim(),
      ff_ign: data.ign.trim(),
      ff_uid: data.ffuid.trim(),
      refer: data.refer?.trim() || "",
      winning_balance: assignedRole === "owner" ? 25000 : assignedRole === "staff" ? 500 : 0,
      deposit_balance: assignedRole === "owner" ? 10000 : assignedRole === "staff" ? 200 : 0,
      bonus_balance: 10,
      matches_played: 0,
      matches_won: 0,
      total_kills: 0,
      total_earnings: 0,
      avatar: assignedRole === "owner" ? "👑" : assignedRole === "staff" ? "🛡️" : "🔥",
      created_at: new Date().toISOString(),
    };

    const updatedList = list.filter((u) => u.phone !== cleanPhone);
    updatedList.push(newAcc);
    saveRegisteredUsers(updatedList);
    applyActiveAccount(newAcc);

    // Record audit log
    void logAuditEvent({
      actorId: newAcc.id,
      actorName: newAcc.username,
      actorRole: newAcc.role,
      action: "USER_REGISTERED",
      entityType: "auth",
      details: `New account registered via mobile ${newAcc.phone.slice(-4)} as role [${newAcc.role}] with PBKDF2 salt encryption.`,
      severity: "info",
    });

    return newAcc;
  };

  const loginUser = async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const list = getRegisteredUsers();
    const found = list.find((u) => u.phone === cleanPhone);

    if (found) {
      if (found.isBanned) {
        return { success: false, error: `Account suspended. Reason: ${found.banReason || "Violation of Fair Play policy"}` };
      }

      // Verify hashed or plain password
      let isValid = false;
      if (found.passwordHash && found.passwordSalt) {
        isValid = await verifyPassword(password, found.passwordHash, found.passwordSalt);
      } else if (found.password) {
        isValid = found.password === password;
      }

      if (!isValid) {
        void logAuditEvent({
          actorId: found.id,
          actorName: found.username,
          actorRole: found.role,
          action: "AUTH_LOGIN_FAILED",
          entityType: "security",
          details: `Failed login attempt for mobile ${cleanPhone.slice(-4)} - Invalid credentials.`,
          severity: "warning",
        });
        return { success: false, error: "Galat password! Sahi password daalo." };
      }

      applyActiveAccount(found);

      void logAuditEvent({
        actorId: found.id,
        actorName: found.username,
        actorRole: found.role,
        action: "AUTH_LOGIN_SUCCESS",
        entityType: "auth",
        details: `User logged in successfully as [${found.role}].`,
        severity: "info",
      });

      return { success: true };
    }

    // Auto-create initial account for instant testing
    const { hash: passwordHash, salt: passwordSalt } = await hashPassword(password);
    const isOwnerPhone = cleanPhone === "9999999999";
    const isStaffPhone = cleanPhone === "8888888888";
    const role: AppRole = isOwnerPhone ? "owner" : isStaffPhone ? "staff" : "player";

    const autoAcc: StoredAccount = {
      id: "00000000-0000-4000-8000-" + cleanPhone.padStart(12, "0"),
      phone: cleanPhone,
      password,
      passwordHash,
      passwordSalt,
      role,
      username: isOwnerPhone ? "DARK_OWNER" : isStaffPhone ? "STAFF_MODERATOR" : `Player_${cleanPhone.slice(-4)}`,
      ff_ign: isOwnerPhone ? "DARK_OWNER" : isStaffPhone ? "DARK_STAFF" : `DARK_${cleanPhone.slice(-4)}`,
      ff_uid: cleanPhone,
      winning_balance: isOwnerPhone ? 25000 : isStaffPhone ? 500 : 0,
      deposit_balance: isOwnerPhone ? 10000 : isStaffPhone ? 200 : 0,
      bonus_balance: 10,
      matches_played: 0,
      matches_won: 0,
      total_kills: 0,
      total_earnings: 0,
      avatar: isOwnerPhone ? "👑" : isStaffPhone ? "🛡️" : "🔥",
      created_at: new Date().toISOString(),
    };

    list.push(autoAcc);
    saveRegisteredUsers(list);
    applyActiveAccount(autoAcc);

    void logAuditEvent({
      actorId: autoAcc.id,
      actorName: autoAcc.username,
      actorRole: autoAcc.role,
      action: "AUTH_LOGIN_INSTANT",
      entityType: "auth",
      details: `Instant account activated for mobile ${cleanPhone.slice(-4)} as role [${autoAcc.role}].`,
      severity: "info",
    });

    return { success: true };
  };

  const loginAsRole = (targetRole: AppRole) => {
    let targetAcc: StoredAccount;
    if (targetRole === "owner") targetAcc = OWNER_ACCOUNT;
    else if (targetRole === "staff") targetAcc = STAFF_ACCOUNT;
    else targetAcc = DEMO_ACCOUNT;

    applyActiveAccount(targetAcc);

    void logAuditEvent({
      actorId: targetAcc.id,
      actorName: targetAcc.username,
      actorRole: targetAcc.role,
      action: "ROLE_QUICK_SWITCH",
      entityType: "security",
      details: `Switched active session directly to role [${targetAcc.role}].`,
      severity: "info",
    });
  };

  const verifyStaffOrOwnerPasscode = (code: string): { success: boolean; role?: AppRole; targetRoute?: string; error?: string } => {
    const res = verifyPasscode(code);
    if (!res.success) {
      return { success: false, error: res.error || "Invalid security passcode." };
    }

    if (res.role === "owner") {
      if (account) {
        updateAccount({ role: "owner" });
      } else {
        applyActiveAccount(OWNER_ACCOUNT);
      }
      void logAuditEvent({
        actorId: account?.id || OWNER_UID,
        actorName: account?.username || "Owner",
        actorRole: "owner",
        action: "PRIVILEGE_ELEVATION_OWNER",
        entityType: "security",
        details: "Owner credentials verified successfully. Full administrative privileges granted.",
        severity: "critical",
      });
      return { success: true, role: "owner", targetRoute: "/admin" };
    }

    if (res.role === "staff") {
      if (account) {
        updateAccount({ role: "staff" });
      } else {
        applyActiveAccount(STAFF_ACCOUNT);
      }
      void logAuditEvent({
        actorId: account?.id || STAFF_UID,
        actorName: account?.username || "Staff",
        actorRole: "staff",
        action: "PRIVILEGE_ELEVATION_STAFF",
        entityType: "security",
        details: "Staff credentials verified. Moderator privileges granted.",
        severity: "warning",
      });
      return { success: true, role: "staff", targetRoute: "/staff" };
    }

    return { success: false, error: "Invalid passcode." };
  };

  const updateAccount = (patch: Partial<StoredAccount>) => {
    if (!account) return;
    const updated: StoredAccount = { ...account, ...patch };
    applyActiveAccount(updated);

    const list = getRegisteredUsers().map((u) => (u.phone === updated.phone ? updated : u));
    saveRegisteredUsers(list);
  };

  const setLocalUser = (u: Partial<StoredAccount> & { phone: string }) => {
    const cleanPhone = u.phone.trim().replace(/\D/g, "");
    const existing = getActiveUser();
    const acc: StoredAccount = {
      id: u.id || existing?.id || ("00000000-0000-4000-8000-" + cleanPhone.padStart(12, "0")),
      phone: cleanPhone,
      password: u.password || existing?.password || "123456",
      role: u.role || existing?.role || "player",
      username: u.username || u.ff_ign || existing?.username || `Player_${cleanPhone.slice(-4)}`,
      ff_ign: u.ff_ign || existing?.ff_ign || "DARK KING",
      ff_uid: u.ff_uid || existing?.ff_uid || "1234567890",
      refer: u.refer || existing?.refer || "",
      winning_balance: u.winning_balance ?? existing?.winning_balance ?? 150,
      deposit_balance: u.deposit_balance ?? existing?.deposit_balance ?? 50,
      bonus_balance: u.bonus_balance ?? existing?.bonus_balance ?? 20,
      matches_played: u.matches_played ?? existing?.matches_played ?? 14,
      matches_won: u.matches_won ?? existing?.matches_won ?? 5,
      total_kills: u.total_kills ?? existing?.total_kills ?? 32,
      total_earnings: u.total_earnings ?? existing?.total_earnings ?? 750,
      avatar: u.avatar || existing?.avatar || "🔥",
      created_at: u.created_at || existing?.created_at || new Date().toISOString(),
    };
    applyActiveAccount(acc);
  };

  const signOut = async () => {
    if (account) {
      void logAuditEvent({
        actorId: account.id,
        actorName: account.username,
        actorRole: account.role,
        action: "AUTH_LOGOUT",
        entityType: "auth",
        details: `User ${account.username} (${account.role}) logged out.`,
        severity: "info",
      });
    }
    applyActiveAccount(null);
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("autostart")) {
      applyActiveAccount(DEMO_ACCOUNT);
      return;
    }
    const current = getActiveUser();
    if (current) {
      applyActiveAccount(current);
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        account,
        role: account?.role ?? "player",
        session,
        loading,
        startupTimedOut,
        registerUser,
        loginUser,
        loginAsRole,
        verifyStaffOrOwnerPasscode,
        updateAccount,
        signOut,
        setLocalUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
