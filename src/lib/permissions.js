import { USER_ROLES } from "./constants";

/**
 * Checks if a given role is allowed to access the Settings module.
 * @param {string} role
 * @returns {boolean}
 */
export function canAccessSettings(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN;
}

/**
 * Checks if a given role is authorized to delete financial or master records.
 * @param {string} role
 * @returns {boolean}
 */
export function canDeleteRecord(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN;
}

/**
 * Evaluates whether an operator's role has permission to manage/create a target role.
 * @param {string} actorRole - Role of the active operator initiating the request
 * @param {string} targetRole - Role of the target operator being created/modified
 * @returns {boolean}
 */
export function canManageUserRole(actorRole, targetRole) {
  if (actorRole === USER_ROLES.SUPER_ADMIN) return true;
  if (actorRole === USER_ROLES.ADMIN) {
    // Admins can only manage/create other Admins or standard Users
    return targetRole !== USER_ROLES.SUPER_ADMIN;
  }
  return false;
}

/**
 * Self-protection rule: Prevent an operator from updating their own role.
 * @param {number|string} actorId
 * @param {number|string} targetId
 * @param {string} newRole
 * @param {string} currentRole
 * @returns {boolean}
 */
export function canEditSelfRole(actorId, targetId, newRole, currentRole) {
  if (String(actorId) === String(targetId)) {
    return newRole === currentRole;
  }
  return true;
}

/**
 * Self-protection rule: Prevent an operator from disabling their own account.
 * @param {number|string} actorId
 * @param {number|string} targetId
 * @returns {boolean}
 */
export function canDisableSelf(actorId, targetId) {
  return String(actorId) !== String(targetId);
}

/**
 * Self-protection rule: Prevent an operator from deleting their own account.
 * @param {number|string} actorId
 * @param {number|string} targetId
 * @returns {boolean}
 */
export function canDeleteSelf(actorId, targetId) {
  return String(actorId) !== String(targetId);
}

/**
 * Checks if a given role is allowed to view/export the Sales module.
 * @param {string} role
 * @returns {boolean}
 */
export function canViewSales(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN || role === USER_ROLES.USER;
}

/**
 * Checks if a given role is allowed to view/export the Supplier Settlements module.
 * @param {string} role
 * @returns {boolean}
 */
export function canViewSettlements(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN || role === USER_ROLES.USER;
}

/**
 * Checks if a given role is allowed to view/export the Ledger & Reconciliation module.
 * @param {string} role
 * @returns {boolean}
 */
export function canViewLedger(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN || role === USER_ROLES.USER;
}

