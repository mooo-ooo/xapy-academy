import type { AppRole } from "@/lib/auth";

export const ROLE_RANK: Record<AppRole, number> = {
  ADMIN: 3,
  MODERATOR: 2,
  CTV: 1,
  USER: 0,
};

export const ADMIN_ROLES = ["ADMIN", "MODERATOR"] as const;

export function isAdminLevel(role: AppRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.MODERATOR;
}

export function canManageUser(actor: AppRole, target: AppRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

export function assignableRolesFor(actor: AppRole): AppRole[] {
  return (["MODERATOR", "CTV", "USER"] as AppRole[]).filter(
    (r) => ROLE_RANK[r] < ROLE_RANK[actor],
  );
}
