/**
 * Who may manage whom in an organization (owner decision 2026-10-02).
 *
 * Administrators manage members and viewers. Changing the role of,
 * suspending, reactivating or removing another administrator is the owner's
 * job; the API answers 403 to anyone else. The UI mirrors that by disabling
 * those actions on administrator rows, with PEER_ADMIN_LOCK_REASON as the
 * explanation. The backend stays the authority.
 */

export const PEER_ADMIN_LOCK_REASON =
  'Only the organization owner can change, suspend or remove an administrator.'

interface MemberLike {
  /** Membership role: owner | admin | member | viewer. */
  role: string
  user_id: string
}

interface Caller {
  isOwner: boolean
  userId?: string
}

/** True when `caller` may not manage `target` because `target` is a peer administrator. */
export function isPeerAdminLocked(target: MemberLike, caller: Caller): boolean {
  if (caller.isOwner) return false
  if (target.role !== 'admin') return false
  return !caller.userId || target.user_id !== caller.userId
}
