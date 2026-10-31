/**
 * Role-Based Access Control (RBAC) System for DARK ESPORTS.
 * Supports distinct user privilege tiers: 'owner' (Root Superadmin), 'staff' (Tournament Moderator), and 'player' (End User).
 */

export type AppRole = "owner" | "staff" | "player";

export interface RolePermissions {
  canCreateTournament: boolean;
  canEditTournament: boolean;
  canDeleteTournament: boolean;
  canManageRoomCredentials: boolean;
  canEnterMatchResults: boolean;
  canApproveDeposits: boolean;
  canApproveWithdrawals: boolean;
  canManageUsers: boolean;
  canAssignRoles: boolean;
  canUpdateAppSettings: boolean;
  canViewAuditLogs: boolean;
  canExportAuditLogs: boolean;
  canManageApk: boolean;
}

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  owner: {
    canCreateTournament: true,
    canEditTournament: true,
    canDeleteTournament: true,
    canManageRoomCredentials: true,
    canEnterMatchResults: true,
    canApproveDeposits: true,
    canApproveWithdrawals: true,
    canManageUsers: true,
    canAssignRoles: true,
    canUpdateAppSettings: true,
    canViewAuditLogs: true,
    canExportAuditLogs: true,
    canManageApk: true,
  },
  staff: {
    canCreateTournament: true,
    canEditTournament: true,
    canDeleteTournament: false,
    canManageRoomCredentials: true,
    canEnterMatchResults: true,
    canApproveDeposits: true,
    canApproveWithdrawals: false, // Only owner can approve money withdrawals
    canManageUsers: false,
    canAssignRoles: false,
    canUpdateAppSettings: false,
    canViewAuditLogs: true,
    canExportAuditLogs: false,
    canManageApk: false,
  },
  player: {
    canCreateTournament: false,
    canEditTournament: false,
    canDeleteTournament: false,
    canManageRoomCredentials: false,
    canEnterMatchResults: false,
    canApproveDeposits: false,
    canApproveWithdrawals: false,
    canManageUsers: false,
    canAssignRoles: false,
    canUpdateAppSettings: false,
    canViewAuditLogs: false,
    canExportAuditLogs: false,
    canManageApk: false,
  },
};

export function hasPermission(role: AppRole | undefined | null, permission: keyof RolePermissions): boolean {
  if (!role) return false;
  return !!ROLE_PERMISSIONS[role]?.[permission];
}

export function isStaffOrOwner(role: AppRole | undefined | null): boolean {
  return role === "owner" || role === "staff";
}

export function isOwner(role: AppRole | undefined | null): boolean {
  return role === "owner";
}
