import { useAuth } from './AuthContext'

// Capability-based permissions. Admins assign roles (users/{uid}.roles) and each
// role grants a set of capabilities. The super-admin (VITE_ADMIN_UID) and the
// `administrator` role always have every capability. Only administrators can
// assign/remove roles.
//
// IMPORTANT: this is UX gating only. Enforcement lives in Firestore rules —
// keep firestore.rules in sync with this map.

export type Capability =
  | 'manage_levels' // add / edit / delete / reorder LTCL levels + level metadata
  | 'manage_records' // add / edit / remove records on a level, incl. enjoyment
  | 'edit_rules' // edit the LTCL rules text
  | 'assign_roles' // grant / remove roles on users
  | 'manage_site' // site-wide admin (freeze, posts, users, bans)
  | 'manage_bounties' // confirm/reopen bounties on the Bounty Board
  | 'manage_motd' // add / remove message-of-the-day entries

// Roles that grant blanket access to everything.
export const SUPER_ROLES = ['administrator']

const ROLE_CAPS: Record<string, Capability[]> = {
  // administrator handled as a super-role (all capabilities) below.
  'list-admin': ['manage_levels', 'manage_records', 'edit_rules'],
  'list-moderator': ['manage_records'],
  'bounty-board-manager': ['manage_bounties'],
  'motd-manager': ['manage_motd'],
}

const ALL_CAPS: Capability[] = [
  'manage_levels',
  'manage_records',
  'edit_rules',
  'assign_roles',
  'manage_site',
  'manage_bounties',
  'manage_motd',
]

// Resolve a set of role ids to the capabilities they grant.
export function capabilitiesFor(roles: string[] | undefined, isSuperAdmin: boolean): Set<Capability> {
  if (isSuperAdmin || (roles ?? []).some((r) => SUPER_ROLES.includes(r))) {
    return new Set(ALL_CAPS)
  }
  const caps = new Set<Capability>()
  for (const r of roles ?? []) for (const c of ROLE_CAPS[r] ?? []) caps.add(c)
  return caps
}

function useIsSuperAdmin(): boolean {
  const { user } = useAuth()
  return !!user && user.uid === import.meta.env.VITE_ADMIN_UID
}

// All capabilities the signed-in user currently has.
export function useCapabilities(): Set<Capability> {
  const { profile } = useAuth()
  const isSuper = useIsSuperAdmin()
  return capabilitiesFor(profile?.roles, isSuper)
}

// True if the signed-in user has the given capability.
export function useCan(cap: Capability): boolean {
  return useCapabilities().has(cap)
}
